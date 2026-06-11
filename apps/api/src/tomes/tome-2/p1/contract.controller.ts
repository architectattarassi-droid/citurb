import { BadRequestException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { P1ContractService } from "./contract.service";

/**
 * Génération du contrat type unifié d'Architecte (CNOA Construction 2024) pour P1.
 *
 * 2 endpoints :
 *   - GET /p1/admin/dossiers/:id/contrat (ADMIN/OWNER/OPS)
 *       → accès direct, pas de consentement requis
 *   - GET /p1/dossiers/:id/contrat (CLIENT propriétaire du dossier)
 *       → consentement obligatoire (?consent_data=true&consent_usage=true)
 *       → sans consentement : page HTML de saisie avec checkboxes
 *       → avec consentement : trace en DB + génère le contrat
 *
 * Format : HTML imprimable (l'utilisateur clique "Imprimer / Sauvegarder en PDF"
 * dans le navigateur — aucune dépendance puppeteer ou pdfkit côté serveur).
 */
@Tome("tome2")
@Controller("p1")
export class P1ContractController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contract: P1ContractService,
  ) {}

  // ─── Variante ADMIN ────────────────────────────────────────────────────
  @Get("admin/dossiers/:id/contrat")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  @Header("Content-Type", "text/html; charset=utf-8")
  async generateAdmin(
    @Param("id") id: string,
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    const dossier = await this.loadDossier(id);
    const data = this.contract.buildContractData(dossier);
    const admin = this.contract.buildAdminParams(q);
    res.send(this.contract.renderContractHtml(data, admin));
  }

  // ─── Variante CLIENT self-service avec consentement ────────────────────
  @Get("dossiers/:id/contrat")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "ADMIN", "OWNER", "OPS") // permet aussi admin via cet endpoint
  @Header("Content-Type", "text/html; charset=utf-8")
  async generateClient(
    @Param("id") id: string,
    @Query() q: Record<string, string>,
    @Req() req: Request & { user?: any },
    @Res() res: Response,
  ) {
    const dossier = await this.loadDossier(id);
    const user = req.user;
    const role = (user?.role || "").toUpperCase();

    // Si admin → accès direct (mêmes droits que /admin/...)
    if (role === "ADMIN" || role === "OWNER" || role === "OPS") {
      const data = this.contract.buildContractData(dossier);
      const admin = this.contract.buildAdminParams(q);
      res.send(this.contract.renderContractHtml(data, admin));
      return;
    }

    // Client : doit être propriétaire du dossier
    const ownerId = (dossier as any).userId || (dossier as any).clientId;
    if (!ownerId || ownerId !== user?.userId) {
      throw new ForbiddenException("Vous n'êtes pas le propriétaire de ce dossier.");
    }

    const consentData = q.consent_data === "true";
    const consentUsage = q.consent_usage === "true";

    // Sans consentement → page de saisie avec checkboxes
    if (!consentData || !consentUsage) {
      const title = (dossier as any).title || "Mon projet";
      res.send(this.contract.renderConsentPage(id, title));
      return;
    }

    // Trace le consentement (Dossier.payload.contractConsents[]).
    // Append-only (history complet pour traçabilité juridique loi 09-08).
    const existingPayload: any = (dossier as any).payload && typeof (dossier as any).payload === "object"
      ? (dossier as any).payload
      : {};
    const consents = Array.isArray(existingPayload.contractConsents)
      ? existingPayload.contractConsents
      : [];
    consents.push({
      timestamp: new Date().toISOString(),
      ip: this.extractIp(req),
      userAgent: (req.headers["user-agent"] as string) || "",
      consent_data: true,
      consent_usage: true,
      userId: user?.userId || null,
    });

    await this.prisma.dossier.update({
      where: { id },
      data: {
        payload: { ...existingPayload, contractConsents: consents } as any,
      },
    });

    // Génère le contrat HTML
    const data = this.contract.buildContractData(dossier);
    const adminParams = this.contract.buildAdminParams(q);
    res.send(this.contract.renderContractHtml(data, adminParams));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async loadDossier(id: string) {
    if (!id || typeof id !== "string" || id.length < 3) {
      throw new BadRequestException("Identifiant de dossier invalide.");
    }
    try {
      return await this.prisma.dossier.findUniqueOrThrow({
        where: { id },
        select: {
          id: true, title: true, commune: true, createdAt: true,
          clientNom: true, clientEmail: true, clientTel: true,
          raisonSociale: true,
          payload: true,
          // userId si présent (selon le schéma Prisma local) — sélection tolérante
        } as any,
      });
    } catch {
      throw new NotFoundException("Dossier introuvable.");
    }
  }

  private extractIp(req: Request): string {
    // Priorité X-Forwarded-For (Railway / Cloudflare), fallback connection.
    const xff = (req.headers["x-forwarded-for"] as string) || "";
    const first = xff.split(",")[0]?.trim();
    return first || req.ip || "";
  }
}
