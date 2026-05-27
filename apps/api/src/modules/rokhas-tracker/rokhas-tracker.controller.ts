/**
 * Rokhas Tracker — Controller
 *
 * Endpoints :
 *   POST   /api/rokhas-tracker/dossier/:dossierId/depot
 *   POST   /api/rokhas-tracker/dossier/:dossierId/event
 *   GET    /api/rokhas-tracker/dossier/:dossierId
 *   POST   /api/rokhas-tracker/dossier/:dossierId/reserve/:reserveId/lever
 *   GET    /api/rokhas-tracker/dossier/:dossierId/deadlines
 *   POST   /api/rokhas-tracker/webhook                 (HMAC, sans JWT)
 *
 * NOTE doctrine :
 *  - Toutes les mutations exigent que `/api/rokhas-tracker` soit dans
 *    l'allow-list de `MutationGateGuard` (cf. INTEGRATION.md).
 *  - Le webhook utilise HMAC-SHA256 (header X-Rokhas-Signature) +
 *    anti-replay 5 min (header X-Rokhas-Timestamp).
 */
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { RokhasTrackerService } from "./rokhas-tracker.service";
import type { ProjectCategory, RokhasEventType } from "./types";

@Tome("tome2")
@Controller("api/rokhas-tracker")
export class RokhasTrackerController {
  constructor(private readonly svc: RokhasTrackerService) {}

  // ── DÉPÔT ─────────────────────────────────────────────────────────────────

  @Post("dossier/:dossierId/depot")
  @UseGuards(JwtAuthGuard)
  async registerDepot(
    @Param("dossierId") dossierId: string,
    @Body() body: { projectCategory: ProjectCategory; refRokhas?: string | null; date?: string | null },
    @Req() req: any,
  ) {
    if (!body || typeof body.projectCategory !== "number") {
      throw new BadRequestException("body.projectCategory requis (1, 2 ou 3)");
    }
    const inst = await this.svc.registerDepot({
      dossierId,
      projectCategory: body.projectCategory,
      depositDate: body.date ?? null,
      refRokhasCommune: body.refRokhas ?? null,
      actorId: req.user?.userId || "unknown",
    });
    return { ok: true, instance: inst };
  }

  // ── ÉVÉNEMENT ─────────────────────────────────────────────────────────────

  @Post("dossier/:dossierId/event")
  @UseGuards(JwtAuthGuard)
  async addEvent(
    @Param("dossierId") dossierId: string,
    @Body() body: { type: RokhasEventType; date?: string | null; payload?: Record<string, any> },
    @Req() req: any,
  ) {
    if (!body?.type) throw new BadRequestException("body.type requis");
    const inst = await this.svc.addEvent({
      dossierId,
      type: body.type,
      date: body.date ?? null,
      payload: body.payload ?? {},
      actorId: req.user?.userId || "unknown",
    });
    return { ok: true, instance: inst };
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  @Get("dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  async getInstance(@Param("dossierId") dossierId: string) {
    const inst = await this.svc.getInstance(dossierId);
    if (!inst) return { ok: true, instance: null };
    return { ok: true, instance: inst };
  }

  @Get("dossier/:dossierId/deadlines")
  @UseGuards(JwtAuthGuard)
  async getDeadlines(@Param("dossierId") dossierId: string) {
    const deadlines = await this.svc.listDeadlines(dossierId);
    return { ok: true, count: deadlines.length, deadlines };
  }

  // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────

  @Post("dossier/:dossierId/reserve/:reserveId/lever")
  @UseGuards(JwtAuthGuard)
  async leverReserve(
    @Param("dossierId") dossierId: string,
    @Param("reserveId") reserveId: string,
    @Body() body: { preuveDocId: string; preuveUrl?: string | null },
    @Req() req: any,
  ) {
    if (!body?.preuveDocId) throw new BadRequestException("preuveDocId requis");
    const role = req.user?.role;
    // Architecte / OPS / OWNER / ADMIN peuvent lever.
    if (!["OWNER", "ADMIN", "OPS", "OPERATOR", "CLIENT"].includes(role)) {
      throw new ForbiddenException("Levée de réserve réservée aux rôles autorisés");
    }
    const inst = await this.svc.leverReserve({
      dossierId,
      reserveId,
      preuveDocId: body.preuveDocId,
      preuveUrl: body.preuveUrl ?? null,
      actorId: req.user?.userId || "unknown",
    });
    return { ok: true, instance: inst };
  }

  // ── WEBHOOK (HMAC, sans JWT) ──────────────────────────────────────────────

  @Post("webhook")
  async rokhasWebhook(
    @Headers("x-rokhas-signature") sig: string | undefined,
    @Headers("x-rokhas-timestamp") ts: string | undefined,
    @Body() body: {
      dossierId: string;
      type: RokhasEventType;
      date?: string;
      refRokhasCommune?: string;
      decision?: any;
      extra?: Record<string, any>;
    },
    @Req() req: any,
  ) {
    const secret = process.env.ROKHAS_WEBHOOK_SECRET;
    if (!secret) throw new ForbiddenException("Webhook désactivé (ROKHAS_WEBHOOK_SECRET manquant)");
    if (!sig || !ts) throw new ForbiddenException("Signature ou timestamp manquant");

    // Anti-replay 5 min
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
      throw new ForbiddenException("Timestamp expiré (>5 min)");
    }

    const rawBody: Buffer | undefined = req.rawBody;
    const payload: string = rawBody ? rawBody.toString("utf8") : JSON.stringify(body);
    const expected = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
    const got = sig.replace(/^sha256=/i, "").trim();
    let ok = false;
    try {
      ok = expected.length === got.length && timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(got, "hex"));
    } catch {
      ok = false;
    }
    if (!ok) throw new ForbiddenException("Signature HMAC invalide");

    if (!body?.dossierId || !body?.type) throw new BadRequestException("Payload invalide");
    const inst = await this.svc.ingestFromWebhook(body);
    return { ok: true, dossierId: inst.dossierId, type: body.type };
  }
}
