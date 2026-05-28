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
var OpciTokeniseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpciTokeniseService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
/**
 * OpciTokeniseService — Organisme de Placement Collectif Immobilier tokenisé.
 *
 * Conforme loi 70-14 (OPCI) + encadrement AMMC. Tokenisation = registre interne
 * CITURBAREA pour MVP (tokens `OPCI-<offering>-<n>`), hook ERC-1155 placeholder.
 * Plafond souscription MRE 500k MAD (réglementation AMMC à confirmer).
 *
 * Stockage MVP en mémoire process (migration Prisma + on-chain prévue Q1-2027).
 */
let OpciTokeniseService = OpciTokeniseService_1 = class OpciTokeniseService {
    probative;
    logger = new common_1.Logger(OpciTokeniseService_1.name);
    offerings = [];
    souscriptions = [];
    PLAFOND_MRE_MAD = 500_000;
    constructor(probative) {
        this.probative = probative;
        this.offerings = this.seed();
    }
    listOfferings(status) {
        return this.offerings.filter((o) => !status || o.status === status);
    }
    getOffering(id) {
        return this.offerings.find((o) => o.id === id) || null;
    }
    async souscrire(offeringId, userId, nbParts) {
        const o = this.getOffering(offeringId);
        if (!o)
            throw new Error("Offering introuvable");
        if (o.status !== "OUVERT")
            throw new Error(`Offering non ouvert (${o.status})`);
        const restantes = o.nombreParts - o.partsVendues;
        if (nbParts > restantes)
            throw new Error(`Seulement ${restantes} parts disponibles`);
        const montant = nbParts * o.prixPartMad;
        // Plafond AMMC pour MRE/particulier
        const dejaInvesti = this.souscriptions.filter((s) => s.userId === userId && s.offeringId === offeringId).reduce((sum, s) => sum + s.montantMad, 0);
        if (dejaInvesti + montant > this.PLAFOND_MRE_MAD) {
            throw new Error(`Plafond AMMC ${this.PLAFOND_MRE_MAD} MAD dépassé (déjà ${dejaInvesti} sur cet offering)`);
        }
        const startIdx = o.partsVendues + 1;
        const tokenIds = Array.from({ length: nbParts }, (_, i) => `OPCI-${o.id}-${startIdx + i}`);
        const sub = {
            id: (0, crypto_1.randomUUID)(), offeringId, userId, nbParts, montantMad: montant, tokenIds,
            createdAt: new Date().toISOString(),
        };
        o.partsVendues += nbParts;
        if (o.partsVendues >= o.nombreParts)
            o.status = "CLOTURE";
        this.souscriptions.push(sub);
        await this.probative.append({
            kind: "OPCI_SOUSCRIPTION", rule_id: "T4-R-OPCI-001",
            actorId: userId, metadata: { offeringId, nbParts, montant, tokenIds },
        }).catch((e) => this.logger.warn(`ProbativeLog OPCI: ${e?.message}`));
        return sub;
    }
    portfolio(userId) {
        const subs = this.souscriptions.filter((s) => s.userId === userId);
        return subs.map((s) => {
            const o = this.getOffering(s.offeringId);
            return {
                ...s,
                offeringNom: o?.nom,
                ville: o?.ville,
                valeurCouranteMad: s.nbParts * (o?.prixPartMad || 0),
                rendementCibleAnnuelPct: o?.rendementCibleAnnuelPct,
            };
        });
    }
    /** Reporting transparence AMMC (placeholder). */
    auditAmmc(offeringId) {
        const o = this.getOffering(offeringId);
        if (!o)
            return null;
        const subs = this.souscriptions.filter((s) => s.offeringId === offeringId);
        return {
            offeringId, nom: o.nom, agreementAmmcRef: o.agreementAmmcRef || "EN_ATTENTE_AGREMENT",
            nombreParts: o.nombreParts, partsVendues: o.partsVendues,
            capitalLeve: subs.reduce((s, x) => s + x.montantMad, 0),
            nbSouscripteurs: new Set(subs.map((s) => s.userId)).size,
            plafondParInvestisseurMad: this.PLAFOND_MRE_MAD,
            generatedAt: new Date().toISOString(),
        };
    }
    seed() {
        return [
            { id: "opci-anfa-01", nom: "Résidence Anfa Park", descripteur: "Immeuble R+6 résidentiel haut standing, Casablanca-Anfa, 24 appartements loués.", ville: "Casablanca", nombreParts: 1000, partsVendues: 340, prixPartMad: 5000, dureeAnnees: 7, rendementCibleAnnuelPct: 6.5, agreementAmmcRef: "AMMC-OPCI-2026-014", status: "OUVERT", photos: [], createdAt: new Date().toISOString() },
            { id: "opci-gueliz-02", nom: "Gueliz Business Center", descripteur: "Plateau de bureaux R+4 Marrakech-Gueliz, bail commercial 9 ans.", ville: "Marrakech", nombreParts: 800, partsVendues: 120, prixPartMad: 7500, dureeAnnees: 9, rendementCibleAnnuelPct: 7.2, agreementAmmcRef: "AMMC-OPCI-2026-018", status: "OUVERT", photos: [], createdAt: new Date().toISOString() },
            { id: "opci-tanger-03", nom: "Tanger Med Logistics", descripteur: "Entrepôt logistique zone franche Tanger Med, locataire industriel AAA.", ville: "Tanger", nombreParts: 1500, partsVendues: 0, prixPartMad: 4000, dureeAnnees: 10, rendementCibleAnnuelPct: 8.0, status: "DRAFT", photos: [], createdAt: new Date().toISOString() },
        ];
    }
};
exports.OpciTokeniseService = OpciTokeniseService;
exports.OpciTokeniseService = OpciTokeniseService = OpciTokeniseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [probative_log_service_1.ProbativeLogService])
], OpciTokeniseService);
