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
var AvanceTresorerieService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvanceTresorerieService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
/**
 * AvanceTresorerieService — avance de trésorerie sur situation de travaux.
 *
 * Persona Brahim : "Phase fondation finie, promoteur paie à 60j. Vendredi je
 * dois payer mes ouvriers. Avancez-moi 70% sur ma réputation."
 *
 * Scoring réputation basé sur l'historique CITURBAREA (pas de banque).
 * Frais 0.5%/mois. Statut PENDING_OPS_REVIEW → ACCEPTED → DISBURSED → REPAID.
 */
let AvanceTresorerieService = AvanceTresorerieService_1 = class AvanceTresorerieService {
    prisma;
    probative;
    logger = new common_1.Logger(AvanceTresorerieService_1.name);
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
    }
    /** Calcule le score de réputation d'un user (0-100). */
    async computeReputation(userId) {
        const breakdown = {};
        let score = 0;
        const dossiers = await this.prisma.dossier.findMany({ where: { ownerId: userId }, take: 100 }).catch(() => []);
        const livresCount = dossiers.filter((d) => ["DELIVERED", "RECEPTION", "COMPLETED"].includes(d.status)).length;
        if (livresCount > 5) {
            score += 20;
            breakdown.chantiersLivres = 20;
        }
        else if (livresCount > 0) {
            score += 10;
            breakdown.chantiersLivres = 10;
        }
        // 0 incident grave 12 mois
        const incidentsGraves = dossiers.reduce((acc, d) => {
            const inc = (d.payload?.incidents || []).filter((i) => i.severite === "CRITIQUE" || i.severite === "GRAVE");
            return acc + inc.length;
        }, 0);
        if (incidentsGraves === 0) {
            score += 15;
            breakdown.zeroIncidentGrave = 15;
        }
        // paiements clients à temps (proxy : dossiers avec packValidation ACTIVATED)
        const paid = dossiers.filter((d) => d.payload?.packValidation?.status === "ACTIVATED").length;
        const ratioPaid = dossiers.length > 0 ? paid / dossiers.length : 0;
        if (ratioPaid > 0.8) {
            score += 15;
            breakdown.paiementsATemps = 15;
        }
        else if (ratioPaid > 0.5) {
            score += 8;
            breakdown.paiementsATemps = 8;
        }
        // ancienneté (proxy : nombre total dossiers)
        if (dossiers.length >= 10) {
            score += 10;
            breakdown.anciennete = 10;
        }
        const eligible = score >= 40;
        const plafondPct = eligible ? Math.min(70, Math.round(score * 0.7)) : 0;
        return { score, breakdown, eligible, plafondPct };
    }
    /** Demande une avance sur une situation validée. */
    async demander(input) {
        const rep = await this.computeReputation(input.userId);
        if (!rep.eligible)
            throw new Error(`Non éligible (score réputation ${rep.score}/100, seuil 40)`);
        const plafond = Math.round(input.montantSituationMad * (rep.plafondPct / 100));
        if (input.montantDemandeMad > plafond) {
            throw new Error(`Montant demandé ${input.montantDemandeMad} > plafond ${plafond} MAD (${rep.plafondPct}% de la situation)`);
        }
        const moisEstimes = Math.max(1, Math.ceil(input.delaiPaiementClientJours / 30));
        const fraisPct = 0.5 * moisEstimes;
        const frais = Math.round(input.montantDemandeMad * (fraisPct / 100));
        const { dossier, payload } = await this.read(input.dossierId);
        const avances = payload.avancesTresorerie || [];
        const avance = {
            id: (0, crypto_1.randomUUID)(),
            dossierId: input.dossierId,
            userId: input.userId,
            situationId: input.situationId,
            montantSituationMad: input.montantSituationMad,
            montantDemandeMad: input.montantDemandeMad,
            plafondMad: plafond,
            reputationScore: rep.score,
            moisEstimes,
            fraisPct,
            fraisMad: frais,
            montantNetMad: input.montantDemandeMad - frais,
            delaiPaiementClientJours: input.delaiPaiementClientJours,
            status: "PENDING_OPS_REVIEW",
            createdAt: new Date().toISOString(),
        };
        avances.push(avance);
        payload.avancesTresorerie = avances;
        await this.prisma.dossier.update({ where: { id: input.dossierId }, data: { payload } });
        return avance;
    }
    async accepter(dossierId, avanceId) {
        return this.transition(dossierId, avanceId, "ACCEPTED", "AVANCE_ACCEPTED");
    }
    async disburser(dossierId, avanceId) {
        return this.transition(dossierId, avanceId, "DISBURSED", "AVANCE_DISBURSED");
    }
    async rembourser(dossierId, avanceId) {
        return this.transition(dossierId, avanceId, "REPAID", "AVANCE_REPAID");
    }
    async transition(dossierId, avanceId, status, kind) {
        const { payload } = await this.read(dossierId);
        const avances = payload.avancesTresorerie || [];
        const a = avances.find((x) => x.id === avanceId);
        if (!a)
            throw new Error("Avance introuvable");
        a.status = status;
        a[`${status.toLowerCase()}At`] = new Date().toISOString();
        payload.avancesTresorerie = avances;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        await this.probative.append({
            kind, rule_id: "T3-R-AVANCE-001", projectId: dossierId, actorId: a.userId,
            metadata: { avanceId, status, montant: a.montantNetMad },
        }).catch((e) => this.logger.warn(`ProbativeLog avance: ${e?.message}`));
        return a;
    }
    async listForDossier(dossierId) {
        const { payload } = await this.read(dossierId);
        return payload.avancesTresorerie || [];
    }
    async read(dossierId) {
        const dossier = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
        if (!dossier)
            throw new Error(`Dossier introuvable: ${dossierId}`);
        return { dossier, payload: dossier.payload || {} };
    }
};
exports.AvanceTresorerieService = AvanceTresorerieService;
exports.AvanceTresorerieService = AvanceTresorerieService = AvanceTresorerieService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], AvanceTresorerieService);
