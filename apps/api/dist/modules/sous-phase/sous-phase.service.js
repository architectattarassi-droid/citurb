"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SousPhaseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
let SousPhaseService = class SousPhaseService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getDossierComplet(id) {
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
    async getSnapshot(dossierId, phaseRef) {
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
    async createSousPhase(dossierId, phaseRef, titre, notePrestataire, createdById) {
        const last = await this.db.dossierSousPhase.findFirst({ where: { dossierId, phaseRef }, orderBy: { numero: 'desc' } });
        const numero = (last?.numero ?? 0) + 1;
        const sp = await this.db.dossierSousPhase.create({
            data: { dossierId, phaseRef, numero, label: titre ?? `Version ${numero}`, titre: titre ?? `Version ${numero}`, notePrestataire, createdById, statut: 'EN_COURS', type: 'PROVISOIRE' },
            include: { documents: true },
        });
        await this.log(dossierId, phaseRef, 'SOUSPHASE_CREEE', createdById, undefined, undefined, { id: sp.id, numero });
        return sp;
    }
    async updateSousPhase(id, data) {
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
    async chat(dossierId, phaseRef, expediteurId, expediteurRole, contenu, opts) {
        return this.db.phaseChat.create({ data: { dossierId, phaseRef, expediteurId, expediteurRole, contenu, ...opts } });
    }
    async getChats(dossierId, phaseRef) {
        return this.db.phaseChat.findMany({ where: { dossierId, phaseRef }, orderBy: { createdAt: 'asc' } });
    }
    async markRead(dossierId, phaseRef, userId) {
        await this.db.phaseChat.updateMany({
            where: { dossierId, phaseRef, lu: false, expediteurId: { not: userId } },
            data: { lu: true, luAt: new Date() },
        });
    }
    async createReunion(dossierId, phaseRef, data, organisateurId) {
        const r = await this.db.phaseReunion.create({
            data: { dossierId, phaseRef, titre: data.titre, type: data.type ?? 'PRESENTIEL', statut: data.statut ?? 'PLANIFIEE', dateDebut: new Date(data.dateDebut), dureeMinutes: data.dureeMinutes, lieu: data.lieu, lienVisio: data.lienVisio, noteOrdreJour: data.noteOrdreJour, participants: data.participants ?? [], organisateurId },
        });
        await this.log(dossierId, phaseRef, 'REUNION_PLANIFIEE', organisateurId, undefined, undefined, { type: data.type, titre: data.titre });
        return r;
    }
    async listReunions(dossierId, phaseRef) {
        return this.db.phaseReunion.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { dateDebut: 'asc' } });
    }
    async updateReunion(id, data) {
        return this.db.phaseReunion.update({ where: { id }, data });
    }
    async createDevis(dossierId, phaseRef, emetteurId, titre, lignes, opts) {
        const ht = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
        const tva = opts?.tva ?? 20;
        const count = await this.db.devis.count({ where: { dossierId } });
        const numero = `DEV-${dossierId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
        const dv = await this.db.devis.create({
            data: { dossierId, phaseRef, numero, titre, lignes, montantHT: ht, tva, montantTTC: ht * (1 + tva / 100), emetteurId },
        });
        await this.log(dossierId, phaseRef, 'DEVIS_CREE', emetteurId, undefined, undefined, { numero, montantTTC: dv.montantTTC });
        return dv;
    }
    async listDevis(dossierId, phaseRef) {
        return this.db.devis.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
    }
    async updateDevisStatut(id, statut, note) {
        return this.db.devis.update({
            where: { id },
            data: { statut, ...(statut === 'ACCEPTE' && { dateAcceptation: new Date() }), ...(statut === 'REFUSE' && { dateRefus: new Date(), noteRefus: note }) },
        });
    }
    async createFacture(dossierId, phaseRef, emetteurId, titre, lignes, opts) {
        const ht = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
        const tva = opts?.tva ?? 20;
        const count = await this.db.facture.count({ where: { dossierId } });
        const numero = `FAC-${dossierId.slice(-6).toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
        const fac = await this.db.facture.create({
            data: { dossierId, phaseRef, numero, titre, lignes, montantHT: ht, tva, montantTTC: ht * (1 + tva / 100), emetteurId },
        });
        await this.log(dossierId, phaseRef, 'FACTURE_EMISE', emetteurId, undefined, undefined, { numero, montantTTC: fac.montantTTC });
        return fac;
    }
    async listFactures(dossierId, phaseRef) {
        return this.db.facture.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
    }
    async paiement(id, montantPaye, modePaiement, reference) {
        const f = await this.db.facture.findUniqueOrThrow({ where: { id } });
        return this.db.facture.update({
            where: { id },
            data: { montantPaye, modePaiement, reference, datePaiement: new Date(), statut: montantPaye >= f.montantTTC ? 'PAYEE' : 'PARTIELLEMENT_PAYEE' },
        });
    }
    async getHistorique(dossierId, phaseRef) {
        return this.db.phaseHistorique.findMany({ where: { dossierId, ...(phaseRef ? { phaseRef } : {}) }, orderBy: { createdAt: 'desc' } });
    }
    async log(dossierId, phaseRef, action, acteurId, acteurRole, acteurNom, details) {
        return this.db.phaseHistorique.create({ data: { dossierId, phaseRef, action, acteurId, acteurRole, acteurNom, details } });
    }
};
exports.SousPhaseService = SousPhaseService;
exports.SousPhaseService = SousPhaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SousPhaseService);
