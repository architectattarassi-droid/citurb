/**
 * Tome 2 — PV Commission Rokhas — Controller
 *
 * Endpoints :
 *   POST   /api/pv-commission/upload/:dossierId
 *   POST   /api/pv-commission/:pvId/parse
 *   GET    /api/pv-commission/dossier/:dossierId
 *   GET    /api/pv-commission/:pvId
 *   POST   /api/pv-commission/:pvId/reserves/:reserveId/lever
 *   GET    /api/pv-commission/:pvId/pdf
 *   POST   /api/pv-commission/webhook/rokhas  (HMAC, pas d'auth JWT)
 *
 * NOTE : la route racine /api/pv-commission doit être ajoutée à la
 * `allow-list` du MutationGateGuard (cf. INTEGRATION.md).
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createHmac, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { PvCommissionService } from "./pv-commission.service";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

@Tome("tome2")
@Controller("api/pv-commission")
export class PvCommissionController {
  constructor(private readonly svc: PvCommissionService) {}

  // ── UPLOAD (auth) ─────────────────────────────────────────────────────────

  @Post("upload/:dossierId")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_PDF_BYTES } }))
  async upload(
    @Param("dossierId") dossierId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier reçu");
    const v = await this.svc.uploadPv({
      dossierId,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      uploadedBy: req.user?.userId || "unknown",
    });
    return { ok: true, pv: v };
  }

  // ── PARSE (auth) ──────────────────────────────────────────────────────────

  @Post(":pvId/parse")
  @UseGuards(JwtAuthGuard)
  async parse(@Param("pvId") pvId: string, @Req() req: any) {
    const r = await this.svc.parsePv(pvId, req.user?.userId || "unknown");
    return { ok: true, pv: r.pv, workflow: r.workflow };
  }

  // ── READ (auth) ───────────────────────────────────────────────────────────

  @Get("dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  async listByDossier(@Param("dossierId") dossierId: string) {
    const items = await this.svc.listByDossier(dossierId);
    return { ok: true, count: items.length, items };
  }

  @Get(":pvId")
  @UseGuards(JwtAuthGuard)
  async getOne(@Param("pvId") pvId: string) {
    const pv = await this.svc.getById(pvId);
    return { ok: true, pv };
  }

  // ── LEVÉE DE RÉSERVE (auth, architecte/OPS/owner) ─────────────────────────

  @Post(":pvId/reserves/:reserveId/lever")
  @UseGuards(JwtAuthGuard)
  async leverReserve(
    @Param("pvId") pvId: string,
    @Param("reserveId") reserveId: string,
    @Body() body: { preuveUrl: string; note?: string },
    @Req() req: any,
  ) {
    const role = req.user?.role;
    if (!["OWNER", "ADMIN", "OPS", "OPERATOR"].includes(role)) {
      throw new ForbiddenException("Levée de réserve réservée à l'architecte / OPS");
    }
    const pv = await this.svc.leverReserve({
      pvId,
      reserveId,
      preuveUrl: body.preuveUrl,
      note: body.note,
      leveeBy: req.user.userId,
    });
    return { ok: true, pv };
  }

  // ── PDF DOWNLOAD (auth) ───────────────────────────────────────────────────

  @Get(":pvId/pdf")
  @UseGuards(JwtAuthGuard)
  async getPdf(@Param("pvId") pvId: string, @Res() res: any) {
    const fullPath = await this.svc.getPdfPath(pvId);
    try {
      const buf = await fs.readFile(fullPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${pvId}.pdf"`);
      res.setHeader("Cache-Control", "private, no-cache");
      return res.send(buf);
    } catch (e: any) {
      throw new BadRequestException(`PDF inaccessible: ${e?.message}`);
    }
  }

  // ── WEBHOOK ROKHAS (pas d'auth JWT, HMAC) ─────────────────────────────────

  /**
   * Webhook reçu depuis rokhas.ma quand une commission produit un PV.
   * Signature HMAC SHA-256 du body avec `ROKHAS_WEBHOOK_SECRET`,
   * envoyée dans le header `X-Rokhas-Signature: sha256=<hex>`.
   * Anti-replay : timestamp dans header `X-Rokhas-Timestamp` (±5 min).
   */
  @Post("webhook/rokhas")
  async rokhasWebhook(
    @Headers("x-rokhas-signature") sig: string | undefined,
    @Headers("x-rokhas-timestamp") ts: string | undefined,
    @Body() body: { dossierId: string; pdfBase64: string; rokhasReference?: string },
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

    // Recalcule HMAC (rawBody fourni par express si bodyParser.raw, sinon
    // on rejette par sérialisation du body JSON — tolérant aux deux configs).
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

    if (!body?.dossierId || !body?.pdfBase64) throw new BadRequestException("Payload invalide");
    const pv = await this.svc.ingestFromWebhook(body);
    return { ok: true, pvId: pv.id, decision: pv.decision };
  }
}
