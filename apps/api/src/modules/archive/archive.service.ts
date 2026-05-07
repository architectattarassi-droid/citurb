import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * ArchiveService — recherche multi-dimensionnelle des dossiers + accès complet.
 *
 * Doctrine: la base Postgres est la source de vérité. Cette service expose une
 * vue "archive" pour permettre à l'admin de retrouver n'importe quel dossier
 * par toutes ses dimensions:
 *   - Géo:       commune, arrondissement
 *   - Client:    nom, raison sociale, ICE, RC, CIN, email, tel
 *   - Foncier:   titre foncier (parcelRef + brief.titreFoncier), lotissement, adresse
 *   - Projet:    porteType, sousTypeP2, status, dateRange
 *   - Recherche libre: title + description + brief
 *
 * Note: certains critères (titre foncier, lotissement) peuvent être stockés
 * soit dans des colonnes dédiées (parcelRef), soit dans payload JSON
 * (brief.titreFoncierNum, brief.lotissement). On cherche dans les deux.
 */

export type ArchiveSearchInput = {
  // Géo
  commune?: string;
  arrondissement?: string;
  // Client
  clientNom?: string;
  raisonSociale?: string;
  ice?: string;
  rc?: string;
  cin?: string;
  email?: string;
  tel?: string;
  // Foncier
  titreFoncier?: string;
  lotissement?: string;
  adresse?: string;
  // Projet
  porteType?: string;
  sousTypeP2?: string;
  status?: string;
  // Date range (ISO strings)
  dateFrom?: string;
  dateTo?: string;
  // Full-text
  q?: string;
  // Pagination
  take?: number;
  skip?: number;
};

@Injectable()
export class ArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compteurs par facette pour les filtres UI (sidebar avec compteurs).
   */
  async facets() {
    const dossiers = await this.prisma.dossier.findMany({
      select: {
        commune: true, arrondissement: true,
        porteType: true, sousTypeP2: true, status: true,
        payload: true,
      },
    });
    const communes: Record<string, number> = {};
    const arrondissements: Record<string, number> = {};
    const portes: Record<string, number> = {};
    const sousTypes: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    const lotissements: Record<string, number> = {};

    for (const d of dossiers) {
      if (d.commune) communes[d.commune] = (communes[d.commune] || 0) + 1;
      if (d.arrondissement) arrondissements[d.arrondissement] = (arrondissements[d.arrondissement] || 0) + 1;
      if (d.porteType) portes[d.porteType] = (portes[d.porteType] || 0) + 1;
      if (d.sousTypeP2) sousTypes[d.sousTypeP2] = (sousTypes[d.sousTypeP2] || 0) + 1;
      if (d.status) statuses[d.status] = (statuses[d.status] || 0) + 1;

      // Détection lotissement depuis payload.brief
      const brief: any = (d.payload as any)?.brief;
      if (brief?.lotissement) lotissements[brief.lotissement] = (lotissements[brief.lotissement] || 0) + 1;
    }

    return {
      total: dossiers.length,
      communes: this.toFacetArray(communes),
      arrondissements: this.toFacetArray(arrondissements),
      portes: this.toFacetArray(portes),
      sousTypes: this.toFacetArray(sousTypes),
      statuses: this.toFacetArray(statuses),
      lotissements: this.toFacetArray(lotissements),
    };
  }

  /**
   * Recherche multi-critères. Combine filtres colonnes + recherche JSON.
   */
  async search(input: ArchiveSearchInput) {
    const where: any = { AND: [] };

    if (input.commune)        where.AND.push({ commune: { contains: input.commune, mode: "insensitive" } });
    if (input.arrondissement) where.AND.push({ arrondissement: { contains: input.arrondissement, mode: "insensitive" } });
    if (input.porteType)      where.AND.push({ porteType: input.porteType });
    if (input.sousTypeP2)     where.AND.push({ sousTypeP2: input.sousTypeP2 });
    if (input.status)         where.AND.push({ status: input.status as any });
    if (input.clientNom)      where.AND.push({ clientNom: { contains: input.clientNom, mode: "insensitive" } });
    if (input.raisonSociale)  where.AND.push({ raisonSociale: { contains: input.raisonSociale, mode: "insensitive" } });
    if (input.ice)            where.AND.push({ ice: { contains: input.ice } });
    if (input.rc)             where.AND.push({ rc: { contains: input.rc } });
    if (input.cin)            where.AND.push({ clientCin: { contains: input.cin } });
    if (input.email)          where.AND.push({ clientEmail: { contains: input.email, mode: "insensitive" } });
    if (input.tel)            where.AND.push({ clientTel: { contains: input.tel } });
    if (input.titreFoncier)   where.AND.push({ parcelRef: { contains: input.titreFoncier, mode: "insensitive" } });
    if (input.adresse)        where.AND.push({
      OR: [
        { address: { contains: input.adresse, mode: "insensitive" } },
        { adresseTerrain: { contains: input.adresse, mode: "insensitive" } },
      ],
    });

    if (input.dateFrom)       where.AND.push({ createdAt: { gte: new Date(input.dateFrom) } });
    if (input.dateTo)         where.AND.push({ createdAt: { lte: new Date(input.dateTo) } });

    if (input.q) {
      where.AND.push({
        OR: [
          { title: { contains: input.q, mode: "insensitive" } },
          { clientNom: { contains: input.q, mode: "insensitive" } },
          { raisonSociale: { contains: input.q, mode: "insensitive" } },
          { commune: { contains: input.q, mode: "insensitive" } },
          { parcelRef: { contains: input.q, mode: "insensitive" } },
          { adresseTerrain: { contains: input.q, mode: "insensitive" } },
          { ice: { contains: input.q } },
          { rc: { contains: input.q } },
        ],
      });
    }

    const take = Math.min(Math.max(Number(input.take ?? 50), 1), 200);
    const skip = Math.max(Number(input.skip ?? 0), 0);

    let items = await this.prisma.dossier.findMany({
      where: where.AND.length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: take * 3, // sur-fetch pour filtrer JSON
      skip,
      select: {
        id: true, createdAt: true, updatedAt: true,
        title: true, commune: true, arrondissement: true,
        clientNom: true, clientEmail: true, clientTel: true, clientCin: true,
        raisonSociale: true, rc: true, ice: true, representant: true,
        parcelRef: true, address: true, adresseTerrain: true,
        porteType: true, sousTypeP2: true, status: true,
        payload: true,
      },
    });

    // Filtrage post-DB pour les critères dans payload JSON
    if (input.titreFoncier || input.lotissement) {
      items = items.filter(d => {
        const brief: any = (d.payload as any)?.brief;
        if (input.titreFoncier && d.parcelRef?.toLowerCase().includes(input.titreFoncier.toLowerCase())) return true;
        if (input.titreFoncier && brief?.titreFoncierNum?.toLowerCase?.().includes(input.titreFoncier.toLowerCase())) return true;
        if (input.lotissement && (brief?.lotissement || "").toLowerCase().includes(input.lotissement.toLowerCase())) return true;
        return !input.titreFoncier && !input.lotissement;
      });
    }

    items = items.slice(0, take);

    // Strip payload sauf champs essentiels pour l'index
    const stripped = items.map(d => {
      const brief: any = (d.payload as any)?.brief ?? {};
      return {
        id: d.id, createdAt: d.createdAt, updatedAt: d.updatedAt,
        title: d.title, commune: d.commune, arrondissement: d.arrondissement,
        clientNom: d.clientNom, clientEmail: d.clientEmail, clientTel: d.clientTel,
        clientCin: d.clientCin,
        raisonSociale: d.raisonSociale, rc: d.rc, ice: d.ice, representant: d.representant,
        parcelRef: d.parcelRef, address: d.address, adresseTerrain: d.adresseTerrain,
        porteType: d.porteType, sousTypeP2: d.sousTypeP2, status: d.status,
        // Extraits utiles depuis brief
        titreFoncier: brief.titreFoncierNum || d.parcelRef,
        lotissement: brief.lotissement,
        packLabel: brief.packLabel || brief.categoryLabel || brief.reportLabel,
        montantTTC: brief.quoteSnapshot?.honoraires?.totalTTC || brief.quoteSnapshot?.amounts?.totalTTC,
        packValidationStatus: (d.payload as any)?.packValidation?.status,
      };
    });

    return { items: stripped, total: stripped.length };
  }

  /**
   * Vue COMPLÈTE d'un dossier — toutes données + relations + documents + history.
   */
  async dossierFull(dossierId: string) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({
      where: { id: dossierId },
      include: {
        owner: { select: { id: true, email: true, username: true, role: true, createdAt: true } },
        documents: { orderBy: { uploadedAt: "asc" } },
        payments: { orderBy: { createdAt: "asc" } },
        sousPhases: {
          include: {
            documents: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { numero: "asc" },
        },
        phaseRecords: { orderBy: { dateDebut: "asc" } },
        intervenants: true,
        messages: { orderBy: { createdAt: "asc" } },
        phaseChats: { orderBy: { createdAt: "asc" } },
        phaseReunions: { orderBy: { createdAt: "asc" } },
        phaseHistorique: { orderBy: { createdAt: "asc" } },
        rokhas: true,
        firm: { select: { id: true, name: true, slug: true } },
      },
    });

    return {
      ok: true,
      dossier,
      // Extraits commodes
      summary: this.buildSummary(dossier),
      timeline: this.buildTimeline(dossier),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private toFacetArray(map: Record<string, number>) {
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildSummary(d: any) {
    const payload = d.payload || {};
    const brief = payload.brief || {};
    const quote = brief.quoteSnapshot || {};
    return {
      created: d.createdAt,
      lastUpdate: d.updatedAt,
      porteType: d.porteType,
      status: d.status,
      packValidation: payload.packValidation?.status ?? "PENDING_PAYMENT",
      visaCroa: payload.visaCroa?.status ?? "NON_DEMANDE",
      p6Validation: payload.p6Validation?.status,
      antiDesintFlagsCount: (payload.antiDesintFlags ?? []).length,
      pack: brief.packLabel || brief.categoryLabel || brief.reportLabel,
      surfacePlancher: brief.surfacePlancherM2 || d.surfacePlancher,
      surfaceTerrain: d.surfaceTerrain,
      coutEstime: quote.base?.coutTravauxEstime || quote.base?.coutRealisation || quote.base?.prixVenteFoncierDH,
      honorairesTTC: quote.honoraires?.totalTTC || quote.amounts?.totalTTC,
      nbDocuments: (d.documents?.length || 0) + (d.sousPhases?.reduce((acc: number, sp: any) => acc + (sp.documents?.length || 0), 0) || 0),
      nbMessages: (d.messages?.length || 0) + (d.phaseChats?.length || 0),
      nbPhases: d.phaseRecords?.length || 0,
    };
  }

  private buildTimeline(d: any) {
    const events: { ts: string; type: string; label: string; meta?: any }[] = [];
    events.push({ ts: d.createdAt, type: "CREATED", label: "Dossier créé" });
    if (d.submittedAt) events.push({ ts: d.submittedAt, type: "SUBMITTED", label: "Dossier soumis" });
    if (d.disclaimerAcceptedAt) events.push({ ts: d.disclaimerAcceptedAt, type: "DISCLAIMER", label: "Disclaimer accepté" });

    const payload = d.payload || {};
    const pv = payload.packValidation;
    if (pv?.history) {
      for (const h of pv.history) events.push({ ts: h.ts, type: "PACK_" + h.status, label: `Pack ${h.status}`, meta: { author: h.author, note: h.note } });
    }
    const visa = payload.visaCroa;
    if (visa?.history) {
      for (const h of visa.history) events.push({ ts: h.ts, type: "VISA_" + h.status, label: `Visa CROA ${h.status}`, meta: { author: h.author, note: h.note } });
    }
    const p6v = payload.p6Validation;
    if (p6v?.history) {
      for (const h of p6v.history) events.push({ ts: h.ts, type: "P6_" + h.status, label: `Fiche P6 ${h.status}`, meta: { author: h.author, note: h.note } });
    }
    for (const ph of d.phaseRecords ?? []) {
      events.push({ ts: ph.createdAt, type: "PHASE", label: `Phase ${ph.phaseRef ?? ph.phaseOrder}`, meta: { status: ph.status } });
    }
    for (const sp of d.sousPhases ?? []) {
      events.push({ ts: sp.createdAt, type: "SOUS_PHASE", label: `Sous-phase ${sp.label || sp.id.slice(0, 6)}`, meta: { status: sp.status } });
    }
    for (const m of d.messages ?? []) {
      events.push({ ts: m.createdAt, type: "MESSAGE", label: `Message ${m.expediteurRole}`, meta: { contenu: (m.contenu || "").slice(0, 80) } });
    }

    return events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }
}
