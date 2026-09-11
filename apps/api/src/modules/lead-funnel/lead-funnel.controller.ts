/**
 * lead-funnel.controller.ts
 *
 * Endpoints publics + admin du module LEAD FUNNEL.
 *
 * Tome 0 (capture / instrumentation amont). Le webhook WhatsApp et la
 * route POST `/capture` sont publics ; les autres routes sont gardées
 * par JwtAuthGuard.
 *
 * À ajouter à l'allow-list MutationGate : `/api/lead-funnel`
 * (cf. INTEGRATION.md).
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-at/security/jwt-auth.guard";
import { SlidingWindowLimiter } from "./capture-rate-limit";
import { LeadFunnelService } from "./lead-funnel.service";
import type { LeadCaptureInput, LeadStage } from "./lead-funnel.types";

/** Taille max de meta.wizard sérialisé (le front borne lui-même à 8 Ko). */
const WIZARD_MAX_BYTES = 16 * 1024;

@Tome("tome0")
@Controller("api/lead-funnel")
export class LeadFunnelController {
  // Anti-abus de la route publique : par défaut 5 captures / 10 min par IP,
  // 3 / heure par numéro (LEAD_CAPTURE_MAX_PER_IP / _PER_PHONE pour ajuster).
  // En mémoire, gratuit, sans service tiers.
  private readonly perIp = new SlidingWindowLimiter(Number(process.env.LEAD_CAPTURE_MAX_PER_IP) || 5, 10 * 60_000);
  private readonly perPhone = new SlidingWindowLimiter(Number(process.env.LEAD_CAPTURE_MAX_PER_PHONE) || 3, 60 * 60_000);

  constructor(private readonly svc: LeadFunnelService) {}

  // ── Public : capture ──────────────────────────────────────────────

  @Post("capture")
  @HttpCode(201)
  async capture(@Body() body: LeadCaptureInput & { website?: unknown }, @Req() req: any) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("payload_invalid");
    }

    const ip = ipClient(req);
    if (!this.perIp.take(`ip:${ip}`)) {
      throw new HttpException("too_many_requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    // Pot de miel : champ caché que seuls les robots remplissent. Réponse
    // identique à un succès pour ne pas leur signaler le filtre.
    const { website, ...input } = body;
    if (typeof website === "string" && website.trim()) {
      return {
        ok: true,
        leadId: `lead_${Date.now().toString(36)}`,
        scoreInitial: 0,
        stage: "NEW",
        message: "Demande reçue. Notre équipe vous recontacte sous 24h.",
      };
    }

    const phoneKey = String(input.telephone || "").replace(/[\s\-]/g, "");
    if (phoneKey && !this.perPhone.take(`tel:${phoneKey}`)) {
      throw new HttpException("too_many_requests", HttpStatus.TOO_MANY_REQUESTS);
    }

    // Meta : liste blanche — description libre du projet, qualification du
    // wizard de porte, headers utiles (IP / UA / referer). Le reste est ignoré.
    const clientMeta =
      input.meta && typeof input.meta === "object" ? (input.meta as Record<string, unknown>) : {};
    const wizard = clientMeta.wizard;
    if (wizard !== undefined) {
      if (wizard === null || typeof wizard !== "object" || Array.isArray(wizard)) {
        throw new BadRequestException("meta_invalid");
      }
      // Pas de troncature silencieuse côté serveur : le front borne à 8 Ko.
      if (Buffer.byteLength(JSON.stringify(wizard), "utf8") > WIZARD_MAX_BYTES) {
        throw new BadRequestException("meta_too_large");
      }
    }
    const meta = {
      projetLibre:
        typeof clientMeta.projetLibre === "string"
          ? clientMeta.projetLibre.slice(0, 2000)
          : undefined,
      wizard: wizard as Record<string, unknown> | undefined,
      idempotencyKey:
        typeof input.idempotencyKey === "string" ? input.idempotencyKey.slice(0, 80) : undefined,
      ip: (req?.headers?.["x-forwarded-for"] || req?.ip || "").toString(),
      ua: (req?.headers?.["user-agent"] || "").toString(),
      referer: (req?.headers?.["referer"] || "").toString(),
    };

    try {
      const result = await this.svc.capture({ ...input, meta });
      return { ok: true, ...result };
    } catch (e: any) {
      if (e?.message === "phone_invalid") {
        throw new BadRequestException("phone_invalid");
      }
      if (e?.message === "nom_invalid") {
        throw new BadRequestException("nom_invalid");
      }
      if (e?.message === "storage_unavailable") {
        throw new ServiceUnavailableException("storage_unavailable");
      }
      throw e;
    }
  }

  // ── Admin (JWT) ───────────────────────────────────────────────────

  @Get("lead/:id")
  @UseGuards(JwtAuthGuard)
  async getLead(@Param("id") id: string) {
    await this.svc.syncFromDb();
    const lead = this.svc.get(id);
    if (!lead) throw new NotFoundException("lead_not_found");
    return { ok: true, lead };
  }

  @Get("list")
  @UseGuards(JwtAuthGuard)
  async list(
    @Query("stage") stage?: LeadStage,
    @Query("minScore") minScore?: string,
    @Query("limit") limit?: string,
  ) {
    await this.svc.syncFromDb();
    const leads = this.svc.list({
      stage,
      minScore: minScore ? Number(minScore) : undefined,
      limit: limit ? Number(limit) : 100,
    });
    return { ok: true, leads, total: leads.length };
  }

  @Post("score/:id")
  @UseGuards(JwtAuthGuard)
  async rescore(@Param("id") id: string) {
    const lead = this.svc.rescore(id);
    if (!lead) throw new NotFoundException("lead_not_found");
    return { ok: true, score: lead.score, breakdown: lead.scoreBreakdown };
  }

  @Post("stage/:id")
  @UseGuards(JwtAuthGuard)
  async setStage(
    @Param("id") id: string,
    @Body() body: { stage: LeadStage },
  ) {
    if (!body?.stage) throw new BadRequestException("stage_required");
    const lead = this.svc.setStage(id, body.stage);
    if (!lead) throw new NotFoundException("lead_not_found");
    return { ok: true, lead };
  }

  @Get("funnel-stats")
  @UseGuards(JwtAuthGuard)
  async stats() {
    await this.svc.syncFromDb();
    return { ok: true, stats: this.svc.funnelStats() };
  }

  // ── Webhook WhatsApp Business (HMAC verify) ───────────────────────

  /**
   * Webhook Meta WhatsApp Business — vérif HMAC-SHA256 du body avec
   * `WHATSAPP_APP_SECRET`. Si secret absent : refus 401.
   *
   * GET = challenge de validation Meta (?hub.mode=subscribe&hub.challenge=…).
   * POST = inbound message → crée un lead si nouveau numéro.
   */
  @Get("webhook/whatsapp")
  async waChallenge(
    @Query("hub.mode") mode?: string,
    @Query("hub.verify_token") token?: string,
    @Query("hub.challenge") challenge?: string,
  ) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN || "";
    if (mode === "subscribe" && token && expected && token === expected) {
      return challenge || "ok";
    }
    throw new BadRequestException("verify_failed");
  }

  @Post("webhook/whatsapp")
  @HttpCode(200)
  async waInbound(
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Req() req: any,
    @Body() body: any,
  ) {
    const secret = process.env.WHATSAPP_APP_SECRET || "";
    if (!secret) {
      return { ok: false, reason: "secret_not_configured" };
    }
    const rawBody = req?.rawBody
      ? req.rawBody.toString("utf8")
      : JSON.stringify(body || {});
    const expected =
      "sha256=" +
      createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    if (!signature || !safeEq(signature, expected)) {
      return { ok: false, reason: "bad_signature" };
    }

    // Parsing minimal du payload WA Business
    try {
      const entries = body?.entry || [];
      for (const e of entries) {
        for (const c of e?.changes || []) {
          for (const m of c?.value?.messages || []) {
            const from = String(m?.from || "");
            const text = String(m?.text?.body || "");
            const phone = from.startsWith("+") ? from : `+${from}`;
            await this.svc.capture({
              nom: `WhatsApp ${phone.slice(-4)}`,
              telephone: phone,
              source: "WHATSAPP_INBOUND",
              lang: "fr",
              pageContext: "whatsapp",
              meta: { text },
            }).catch(() => undefined);
          }
        }
      }
    } catch {
      // log silencieux : Meta réémet le webhook si non-200
    }
    return { ok: true };
  }
}

/**
 * IP du visiteur pour la limite de débit. Derrière un proxy (Cloudflare,
 * hébergeur), req.ip est celle du proxy : tous les visiteurs partageraient
 * un seul quota. LEAD_TRUST_PROXY=1 fait lire l'en-tête d'origine — à
 * n'activer que si l'API n'est joignable QUE par ce proxy (sinon l'en-tête
 * est falsifiable et la limite contournable).
 */
function ipClient(req: any): string {
  if (process.env.LEAD_TRUST_PROXY === "1") {
    const cf = String(req?.headers?.["cf-connecting-ip"] || "").trim();
    if (cf) return cf;
    const xff = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
    if (xff) return xff;
  }
  return String(req?.ip || req?.socket?.remoteAddress || "unknown");
}

function safeEq(a: string, b: string): boolean {
  try {
    const A = Buffer.from(a);
    const B = Buffer.from(b);
    if (A.length !== B.length) return false;
    return timingSafeEqual(A, B);
  } catch {
    return false;
  }
}
