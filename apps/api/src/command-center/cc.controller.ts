import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { PrismaService } from "../tomes/tome-at/kernel/prisma/prisma.service";
import { Tome } from "../tomes/tome-at";
import { JwtAuthGuard } from "../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../tomes/tome-5/auth/roles.guard";
import { Roles } from "../tomes/tome-5/auth/roles.decorator";
import { CCSnapshotService } from "./cc-snapshot.service";
import { LeadFunnelService } from "../modules/lead-funnel/lead-funnel.service";
import type { Lead as FunnelLead, LeadStage } from "../modules/lead-funnel/lead-funnel.types";

const LEAD_STATUS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "WON",
  "LOST",
  "SPAM",
  // Stages utilisés par LeadFunnelService (mappés depuis LeadStage)
  "WIZARD_STARTED",
  "DOSSIER_OPENED",
  "PAID",
  "ARCHIVED",
] as const;
type LeadStatus = (typeof LEAD_STATUS)[number];

/** Mapping LeadStage (funnel) → LeadStatus (cc UI). Identique 1:1. */
const FUNNEL_STAGE_TO_STATUS: Record<LeadStage, LeadStatus> = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  WIZARD_STARTED: "WIZARD_STARTED",
  DOSSIER_OPENED: "DOSSIER_OPENED",
  PAID: "PAID",
  LOST: "LOST",
  ARCHIVED: "ARCHIVED",
};

type LeadQualif = {
  status: LeadStatus;
  lastContactAt?: string;
  notes?: { ts: string; author: string; text: string; status?: LeadStatus }[];
};

@Tome("tome9")
@Controller("api/cc")
// SÉCURITÉ : tout le backoffice CC est réservé ADMIN/OWNER/OPS. Guard au niveau
// CLASSE (auparavant seulement sur certaines méthodes → snapshot/media/leads
// exposaient des données — dont des leads avec PII — sans authentification).
// Les méthodes avec un @Roles plus strict (verify/deactivate = ADMIN/OWNER) le conservent.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "OWNER", "OPS")
export class CCController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotService: CCSnapshotService,
    private readonly leadFunnel: LeadFunnelService,
  ) {}

  @Get("snapshot/current")
  snapshotCurrent() {
    return this.snapshotService.current();
  }

  @Get("media")
  media() {
    return {
      items: [
        { id: "m1", title: "500 000 DH : نستثمر ولا نبني؟", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
        { id: "m2", title: "5 أخطاء كتخسر الملايين", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 2, views: 0, leads: 0 },
        { id: "m3", title: "Étape 6: التسوية Terrassement", type: "SHORT", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
        { id: "m4", title: "بئر الرامي : تحليل شامل", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 3, views: 0, leads: 0 },
      ],
    };
  }

  @Get("leads")
  async leads() {
    // 1) Leads issus des dossiers (intake P1–P6 + création admin manuelle)
    const dossiers = await this.prisma.dossier.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, createdAt: true, updatedAt: true, title: true, commune: true, status: true,
        porteType: true, gestionMode: true, payload: true,
        clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true,
        owner: { select: { email: true } },
      },
    });
    const fromDossiers = dossiers.map((d) => extractLeadView(d));

    // 2) Leads issus du funnel public (POST /api/lead-funnel/capture)
    // Le funnel persiste en mémoire + JSON ; il faut les afficher aussi dans /cc/leads
    // sinon les leads de la home page (hero, ROI calc, WhatsApp inbound) sont invisibles.
    let fromFunnel: ReturnType<typeof extractFunnelLeadView>[] = [];
    try {
      const funnelLeads = this.leadFunnel.list({ limit: 200 });
      fromFunnel = funnelLeads.map(extractFunnelLeadView);
    } catch (e) {
      // best-effort : ne jamais casser /cc/leads si le funnel n'est pas dispo
    }

    // 3) Dédupliquer par email (priorité au Dossier qui a plus de contexte)
    const seenEmails = new Set<string>();
    for (const l of fromDossiers) {
      if (l.email) seenEmails.add(l.email.toLowerCase());
    }
    const funnelDedup = fromFunnel.filter((l) => {
      if (!l.email) return true; // sans email on garde (pas de doublon détectable)
      return !seenEmails.has(l.email.toLowerCase());
    });

    // 4) Tri global par createdAt DESC
    const merged = [...fromDossiers, ...funnelDedup].sort(
      (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    );
    return merged;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  @Patch("leads/:id")
  async updateLead(@Param("id") id: string, @Body() body: { status?: LeadStatus; note?: string }, @Req() req: any) {
    const dossier = await this.prisma.dossier.findUniqueOrThrow({ where: { id }, select: { payload: true } });
    const payload: any = (dossier.payload && typeof dossier.payload === "object") ? { ...dossier.payload } : {};
    const qualif: LeadQualif = (payload.leadQualif && typeof payload.leadQualif === "object")
      ? payload.leadQualif as LeadQualif
      : { status: "NEW", notes: [] };

    if (body.status && LEAD_STATUS.includes(body.status)) {
      qualif.status = body.status;
      qualif.lastContactAt = new Date().toISOString();
    }
    if (body.note && body.note.trim()) {
      qualif.notes = qualif.notes || [];
      qualif.notes.push({
        ts: new Date().toISOString(),
        author: req.user?.email || req.user?.userId || "admin",
        text: body.note.trim(),
        status: body.status,
      });
    }
    payload.leadQualif = qualif;

    const updated = await this.prisma.dossier.update({
      where: { id },
      data: { payload },
      select: { id: true, payload: true },
    });
    return { ok: true, leadQualif: (updated.payload as any)?.leadQualif };
  }

  // ── Inscrits Cercles (tous les users avec ProProfile) ──────────

  @Get("inscrits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  async inscrits() {
    const profiles = await this.prisma.proProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        userId: true,
        displayName: true,
        title: true,
        bio: true,
        avatarUrl: true,
        metier: true,
        cabinetName: true,
        cabinetStatus: true,
        cnoaNumero: true,
        yearsExperience: true,
        villePrincipale: true,
        regions: true,
        specialites: true,
        langues: true,
        websiteUrl: true,
        linkedinUrl: true,
        phonePublic: true,
        emailPublic: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true, username: true, phone: true, isActive: true,
            role: true, plan: true, emailVerifiedAt: true, createdAt: true,
          },
        },
      },
    });
    return { ok: true, data: profiles };
  }

  @Patch("inscrits/:userId/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  async verifyInscrit(
    @Param("userId") userId: string,
    @Body() body: { isVerified: boolean; note?: string },
    @Req() req: any,
  ) {
    const updated = await this.prisma.proProfile.update({
      where: { userId },
      data: {
        isVerified: body.isVerified,
        verifiedAt: body.isVerified ? new Date() : null,
        verifierNote: body.note || null,
      },
      select: { id: true, isVerified: true, verifiedAt: true },
    });
    return { ok: true, data: updated };
  }

  @Patch("inscrits/:userId/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  async deactivateInscrit(
    @Param("userId") userId: string,
    @Body() body: { isActive: boolean },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: body.isActive },
      select: { id: true, isActive: true },
    });
    return { ok: true, data: updated };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER", "OPS")
  @Post("leads")
  async createLead(@Body() body: any, @Req() req: any) {
    // Admin manual lead creation. Creates a Dossier in name of admin (or specified owner).
    const ownerId = body.ownerId || req.user?.userId;
    if (!ownerId) throw new Error("ownerId requis");
    const item = await this.prisma.dossier.create({
      data: {
        ownerId,
        title: body.title || body.nom || "Lead manuel",
        commune: body.commune || body.ville || null,
        payload: {
          ...body,
          leadQualif: { status: "NEW", notes: [{ ts: new Date().toISOString(), author: req.user?.email || "admin", text: "Lead créé manuellement par admin" }] },
        } as any,
        porteType: body.porteType || "P1",
        gestionMode: body.gestionMode || "AUTONOME",
        clientNom: body.clientNom || body.nom || null,
        clientEmail: body.clientEmail || body.email || null,
        clientTel: body.clientTel || body.tel || null,
        raisonSociale: body.raisonSociale || null,
      },
      select: { id: true, createdAt: true, title: true, commune: true, porteType: true, payload: true, clientNom: true, clientEmail: true, clientTel: true, raisonSociale: true, owner: { select: { email: true } }, status: true, gestionMode: true, updatedAt: true },
    });
    return extractLeadView(item);
  }
}

function extractLeadView(d: any) {
  const qualif: LeadQualif = (d.payload?.leadQualif && typeof d.payload.leadQualif === "object")
    ? d.payload.leadQualif as LeadQualif
    : { status: "NEW", notes: [] };
  return {
    id: d.id,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    nom: d.clientNom || d.raisonSociale || d.title || "Lead",
    ville: d.commune || "—",
    type: d.porteType || "P1",
    source: d.payload?.source || "SITE",
    status: qualif.status,
    dossierStatus: d.status,
    interet: d.title,
    gestionMode: d.gestionMode,
    email: d.clientEmail || d.owner?.email,
    tel: d.clientTel,
    raisonSociale: d.raisonSociale,
    notesCount: qualif.notes?.length || 0,
    lastContactAt: qualif.lastContactAt,
    lastNote: qualif.notes?.length ? qualif.notes[qualif.notes.length - 1] : null,
    notes: qualif.notes || [],
    brief: d.payload?.brief,
    origin: "DOSSIER" as const,
  };
}

/**
 * Convertit un lead du `LeadFunnelService` (memoire/JSON) vers la même forme
 * que `extractLeadView` afin que le front /cc/leads puisse les afficher uniformement.
 *
 * Différences notables :
 *  - `id` reste l'id funnel (ex: `lead_xxx`) — pas un Dossier id ;
 *  - `dossierStatus` non applicable ;
 *  - `status` est dérivé du `stage` (mapping FUNNEL_STAGE_TO_STATUS) ;
 *  - `origin = "FUNNEL"` permet au front de distinguer (et de gater les actions
 *    qui nécessitent un Dossier, ex: ouverture shadow view).
 */
function extractFunnelLeadView(l: FunnelLead) {
  const status: LeadStatus = FUNNEL_STAGE_TO_STATUS[l.stage] || "NEW";
  // L'extraction des dernieres actions (note libre) depuis events.
  const notesFromEvents = (l.events || [])
    .filter((e) => e.kind === "NOTE" || e.kind === "STAGE_CHANGE")
    .map((e) => ({
      ts: e.at,
      author: "system",
      text:
        e.kind === "STAGE_CHANGE"
          ? `Stage: ${(e.payload as any)?.from ?? "?"} → ${(e.payload as any)?.to ?? "?"}`
          : String((e.payload as any)?.text ?? ""),
    }));
  return {
    id: l.id,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    nom: l.nom,
    ville: l.ville || "—",
    type: (l.projetType as any) || "P1",
    source: l.source || "DIRECT",
    status,
    dossierStatus: undefined as string | undefined,
    interet: l.pageContext,
    gestionMode: undefined as string | undefined,
    email: l.email,
    tel: l.telephone,
    raisonSociale: undefined as string | undefined,
    notesCount: notesFromEvents.length,
    lastContactAt: l.updatedAt,
    lastNote: notesFromEvents.length ? notesFromEvents[notesFromEvents.length - 1] : null,
    notes: notesFromEvents,
    brief: { score: l.score, breakdown: l.scoreBreakdown, utm: l.utm, meta: l.meta },
    origin: "FUNNEL" as const,
  };
}
