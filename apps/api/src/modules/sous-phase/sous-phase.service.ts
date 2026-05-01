import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../tomes/tome-at/kernel/prisma/prisma.service';

@Injectable()
export class SousPhaseService {
  constructor(readonly db: PrismaService) {}

  async getDossierComplet(id: string) {
    return this.db.dossier.findUniqueOrThrow({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, role: true } },
        firm: true,
        phaseRecords: { orderBy: { createdAt: 'asc' } },
        sousPhases: {
          orderBy: [{ phaseRef: 'asc' }, { numero: 'asc' }],
          include: { documents: { orderBy: { createdAt: 'asc' } } },
        },
        documents: { orderBy: { uploadedAt: 'desc' } },
        rokhas: {
          include: {
            phases: { orderBy: { phaseNum: 'asc' } },
            documents: { orderBy: { phaseNum: 'asc' } },
          },
        },
      },
    });
  }

  async getSnapshot(dossierId: string, phaseRef: string) {
    const [sousPhases, chats, reunions, devis, factures, historique] = await Promise.all([
      this.db.dossierSousPhase.findMany({ where: { dossierId, phaseRef }, orderBy: { numero: 'asc' }, include: { documents: true } }),
      this.db.phaseChat.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'asc' } }),
      this.db.phaseReunion.findMany({ where: { dossierId, phaseRef }, orderBy: { dateDebut: 'asc' } }),
      this.db.devis.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'desc' } }),
      this.db.facture.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'desc' } }),
      this.db.phaseHistorique.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'desc' } }),
    ]);
    const totalDevis = devis.reduce((s, d) => s + d.montantTTC, 0);
    const totalFacture = factures.reduce((s, f) => s + f.montantTTC, 0);
    const totalPaye = factures.reduce((s, f) => s + f.montantPaye, 0);
    return {
      phaseRef,
      sousPhases,
      chat: { messages: chats, total: chats.length, nonLus: chats.filter(m => !m.lu).length },
      reunions,
      finances: { devis, factures, totalDevis, totalFacture, totalPaye, solde: totalFacture - totalPaye },
      historique,
    };
  }

  async addDocumentToSousPhase(
    sousPhaseId: string,
    file: { originalname: string; filename: string; mimetype: string; size: number; path: string },
    opts: { uploadedBy?: string; uploadedByRole?: string; visibleClient?: boolean; nom?: string },
  ) {
    const sp = await this.db.dossierSousPhase.findUniqueOrThrow({ where: { id: sousPhaseId } });
    const doc = await this.db.sousPhaseDocument.create({
      data: {
        sousPhaseId,
        nom: opts.nom || file.originalname,
        filePath: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        visibleClient: opts.visibleClient !== false,
        uploadePar: opts.uploadedBy || 'admin',
        uploadeParRole: opts.uploadedByRole || 'ADMIN',
        statut: 'UPLOADED',
      } as any,
    });
    await this.log(sp.dossierId, sp.phaseRef ?? '', 'SOUSPHASE_DOC_UPLOADED', opts.uploadedBy, undefined, undefined, {
      sousPhaseId, docId: doc.id, originalName: file.originalname, mimeType: file.mimetype, size: file.size,
    });
    return doc;
  }

  async getDocumentForDownload(docId: string, requesterId?: string, requesterRole?: string) {
    const doc = await this.db.sousPhaseDocument.findUniqueOrThrow({
      where: { id: docId },
      include: { sousPhase: { include: { dossier: { select: { ownerId: true } } } } },
    });
    const ownerId = doc.sousPhase.dossier.ownerId;
    const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'OWNER' || requesterRole === 'OPS';
    const isOwner = requesterId === ownerId;
    if (!isAdmin && !isOwner) throw new Error('Forbidden');
    if (!isAdmin && !doc.visibleClient) throw new Error('Document non visible client');
    return doc;
  }

  async clientValidateSousPhase(sousPhaseId: string, clientId: string) {
    const sp = await this.db.dossierSousPhase.findUniqueOrThrow({
      where: { id: sousPhaseId },
      include: { dossier: { select: { ownerId: true } } },
    });
    if (sp.dossier.ownerId !== clientId) throw new Error('Forbidden');
    if (sp.statut !== 'SOUMISE') throw new Error(`Statut courant ${sp.statut} — validation possible uniquement en SOUMISE`);
    const updated = await this.db.dossierSousPhase.update({
      where: { id: sousPhaseId },
      data: { statut: 'VALIDEE', dateValidation: new Date(), type: 'DEFINITIVE' },
    });
    await this.log(sp.dossierId, sp.phaseRef ?? '', 'CLIENT_VALIDE', clientId, undefined, undefined, { sousPhaseId });
    return updated;
  }

  async clientRejectSousPhase(sousPhaseId: string, clientId: string, note: string) {
    const sp = await this.db.dossierSousPhase.findUniqueOrThrow({
      where: { id: sousPhaseId },
      include: { dossier: { select: { ownerId: true } } },
    });
    if (sp.dossier.ownerId !== clientId) throw new Error('Forbidden');
    if (sp.statut !== 'SOUMISE') throw new Error(`Statut courant ${sp.statut} — rejet possible uniquement en SOUMISE`);
    const updated = await this.db.dossierSousPhase.update({
      where: { id: sousPhaseId },
      data: { statut: 'REJETEE', noteClient: note },
    });
    await this.log(sp.dossierId, sp.phaseRef ?? '', 'CLIENT_REJETE', clientId, undefined, undefined, { sousPhaseId, note });
    return updated;
  }

  async listClientSousPhases(dossierId: string, clientId: string) {
    const dossier = await this.db.dossier.findUniqueOrThrow({ where: { id: dossierId }, select: { ownerId: true } });
    if (dossier.ownerId !== clientId) throw new Error('Forbidden');
    return this.db.dossierSousPhase.findMany({
      where: { dossierId, statut: { in: ['SOUMISE', 'VALIDEE', 'REJETEE'] } },
      orderBy: [{ phaseRef: 'asc' }, { numero: 'asc' }],
      include: {
        documents: {
          where: { visibleClient: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async adminUnblock(dossierId: string, opts: { newStatus?: string; clearOpsNote?: boolean; opsNote?: string; actorId?: string }) {
    const targetStatus = (opts.newStatus as any) || 'DRAFT';
    const updated = await this.db.dossier.update({
      where: { id: dossierId },
      data: {
        status: targetStatus,
        opsNote: opts.clearOpsNote ? null : (opts.opsNote ?? undefined),
      },
      select: { id: true, status: true, opsNote: true, updatedAt: true, ownerId: true },
    });
    await this.log(dossierId, '', 'ADMIN_UNBLOCK', opts.actorId, undefined, undefined, { newStatus: targetStatus, clearOpsNote: !!opts.clearOpsNote });
    return updated;
  }

  async adminPatch(dossierId: string, patch: { opsNote?: string | null; status?: string }, actorId?: string) {
    const updated = await this.db.dossier.update({
      where: { id: dossierId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status as any } : {}),
        ...(patch.opsNote !== undefined ? { opsNote: patch.opsNote } : {}),
      },
      select: { id: true, status: true, opsNote: true, updatedAt: true },
    });
    await this.log(dossierId, '', 'ADMIN_PATCH', actorId, undefined, undefined, { patch });
    return updated;
  }

  async createSousPhase(dossierId: string, phaseRef: string, titre?: string, notePrestataire?: string, createdById?: string) {
    const last = await this.db.dossierSousPhase.findFirst({ where: { dossierId, phaseRef }, orderBy: { numero: 'desc' } });
    const numero = (last?.numero ?? 0) + 1;
    const sp = await this.db.dossierSousPhase.create({
      data: { dossierId, phaseRef, numero, label: titre ?? `Version ${numero}`, titre: titre ?? `Version ${numero}`, notePrestataire, createdById, statut: 'EN_COURS', type: 'PROVISOIRE' },
      include: { documents: true },
    });
    await this.log(dossierId, phaseRef, 'SOUSPHASE_CREEE', createdById, undefined, undefined, { id: sp.id, numero });
    return sp;
  }

  async updateSousPhase(id: string, data: any) {
    const sp = await this.db.dossierSousPhase.findUniqueOrThrow({ where: { id } });
    const updated = await this.db.dossierSousPhase.update({
      where: { id },
      data: {
        ...data,
        acteurId: undefined,
        ...(data.statut === 'SOUMISE' && { dateSoumission: new Date() }),
        ...(data.statut === 'VALIDEE' && { dateValidation: new Date(), type: 'DEFINITIVE' }),
        ...(data.statut === 'TERMINEE' && { dateFin: new Date() }),
      },
      include: { documents: true },
    });
    await this.log(sp.dossierId, sp.phaseRef ?? '', `SOUSPHASE_${data.statut ?? 'MODIFIEE'}`, data.acteurId, undefined, undefined, { id });
    return updated;
  }

  async chat(dossierId: string, phaseRef: string, expediteurId: string, expediteurRole: string, contenu: string, opts?: any) {
    return this.db.phaseChat.create({ data: { dossierId, phaseRef, expediteurId, expediteurRole, contenu, ...opts } });
  }

  async getChats(dossierId: string, phaseRef: string) {
    return this.db.phaseChat.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'asc' } });
  }

  async markRead(dossierId: string, phaseRef: string, userId: string) {
    await this.db.phaseChat.updateMany({
      where: { dossierId, phaseRef, lu: false, expediteurId: { not: userId } },
      data: { lu: true, luAt: new Date() },
    });
  }

  async createReunion(dossierId: string, phaseRef: string, data: any, organisateurId?: string) {
    const r = await this.db.phaseReunion.create({
      data: { dossierId, phaseRef, titre: data.titre, type: data.type ?? 'PRESENTIEL', statut: data.statut ?? 'PLANIFIEE', dateDebut: new Date(data.dateDebut), dureeMinutes: data.dureeMinutes, lieu: data.lieu, lienVisio: data.lienVisio, noteOrdreJour: data.noteOrdreJour, participants: data.participants ?? [], organisateurId },
    });
    await this.log(dossierId, phaseRef, 'REUNION_PLANIFIEE', organisateurId, undefined, undefined, { type: data.type, titre: data.titre });
    return r;
  }

  async listReunions(dossierId: string, phaseRef?: string) {
    return this.db.phaseReunion.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { dateDebut: 'asc' } });
  }

  async updateReunion(id: string, data: any) {
    return this.db.phaseReunion.update({ where: { id }, data });
  }

  async createDevis(dossierId: string, phaseRef: string, emetteurId: string, titre: string, lignes: any[], opts?: any) {
    const ht = lignes.reduce((s: number, l: any) => s + l.quantite * l.prixUnitaire, 0);
    const tva = opts?.tva ?? 20;
    const count = await this.db.devis.count({ where: { dossierId } });
    const numero = `DEV-${dossierId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
    const dv = await this.db.devis.create({
      data: { dossierId, phaseRef, numero, titre, lignes, montantHT: ht, tva, montantTTC: ht * (1 + tva / 100), emetteurId },
    });
    await this.log(dossierId, phaseRef, 'DEVIS_CREE', emetteurId, undefined, undefined, { numero, montantTTC: dv.montantTTC });
    return dv;
  }

  async listDevis(dossierId: string, phaseRef?: string) {
    return this.db.devis.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
  }

  async updateDevisStatut(id: string, statut: string, note?: string) {
    return this.db.devis.update({
      where: { id },
      data: { statut, ...(statut === 'ACCEPTE' && { dateAcceptation: new Date() }), ...(statut === 'REFUSE' && { dateRefus: new Date(), noteRefus: note }) },
    });
  }

  async createFacture(dossierId: string, phaseRef: string, emetteurId: string, titre: string, lignes: any[], opts?: any) {
    const ht = lignes.reduce((s: number, l: any) => s + l.quantite * l.prixUnitaire, 0);
    const tva = opts?.tva ?? 20;
    const count = await this.db.facture.count({ where: { dossierId } });
    const numero = `FAC-${dossierId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
    const fac = await this.db.facture.create({
      data: { dossierId, phaseRef, numero, titre, lignes, montantHT: ht, tva, montantTTC: ht * (1 + tva / 100), emetteurId },
    });
    await this.log(dossierId, phaseRef, 'FACTURE_EMISE', emetteurId, undefined, undefined, { numero, montantTTC: fac.montantTTC });
    return fac;
  }

  async listFactures(dossierId: string, phaseRef?: string) {
    return this.db.facture.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
  }

  async paiement(id: string, montantPaye: number, modePaiement: string, reference?: string) {
    const f = await this.db.facture.findUniqueOrThrow({ where: { id } });
    return this.db.facture.update({
      where: { id },
      data: { montantPaye, modePaiement, reference, datePaiement: new Date(), statut: montantPaye >= f.montantTTC ? 'PAYEE' : 'PARTIELLEMENT_PAYEE' },
    });
  }

  async getHistorique(dossierId: string, phaseRef?: string) {
    return this.db.phaseHistorique.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
  }

  async log(dossierId: string, phaseRef: string, action: string, acteurId?: string, acteurRole?: string, acteurNom?: string, details?: any) {
    return this.db.phaseHistorique.create({ data: { dossierId, phaseRef, action, acteurId, acteurRole, acteurNom, details } });
  }
}
