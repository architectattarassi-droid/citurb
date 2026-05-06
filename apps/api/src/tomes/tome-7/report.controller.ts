import { Controller, Get, Header, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../tome-at";
import { JwtAuthGuard } from "../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tome-5/auth/roles.guard";
import { Roles } from "../tome-5/auth/roles.decorator";
import { PrismaService } from "../tome-at/kernel/prisma/prisma.service";
import { ReportRendererService } from "./report-renderer.service";
import { raiseDoctrine } from "../../modules/kernel/raise-doctrine";

/**
 * Endpoints de téléchargement rapport P4 / P5 (HTML watermarqué imprimable)
 *
 *  /p4/dossiers/:id/rapport     → CLIENT, gated sur packValidation.status === ACTIVATED
 *  /p4/dossiers/:id/rapport/admin → ADMIN, preview sans gating (banner ⚠️)
 *  /p5/dossiers/:id/rapport     → idem
 *  /p5/dossiers/:id/rapport/admin → idem
 *
 * Doctrine T7-R-EXPORT-001: téléchargement permis seulement après paiement
 * validé par admin (Tome 1 PackValidationService). Sinon → 403 + incident
 * ENTITLEMENT_BYPASS.
 */
@Tome("tome7")
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: ReportRendererService,
  ) {}

  // ── P4 client (gated) ─────────────────────────────────────────────────
  @Get("p4/dossiers/:id/rapport")
  @Header("Content-Type", "text/html; charset=utf-8")
  async p4Client(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const dossier = await this.fetchDossier(id);
    if (dossier.porteType !== "P4") {
      return res.status(404).json({ error: "Dossier P4 introuvable" });
    }
    this.assertActivatedOrThrow(dossier, req);
    const html = this.renderer.renderHtml({
      dossierId: dossier.id,
      porteType: "P4",
      clientNom: dossier.clientNom ?? undefined,
      raisonSociale: dossier.raisonSociale ?? undefined,
      commune: dossier.commune ?? undefined,
      title: dossier.title ?? undefined,
      brief: (dossier.payload as any)?.brief,
      packValidationStatus: (dossier.payload as any)?.packValidation?.status,
      adminContent: this.parseAdminContent(req.query),
      isAdminPreview: false,
    });
    res.send(html);
  }

  // ── P4 admin preview (no gating) ─────────────────────────────────────
  @Get("p4/dossiers/:id/rapport/admin")
  @Roles("ADMIN", "OWNER", "OPS")
  @Header("Content-Type", "text/html; charset=utf-8")
  async p4Admin(@Param("id") id: string, @Query() q: any, @Res() res: Response) {
    const dossier = await this.fetchDossier(id);
    if (dossier.porteType !== "P4") {
      return res.status(404).json({ error: "Dossier P4 introuvable" });
    }
    const html = this.renderer.renderHtml({
      dossierId: dossier.id,
      porteType: "P4",
      clientNom: dossier.clientNom ?? undefined,
      raisonSociale: dossier.raisonSociale ?? undefined,
      commune: dossier.commune ?? undefined,
      title: dossier.title ?? undefined,
      brief: (dossier.payload as any)?.brief,
      packValidationStatus: (dossier.payload as any)?.packValidation?.status,
      adminContent: this.parseAdminContent(q),
      isAdminPreview: true,
    });
    res.send(html);
  }

  // ── P5 client (gated) ─────────────────────────────────────────────────
  @Get("p5/dossiers/:id/rapport")
  @Header("Content-Type", "text/html; charset=utf-8")
  async p5Client(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const dossier = await this.fetchDossier(id);
    if (dossier.porteType !== "P5") {
      return res.status(404).json({ error: "Dossier P5 introuvable" });
    }
    this.assertActivatedOrThrow(dossier, req);
    const html = this.renderer.renderHtml({
      dossierId: dossier.id,
      porteType: "P5",
      clientNom: dossier.clientNom ?? undefined,
      raisonSociale: dossier.raisonSociale ?? undefined,
      commune: dossier.commune ?? undefined,
      title: dossier.title ?? undefined,
      brief: (dossier.payload as any)?.brief,
      packValidationStatus: (dossier.payload as any)?.packValidation?.status,
      adminContent: this.parseAdminContent(req.query),
      isAdminPreview: false,
    });
    res.send(html);
  }

  @Get("p5/dossiers/:id/rapport/admin")
  @Roles("ADMIN", "OWNER", "OPS")
  @Header("Content-Type", "text/html; charset=utf-8")
  async p5Admin(@Param("id") id: string, @Query() q: any, @Res() res: Response) {
    const dossier = await this.fetchDossier(id);
    if (dossier.porteType !== "P5") {
      return res.status(404).json({ error: "Dossier P5 introuvable" });
    }
    const html = this.renderer.renderHtml({
      dossierId: dossier.id,
      porteType: "P5",
      clientNom: dossier.clientNom ?? undefined,
      raisonSociale: dossier.raisonSociale ?? undefined,
      commune: dossier.commune ?? undefined,
      title: dossier.title ?? undefined,
      brief: (dossier.payload as any)?.brief,
      packValidationStatus: (dossier.payload as any)?.packValidation?.status,
      adminContent: this.parseAdminContent(q),
      isAdminPreview: true,
    });
    res.send(html);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private async fetchDossier(id: string) {
    return this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, porteType: true, title: true, commune: true,
        clientNom: true, raisonSociale: true, payload: true,
        ownerId: true,
      },
    });
  }

  private assertActivatedOrThrow(dossier: any, req: any) {
    const userId = req.user?.userId;
    const isOwnerOfDossier = userId && dossier.ownerId === userId;
    const role = (req.user?.role || "").toString().toUpperCase();
    const isPrivileged = ["ADMIN", "OWNER", "OPS"].includes(role);
    if (!isOwnerOfDossier && !isPrivileged) {
      raiseDoctrine({
        messagePublic: "Action impossible.",
        httpStatus: 403,
        rule_id: "T7-R-EXPORT-OWNERSHIP",
        error_code: "ERR-T7-EXPORT-NOT-OWNER",
        category: "ENTITLEMENT_BYPASS",
        severity: "WARN",
        public_code: "CIT-403-0030",
      });
    }
    const status = (dossier.payload as any)?.packValidation?.status;
    if (status !== "ACTIVATED") {
      raiseDoctrine({
        messagePublic: "Le pack n'est pas encore activé. Le rapport sera téléchargeable après validation administrative.",
        httpStatus: 402,
        rule_id: "T7-R-EXPORT-PAYWALL",
        error_code: "ERR-T7-EXPORT-NOT-ACTIVATED",
        category: "ENTITLEMENT_BYPASS",
        severity: "INFO",
        public_code: "CIT-402-0010",
      });
    }
  }

  private parseAdminContent(q: any) {
    return {
      sections: q?.sections ? this.safeJson(q.sections) : undefined,
      conclusion: q?.conclusion,
      expertNom: q?.expertNom,
      expertNumeroOrdre: q?.expertNumeroOrdre,
      dateDelivrance: q?.dateDelivrance,
    };
  }

  private safeJson(s: string) {
    try { return JSON.parse(s); } catch { return undefined; }
  }
}
