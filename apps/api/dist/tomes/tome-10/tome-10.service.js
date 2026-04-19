"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome10FinancingService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Implémentation intentionnellement "safe":
 * - pas de dépendance DB ici (les repos Prisma seront branchés plus tard)
 * - retourne un contrat stable pour le front et pour les agents IA.
 */
let Tome10FinancingService = class Tome10FinancingService {
    /**
     * Eligibilité doctrinale (P1): après au moins un plan payé.
     * En V1, on simplifie: on laisse le contrôleur renvoyer une règle lisible.
     */
    async getEligibility(projectId) {
        return {
            projectId,
            eligible: true,
            rule: "P1: financement accessible après paiement d'un plan (type ou personnalisé).",
            required: [
                "Plan payé (Order=PAID + Entitlement actif)",
                "Consentement client pour usage des données (PII)",
            ],
            next: ["prequal", "build_dossier"],
        };
    }
    /**
     * Pré-qualification: collecte guidée (profil + capacité).
     * Ici on stockera en DB plus tard (T0 DataLakeEntry + T10 FinancingProfile).
     */
    async createOrUpdatePrequal(projectId, payload) {
        return {
            projectId,
            status: "PREQUAL_SAVED",
            payload_redacted: {
                hasHousehold: !!payload?.household,
                hasBudgetHint: typeof payload?.projectBudgetHint === "number",
                cityHint: payload?.cityHint ?? null,
            },
            note: "Préqualification enregistrée (stub). La version DB sera branchée via Prisma + Orchestrator.",
        };
    }
    /**
     * Dossier bancaire prêt à déposer: document pack + checklists.
     * En V1, renvoie un plan de dossier; l'export final ira dans storage (T4).
     */
    async buildBankDossier(projectId, args) {
        return {
            projectId,
            status: "DOSSIER_BUILT_STUB",
            bankPartnerId: args.bankPartnerId ?? "BANK_PARTNER_DEFAULT",
            consent: !!args.consent,
            dossier: {
                sections: [
                    "1) Identité & Situation familiale",
                    "2) Revenus & charges",
                    "3) Projet (plan, surface, localisation, estimation)",
                    "4) Devis & lots (si disponibles)",
                    "5) Garanties & apports",
                    "6) Checklist pièces + déclarations",
                ],
                outputs: [
                    "PDF Dossier bancaire (redacted public)",
                    "Pack pièces (private storage)",
                    "Résumé scoring (DataProduct vendable)",
                ],
            },
            economics: {
                rule: "CITURBAREA prend une marge sur l'intermédiation si le financement est obtenu via partenaire.",
                trigger: "Après plan payé (pas besoin d'attendre autorisation)",
            },
        };
    }
};
exports.Tome10FinancingService = Tome10FinancingService;
exports.Tome10FinancingService = Tome10FinancingService = __decorate([
    (0, common_1.Injectable)()
], Tome10FinancingService);
