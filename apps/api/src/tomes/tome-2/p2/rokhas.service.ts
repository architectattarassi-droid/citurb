import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../tome-at';

export const ROKHAS_PHASES: Record<number, { label: string; responsable: string }> = {
  1:  { label: 'Saisie de la demande',       responsable: 'architecte' },
  2:  { label: 'Attachement des documents',  responsable: 'architecte' },
  3:  { label: 'Révision & e-signature',     responsable: 'architecte' },
  4:  { label: 'Choix de la commission',     responsable: 'commune' },
  5:  { label: 'Vérification & e-dispatch',  responsable: 'commune' },
  6:  { label: 'Instruction',                responsable: 'commission' },
  7:  { label: 'Ajout de complément',        responsable: 'architecte' },
  8:  { label: 'Décision préalable',         responsable: 'commission' },
  9:  { label: 'Paiement des taxes',         responsable: 'client' },
  10: { label: 'E-signature président',      responsable: 'commune' },
};

// PHASES NON DÉLÉGABLES AU CLIENT — toute action sur ces phases
// nécessite que req.user.role soit 'OWNER' | 'PARTNER' | 'AGENT'
export const PHASES_ARCHITECTE_ONLY = [1, 2, 3, 4, 5, 6, 8, 10];
// Phase 7 (complément) et 9 (paiement taxes) peuvent être déléguées

@Injectable()
export class RokhasService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(dossierId: string): Promise<any> {
    const existing = await this.prisma.rokhasDossier.findUnique({
      where: { dossierId },
      include: {
        phases: { orderBy: { phase: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (existing) return existing;

    return this.prisma.rokhasDossier.create({
      data: {
        dossierId,
        phases: {
          create: Object.entries(ROKHAS_PHASES).map(([phase, info]) => ({
            phase: Number(phase),
            phaseLabel: info.label,
            responsable: info.responsable,
            statut: Number(phase) === 1 ? 'EN_COURS' : 'EN_ATTENTE',
            declenchePar: 'systeme',
          })),
        },
      },
      include: {
        phases: { orderBy: { phase: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async syncFromRokhas(dossierId: string, data: any): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    await this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: {
        refRokhas:          data.refRokhas          ?? rd.refRokhas,
        numDossier:         data.numDossier         ?? rd.numDossier,
        refFoncieres:       data.refFoncieres       ?? rd.refFoncieres,
        typePermis:         data.typePermis         ?? rd.typePermis,
        consistance:        data.consistance        ?? rd.consistance,
        naturProjet:        data.naturProjet        ?? rd.naturProjet,
        typeProjet:         data.typeProjet         ?? rd.typeProjet,
        niveaux:            data.niveaux            ?? rd.niveaux,
        surfaceTerrain:     data.surfaceTerrain     ?? rd.surfaceTerrain,
        surfaceBatie:       data.surfaceBatie       ?? rd.surfaceBatie,
        surfacePlancher:    data.surfacePlancher    ?? rd.surfacePlancher,
        cus:                data.cus                ?? rd.cus,
        cos:                data.cos                ?? rd.cos,
        adresse:            data.adresse            ?? rd.adresse,
        prefecture:         data.prefecture         ?? rd.prefecture,
        commune:            data.commune            ?? rd.commune,
        guichetDepot:       data.guichetDepot       ?? rd.guichetDepot,
        phaseActuelle:      data.phaseActuelle      ?? rd.phaseActuelle,
        statut:             data.statut             ?? rd.statut,
        decisionCommission: data.decisionCommission ?? rd.decisionCommission,
        dateDepot:          data.dateDepot     ? new Date(data.dateDepot)     : rd.dateDepot,
        dateLivraison:      data.dateLivraison ? new Date(data.dateLivraison) : rd.dateLivraison,
        delaiGlobalJours:   data.delaiGlobalJours   ?? rd.delaiGlobalJours,
        clientNom:          data.clientNom          ?? rd.clientNom,
        clientCin:          data.clientCin          ?? rd.clientCin,
        numArrete:          data.numArrete          ?? rd.numArrete,
      },
    });

    // Sync phase history statuts selon phaseActuelle
    const phaseActuelle = data.phaseActuelle ?? rd.phaseActuelle;
    const isTermine = ['LIVRE', 'DEFAVORABLE', 'TERMINE'].includes(data.statut ?? rd.statut);
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => i + 1).map(p => {
        let statut: string;
        if (p < phaseActuelle) statut = 'TERMINE';
        else if (p === phaseActuelle) statut = isTermine ? 'TERMINE' : 'EN_COURS';
        else statut = 'EN_ATTENTE';
        return this.prisma.rokhasPhaseHistory.updateMany({
          where: { rokhasDossierId: rd.id, phase: p },
          data: { statut },
        });
      })
    );

    return this.prisma.rokhasDossier.findUnique({
      where: { id: rd.id },
      include: {
        phases: { orderBy: { phase: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async advancePhase(dossierId: string, toPhase: number, actorId: string, remarques?: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    const now = new Date();
    const currentPhase = rd.phases.find((p: any) => p.phase === rd.phaseActuelle);
    const delaiJours = currentPhase?.dateEntree
      ? Math.ceil((now.getTime() - new Date(currentPhase.dateEntree).getTime()) / 86400000)
      : null;

    await this.prisma.rokhasPhaseHistory.updateMany({
      where: { rokhasDossierId: rd.id, phase: rd.phaseActuelle, statut: 'EN_COURS' },
      data: { dateSortie: now, statut: 'TERMINE', delaiJours },
    });

    await this.prisma.rokhasPhaseHistory.updateMany({
      where: { rokhasDossierId: rd.id, phase: toPhase },
      data: { dateEntree: now, statut: 'EN_COURS', remarques: remarques ?? null, declenchePar: actorId },
    });

    return this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: { phaseActuelle: toPhase },
      include: { phases: { orderBy: { phase: 'asc' } }, documents: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async addDocument(dossierId: string, doc: {
    phase: number; nom: string; type: string;
    urlRokhas?: string; origine?: string; uploadePar?: string;
  }): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    return this.prisma.rokhasDocument.create({
      data: {
        rokhasDossierId: rd.id,
        phase: doc.phase,
        nom: doc.nom,
        type: doc.type,
        origine: doc.origine ?? 'ARCHITECTE',
        urlRokhas: doc.urlRokhas ?? null,
        uploadePar: doc.uploadePar ?? null,
        statut: 'RECUPERE',
        visibleClient: false,
        dateRecuperation: new Date(),
      },
    });
  }

  // ARCHITECTE ONLY — valide un document avant envoi client
  async validateDocument(docId: string, userId: string): Promise<any> {
    return this.prisma.rokhasDocument.update({
      where: { id: docId },
      data: { statut: 'VALIDE_ARCH', dateValidation: new Date(), validePar: userId },
    });
  }

  // ARCHITECTE ONLY — décide d'envoyer au client et rend visible
  async sendDocumentToClient(docId: string): Promise<any> {
    return this.prisma.rokhasDocument.update({
      where: { id: docId },
      data: { statut: 'ENVOYE_CLIENT', dateEnvoiClient: new Date(), visibleClient: true },
    });
  }

  // Vue cockpit architecte — tout sans filtre
  async getPhaseTimeline(dossierId: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    return {
      rokhasDossier: rd,
      phases: rd.phases,
      documents: rd.documents,
      phaseActuelle: rd.phaseActuelle,
      delaiGlobalJours: rd.delaiGlobalJours,
    };
  }

  // Vue client — uniquement ce que l'architecte a validé et rendu visible
  async getClientView(dossierId: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    return {
      numDossier: rd.numDossier,
      typePermis: rd.typePermis,
      consistance: rd.consistance,
      clientNom: rd.clientNom,
      numArrete: rd.numArrete,
      commune: rd.commune,
      prefecture: rd.prefecture,
      phaseActuelle: rd.phaseActuelle,
      statut: rd.statut,
      decisionCommission: rd.decisionCommission,
      dateDepot: rd.dateDepot,
      dateLivraison: rd.dateLivraison,
      delaiGlobalJours: rd.delaiGlobalJours,
      phases: rd.phases.map((p: any) => ({
        phase: p.phase,
        phaseLabel: p.phaseLabel,
        statut: p.statut,
        dateEntree: p.dateEntree,
        dateSortie: p.dateSortie,
        delaiJours: p.delaiJours,
      })),
      documents: rd.documents.filter((d: any) => d.visibleClient).map((d: any) => ({
        id: d.id,
        nom: d.nom,
        type: d.type,
        statut: d.statut,
        dateEnvoiClient: d.dateEnvoiClient,
        urlCiturbarea: d.urlCiturbarea,
      })),
    };
  }

  // ── CLIENT PORTAL ─────────────────────────────────────────────────────────

  // Phases déléguées au maître d'ouvrage (hors plans architecte)
  static readonly PHASES_CLIENT = [7, 9]; // Complément + Paiement taxes
  // Permis d'habiter = dossier séparé géré aussi par le client
  static readonly PHASE_PERMIS_HABITER = 'habiter';

  async submitClientData(dossierId: string, data: {
    phase: number;
    fields: Record<string, any>;
    triggeredBy: string;
  }): Promise<any> {
    const rd = await this.getOrCreate(dossierId);

    // Merge avec les données existantes par phase
    const existing = (rd.clientData as any) || {};
    const merged = {
      ...existing,
      [`phase_${data.phase}`]: {
        ...(existing[`phase_${data.phase}`] || {}),
        ...data.fields,
        submittedAt: new Date().toISOString(),
        submittedBy: data.triggeredBy,
      },
    };

    return this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: {
        clientData: merged,
        pendingRokhasSync: true, // Déclenche la queue Puppeteer
      },
      select: {
        id: true,
        dossierId: true,
        clientData: true,
        pendingRokhasSync: true,
        phaseActuelle: true,
      },
    });
  }

  async getClientData(dossierId: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    return {
      clientData: (rd as any).clientData || {},
      pendingRokhasSync: (rd as any).pendingRokhasSync || false,
      phaseActuelle: rd.phaseActuelle,
      statut: rd.statut,
      refRokhas: rd.refRokhas,
      numDossier: rd.numDossier,
      typePermis: rd.typePermis,
      consistance: rd.consistance,
      clientNom: rd.clientNom,
      clientCin: rd.clientCin,
      numArrete: rd.numArrete,
      commune: rd.commune,
      prefecture: rd.prefecture,
      surfaceTerrain: rd.surfaceTerrain,
      surfaceBatie: rd.surfaceBatie,
      surfacePlancher: rd.surfacePlancher,
      niveaux: rd.niveaux,
      dateDepot: rd.dateDepot,
      dateLivraison: rd.dateLivraison,
      delaiGlobalJours: rd.delaiGlobalJours,
      decisionCommission: rd.decisionCommission,
      phases: rd.phases.map((p: any) => ({
        phase: p.phase,
        phaseLabel: p.phaseLabel,
        statut: p.statut,
        responsable: p.responsable,
        dateEntree: p.dateEntree,
        dateSortie: p.dateSortie,
        delaiJours: p.delaiJours,
        remarques: p.remarques,
      })),
    };
  }

  // Phase 1 & 2 — sauvegarde des données saisies (client ou architecte)
  // Met à jour les champs officiels du RokhasDossier + clientData pour traçabilité
  async saveSaisieData(dossierId: string, fields: Record<string, any>, actorId: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);

    // Bloque si le dossier est déjà en phase commune/commission (>= 4)
    if (rd.phaseActuelle >= 4) {
      throw new Error('Dossier verrouillé — phase commune/commission en cours');
    }

    // Met à jour les champs officiels du dossier
    await this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: {
        clientNom:       fields.clientNom       ?? rd.clientNom,
        clientCin:       fields.clientCin       ?? rd.clientCin,
        consistance:     fields.consistance     ?? rd.consistance,
        naturProjet:     fields.naturProjet     ?? rd.naturProjet,
        typeProjet:      fields.typeProjet      ?? rd.typeProjet,
        niveaux:         fields.niveaux         ?? rd.niveaux,
        surfaceTerrain:  fields.surfaceTerrain != null ? Number(fields.surfaceTerrain) : rd.surfaceTerrain,
        surfaceBatie:    fields.surfaceBatie    != null ? Number(fields.surfaceBatie)   : rd.surfaceBatie,
        surfacePlancher: fields.surfacePlancher != null ? Number(fields.surfacePlancher): rd.surfacePlancher,
        cos:             fields.cos             != null ? Number(fields.cos)            : rd.cos,
        cus:             fields.cus             != null ? Number(fields.cus)            : rd.cus,
        commune:         fields.commune         ?? rd.commune,
        prefecture:      fields.prefecture      ?? rd.prefecture,
        adresse:         fields.adresse         ?? rd.adresse,
        guichetDepot:    fields.guichetDepot    ?? rd.guichetDepot,
        refFoncieres:    fields.refFoncieres    ?? rd.refFoncieres,
        typePermis:      fields.typePermis      ?? rd.typePermis,
        dateDepot:       fields.dateDepot ? new Date(fields.dateDepot) : rd.dateDepot,
      },
    });

    // Traçabilité dans clientData
    const existing = (rd.clientData as any) || {};
    const phaseKey = `phase_${fields._phase || 1}`;
    const merged = {
      ...existing,
      [phaseKey]: { ...fields, submittedAt: new Date().toISOString(), submittedBy: actorId },
    };
    return this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: { clientData: merged },
      select: { id: true, dossierId: true, phaseActuelle: true, clientNom: true, consistance: true },
    });
  }

  // Phase 3 — e-Signature Barid : verrouille phases 1-2, avance à 4, déclenche Rokhas auto
  async signEsign(dossierId: string, actorId: string): Promise<any> {
    const rd = await this.getOrCreate(dossierId);
    if (rd.phaseActuelle >= 4) {
      throw new Error('Dossier déjà transmis à la commune');
    }
    const now = new Date();

    // Termine phases 1, 2, 3
    for (const p of [1, 2, 3]) {
      await this.prisma.rokhasPhaseHistory.updateMany({
        where: { rokhasDossierId: rd.id, phase: p },
        data: { statut: 'TERMINE', dateSortie: now, declenchePar: actorId },
      });
    }
    // Active phase 4
    await this.prisma.rokhasPhaseHistory.updateMany({
      where: { rokhasDossierId: rd.id, phase: 4 },
      data: { statut: 'EN_COURS', dateEntree: now, declenchePar: actorId },
    });

    return this.prisma.rokhasDossier.update({
      where: { id: rd.id },
      data: {
        phaseActuelle: 4,
        statut: 'EN_COURS',
        pendingRokhasSync: true, // Puppeteer va signer sur Rokhas.ma
      },
      include: { phases: { orderBy: { phase: 'asc' } }, documents: { orderBy: { createdAt: 'desc' } } },
    });
  }

  // Retourne les dossiers avec pendingRokhasSync=true (pour le Puppeteer cron)
  async getPendingSyncDossiers(): Promise<any[]> {
    return this.prisma.rokhasDossier.findMany({
      where: { pendingRokhasSync: true },
      include: { dossier: { select: { id: true, title: true, owner: { select: { email: true } } } } },
    });
  }

  async markSyncComplete(rokhasDossierId: string): Promise<void> {
    await this.prisma.rokhasDossier.update({
      where: { id: rokhasDossierId },
      data: { pendingRokhasSync: false },
    });
  }
}
