"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P3PricingService = void 0;
const common_1 = require("@nestjs/common");
/**
 * P3 Pricing Service — Maîtrise d'Ouvrage Déléguée (MOD)
 *
 * Doctrine P3: CITURBAREA pilote le chantier en lieu et place du MO.
 *  - Convocation des intervenants (BET, Bureau de Contrôle, entreprises)
 *  - Coordination détaillée par corps de métier
 *  - Paiements aux entreprises transitent EXCLUSIVEMENT via CITURBAREA (escrow)
 *
 * Pricing: 10% du coût de réalisation du projet HORS honoraires architecte
 * et HORS autres frais (laboratoires, géomètre, BET externe, etc.).
 *
 * Le coût de réalisation = surface_plancher × coût_construction (barème CNOA)
 * (même base que P2 art. 4 contrat type unifié Construction).
 */
// Réutilisation du barème CNOA P2 — un seul source de vérité
const pricing_service_1 = require("../../tome-2/p2/pricing.service");
const HONO_RATE = 0.10; // 10% du coût de réalisation
const TVA_RATE = 0.20;
let P3PricingService = class P3PricingService {
    computeQuote(input) {
        const cat = pricing_service_1.BAREME_CNOA_2021[input.categoryCode];
        if (!cat)
            throw new Error(`Catégorie inconnue : ${input.categoryCode}`);
        if (!cat.validSections.includes(input.section)) {
            throw new Error(`Catégorie ${input.categoryCode} non valide pour section ${input.section}`);
        }
        const surface = Number(input.surfacePlancherM2);
        if (!Number.isFinite(surface) || surface <= 0) {
            throw new Error("surfacePlancherM2 requis et > 0");
        }
        const nbBatiments = Math.max(1, Math.floor(input.nbBatiments ?? 1));
        const coutRealisation = Math.round(surface * cat.costPerM2 * nbBatiments);
        const honorairesHT = Math.round(coutRealisation * HONO_RATE);
        const tva = Math.round(honorairesHT * TVA_RATE);
        const totalTTC = honorairesHT + tva;
        return {
            ok: true,
            currency: "MAD",
            meta: {
                porte: "P3",
                category: input.categoryCode,
                categoryLabel: cat.label,
                section: input.section,
            },
            base: {
                surfacePlancherM2: surface,
                nbBatiments,
                coutConstructionM2: cat.costPerM2,
                coutRealisation,
            },
            honoraires: {
                rate: HONO_RATE,
                ratePct: "10%",
                totalHT: honorairesHT,
                tvaRate: TVA_RATE,
                tva,
                totalTTC,
            },
            escrow: {
                platformOnly: true,
                notice: "Tous les paiements aux entreprises transitent exclusivement via CITURBAREA (escrow plateforme). Les fonds sont libérés par tranches après validation des PV de réception par corps de métier.",
            },
            services: [
                "Convocation et coordination de tous les intervenants (BET, BC, entreprises)",
                "Pilotage détaillé par corps de métier (gros œuvre, second œuvre, finitions, équipements, VRD)",
                "Réunions de chantier hebdomadaires avec PV signés",
                "Ordres de service, levée de réserves, attestations de conformité",
                "Gestion des appels de paiement et libération escrow",
                "Relations administratives (Rokhas, Protection Civile, ONE/ONEP, etc.)",
                "Tableau de bord client temps réel (avancement, photos, documents)",
                "Réception provisoire + définitive + remise des clés",
            ],
            notes: [
                "Honoraires P3 = 10% du coût de réalisation du projet HORS honoraires architecte et HORS autres frais (laboratoires, géomètre, BET externe…).",
                "Coût de réalisation calculé selon barème CNOA Annexe 2 (2021) : surface × coût construction au m² selon catégorie.",
                "Le P3 est une mission complémentaire à P2 (architecte) — cumulable sur le même projet.",
                "Le nombre maximum d'entreprises sur un dossier dépend des corps de métiers nécessaires (jusqu'à 40+ corps possibles selon la complexité).",
            ],
        };
    }
};
exports.P3PricingService = P3PricingService;
exports.P3PricingService = P3PricingService = __decorate([
    (0, common_1.Injectable)()
], P3PricingService);
