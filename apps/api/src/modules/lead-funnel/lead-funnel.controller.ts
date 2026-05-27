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
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-at/security/jwt-auth.guard";
import { LeadFunnelService } from "./lead-funnel.service";
import type { LeadCaptureInput, LeadStage } from "./lead-funnel.types";

@Tome("tome0")
@Controller("api/lead-funnel")
export class LeadFunnelController {
  constructor(private readonly svc: LeadFunnelService) {}

  // ── Public : capture ──────────────────────────────────────────────

  @Post("capture")
  @HttpCode(201)
  async capture(@Body() body: LeadCaptureInput, @Req() req: any) {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("payload_invalid");
    }
    // Enrichit avec headers utiles (IP / UA / referer) en meta
    const meta = {
      ip: (req?.headers?.["x-forwarded-for"] || req?.ip || "").toString(),
      ua: (req?.headers?.["user-agent"] || "").toString(),
      referer: (req?.headers?.["referer"] || "").toString(),
    };

    try {
      const result = await this.svc.capture({ ...body, meta });
      return { ok: true, ...result };
    } catch (e: any) {
      if (e?.message === "phone_invalid") {
        throw new BadRequestException("phone_invalid");
      }
      if (e?.message === "nom_invalid") {
        throw new BadRequestException("nom_invalid");
      }
      throw e;
    }
  }

  // ── Admin (JWT) ───────────────────────────────────────────────────

  @Get("lead/:id")
  @UseGuards(JwtAuthGuard)
  async getLead(@Param("id") id: string) {
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
