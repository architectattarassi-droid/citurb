import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { P6ScoringService } from "./scoring.service";
import { P6_STATUS_LABELS } from "./registry";

/**
 * Endpoints admin pour review des fiches prestataires/fournisseurs P6.
 *
 *  GET    /api/cc/p6-review/pending             → liste fiches en attente de review
 *  GET    /api/cc/p6-review/:dossierId          → détail fiche + score recalculé
 *  PATCH  /api/cc/p6-review/:dossierId/verify   → marquer VERIFIED
 *  PATCH  /api/cc/p6-review/:dossierId/blacklist → marquer BLACKLISTED
 *  PATCH  /api/cc/p6-review/:dossierId/needs-docs → renvoyer demande docs
 */
@Tome("tome7")
@Controller("api/cc/p6-review")
@UseGuards(JwtAuthGuard, RolesGuard)
export class P6ReviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: P6ScoringService,
  ) {}

  @Get("pending")
  @Roles("ADMIN", "OWNER", "OPS")
  async listPending(@Query("take") take?: string) {
    const t = Math.min(Number(take ?? 50), 200);
    const items = await this.prisma.dossier.findMany({
      where: { porteType: "P6" },
      orderBy: { createdAt: "desc" },
      take: t * 5,
      select: {
        id: true, createdAt: true, updatedAt: true,
        title: true, commune: true,
        clientNom: true, clientEmail: true, clientTel: true,
        raisonSociale: true, payload: true,
      },
    });
    const filtered = items
      .map(d => {
        const validation = (d.payload as any)?.p6Validation;
        const status = validation?.status ?? "DRAFT";
        const brief = (d.payload as any)?.brief ?? {};
        const scoreSnapshot = brief?.scoreSnapshot;
        return {
          dossier: {
            id: d.id, createdAt: d.createdAt, updatedAt: d.updatedAt,
            title: d.title, commune: d.commune,
            clientNom: d.clientNom, clientEmail: d.clientEmail, clientTel: d.clientTel,
            raisonSociale: d.raisonSociale,
          },
          p6Type: brief?.p6Type,
          classeBTP: brief?.classeBTP,
          score: scoreSnapshot?.score,
          tier: scoreSnapshot?.tier,
          status,
          statusLabel: P6_STATUS_LABELS[status as keyof typeof P6_STATUS_LABELS]?.label ?? status,
        };
      })
      .filter(x => x.status === "DRAFT" || x.status === "PENDING_REVIEW" || x.status === "NEEDS_DOCS")
      .slice(0, t);
    return { ok: true, items: filtered, total: filtered.length };
  }

  @Get(":dossierId")
  @Roles("ADMIN", "OWNER", "OPS")
  async detail(@Param("dossierId") id: string) {
    const d = await this.prisma.dossier.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, createdAt: true, updatedAt: true,
        title: true, commune: true,
        clientNom: true, clientEmail: true, clientTel: true,
        raisonSociale: true, payload: true,
      },
    });
    const brief = (d.payload as any)?.brief ?? {};
    const validation = (d.payload as any)?.p6Validation;

    // Recalculer le score depuis brief (au cas où la doctrine de scoring a évolué)
    let recomputedScore = null;
    try {
      recomputedScore = this.scoring.computeScore({
        type: brief.p6Type,
        raisonSociale: d.raisonSociale ?? "",
        rc: brief.rc, ice: brief.ice,
        classeBTP: brief.classeBTP,
        categoriesAgrement: brief.categoriesAgrement,
        agrementMetleNumero: brief.agrementMetleNumero,
        agrementMetleValidite: brief.agrementMetleValidite,
        decennaleValide: brief.decennaleValide,
        rcProValide: brief.rcProValide,
        documents: brief.documents,
        nbReferences: brief.nbReferences,
        nbPhotosChantiers: brief.nbPhotosChantiers,
        ancienneteAnnees: brief.ancienneteAnnees,
        nbMateriauxCatalogue: brief.nbMateriauxCatalogue,
        zonesFourniture: typeof brief.zonesFourniture === "string"
          ? brief.zonesFourniture.split(",").map((s: string) => s.trim())
          : (brief.zonesFourniture ?? []),
      });
    } catch (e: any) {
      // Snapshot brief incomplet — on retourne ce qu'on a
    }

    return {
      ok: true,
      dossier: d,
      brief,
      validation: validation ?? { status: "DRAFT", history: [] },
      recomputedScore,
    };
  }

  @Patch(":dossierId/verify")
  @Roles("ADMIN", "OWNER")
  async verify(@Param("dossierId") id: string, @Body() body: { note?: string; expiresInDays?: number }, @Req() req: any) {
    return this.transition(id, "VERIFIED", req, body.note, { expiresInDays: body.expiresInDays });
  }

  @Patch(":dossierId/blacklist")
  @Roles("ADMIN", "OWNER")
  async blacklist(@Param("dossierId") id: string, @Body() body: { reason: string }, @Req() req: any) {
    if (!body.reason?.trim()) throw new Error("Motif blacklist requis");
    return this.transition(id, "BLACKLISTED", req, body.reason);
  }

  @Patch(":dossierId/needs-docs")
  @Roles("ADMIN", "OWNER", "OPS")
  async needsDocs(@Param("dossierId") id: string, @Body() body: { docsToProvide: string[]; note?: string }, @Req() req: any) {
    return this.transition(id, "NEEDS_DOCS", req, body.note, { docsToProvide: body.docsToProvide });
  }

  private async transition(
    dossierId: string,
    newStatus: "VERIFIED" | "BLACKLISTED" | "NEEDS_DOCS" | "EXPIRED",
    req: any,
    note?: string,
    extra: any = {},
  ) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      select: { payload: true },
    });
    const payload: any = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
    const prev = payload.p6Validation ?? { status: "DRAFT", history: [] };
    const now = new Date().toISOString();
    const author = req.user?.email || req.user?.userId || "admin";

    const next: any = {
      ...prev,
      status: newStatus,
      reviewedAt: now,
      reviewedBy: author,
      reviewNote: note,
    };
    if (newStatus === "VERIFIED" && extra.expiresInDays) {
      const expiresAt = new Date(Date.now() + extra.expiresInDays * 24 * 3600 * 1000).toISOString();
      next.expiresAt = expiresAt;
    }
    if (newStatus === "NEEDS_DOCS" && extra.docsToProvide) {
      next.docsToProvide = extra.docsToProvide;
    }
    next.history = [...(prev.history ?? []), { ts: now, status: newStatus, author, note }];

    payload.p6Validation = next;
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
    return { ok: true, validation: next };
  }
}
