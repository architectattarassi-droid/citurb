"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P5PricingService = void 0;
const common_1 = require("@nestjs/common");
const REPORT_DEFINITIONS = {
    ESTIMATION_VENALE: {
        label: "Estimation de valeur vénale",
        shortDesc: "Avis de valeur immobilière justifié et opposable (banque, succession, vente)",
        baseHT: 4500,
        deliveryDays: 10,
        deliverables: [
            "Visite et relevé du bien",
            "Étude de marché comparée (3 références minimum)",
            "Note d'expertise méthodologique",
            "Estimation de valeur fondée (fourchette + valeur centrale)",
            "Rapport PDF signé (15-25 pages)",
        ],
    },
    CONFORMITE_URBANISTIQUE: {
        label: "Conformité urbanistique",
        shortDesc: "Vérification de la conformité du bâti aux règles d'urbanisme et au permis",
        baseHT: 3500,
        deliveryDays: 12,
        deliverables: [
            "Analyse du titre foncier et note de renseignement urbanistique",
            "Vérification COS/CES/hauteur/recul/façades",
            "Comparaison plans autorisés vs réalisé",
            "Identification des écarts et infractions",
            "Rapport PDF avec recommandations de régularisation",
        ],
    },
    RISQUE_TECHNIQUE: {
        label: "Audit de risque (sismique, inondation, sols)",
        shortDesc: "Évaluation des risques naturels et géotechniques affectant le bien",
        baseHT: 5500,
        deliveryDays: 15,
        deliverables: [
            "Étude des aléas (sismique, inondation, glissement)",
            "Consultation des cartes officielles et zonage",
            "Visite et observations terrain",
            "Note de vulnérabilité du bâti",
            "Rapport PDF avec mesures de mitigation",
        ],
    },
    EXPERTISE_BATI: {
        label: "Expertise technique du bâti",
        shortDesc: "État technique complet (vices apparents/cachés, devis travaux à prévoir)",
        baseHT: 4000,
        deliveryDays: 12,
        deliverables: [
            "Diagnostic gros œuvre + second œuvre + équipements techniques",
            "Identification des pathologies (fissures, étanchéité, structure)",
            "Estimation chiffrée des travaux à prévoir",
            "Photos référencées + plans annotés",
            "Rapport PDF expert (20-40 pages)",
        ],
    },
};
const DELAY_COEFFICIENT = {
    EXPRESS: 1.5, // +50% pour délai 5 jours
    STANDARD: 1.0,
    ECONOMIQUE: 0.9, // -10% pour délai 30 jours
};
const DELAY_DAYS = {
    EXPRESS: 5,
    STANDARD: 0, // = baseDeliveryDays
    ECONOMIQUE: 30,
};
const SURFACE_COEFFICIENT = {
    S_0_200: 1.0,
    S_200_500: 1.3,
    S_500_PLUS: 1.6,
};
function deriveSurfaceSlot(surfaceM2) {
    if (surfaceM2 == null || !Number.isFinite(surfaceM2))
        return "S_0_200";
    if (surfaceM2 <= 200)
        return "S_0_200";
    if (surfaceM2 <= 500)
        return "S_200_500";
    return "S_500_PLUS";
}
let P5PricingService = class P5PricingService {
    listReports() {
        return Object.entries(REPORT_DEFINITIONS).map(([code, def]) => ({
            code: code,
            ...def,
        }));
    }
    computeQuote(input) {
        const def = REPORT_DEFINITIONS[input.reportType];
        if (!def)
            throw new Error(`Type de rapport inconnu: ${input.reportType}`);
        const delayMode = input.delayMode ?? "STANDARD";
        const surfaceSlot = input.surfaceSlot ?? deriveSurfaceSlot(input.surfaceM2);
        const surfaceCoef = SURFACE_COEFFICIENT[surfaceSlot];
        const delayCoef = DELAY_COEFFICIENT[delayMode];
        const totalHT = Math.round(def.baseHT * surfaceCoef * delayCoef);
        const tva = Math.round(totalHT * 0.2);
        const totalTTC = totalHT + tva;
        const deliveryDays = delayMode === "STANDARD"
            ? def.deliveryDays
            : DELAY_DAYS[delayMode];
        const surfaceLabels = {
            S_0_200: "≤ 200 m²",
            S_200_500: "200 – 500 m²",
            S_500_PLUS: "≥ 500 m²",
        };
        const delayLabels = {
            EXPRESS: `Express — ${DELAY_DAYS.EXPRESS} jours ouvrables`,
            STANDARD: `Standard — ${def.deliveryDays} jours ouvrables`,
            ECONOMIQUE: `Économique — ${DELAY_DAYS.ECONOMIQUE} jours ouvrables`,
        };
        return {
            ok: true,
            currency: "MAD",
            meta: {
                reportType: input.reportType,
                reportLabel: def.label,
                delayMode,
                delayLabel: delayLabels[delayMode],
                deliveryDays,
                surfaceSlot,
                surfaceLabel: surfaceLabels[surfaceSlot],
            },
            base: {
                baseHT: def.baseHT,
                surfaceCoefficient: surfaceCoef,
                delayCoefficient: delayCoef,
            },
            deliverables: def.deliverables,
            amounts: {
                totalHT,
                tvaRate: 0.2,
                tva,
                totalTTC,
            },
            payment: {
                modalities: "Paiement intégral à la commande, avant lancement de la mission. Rapport remis à réception du paiement.",
            },
            notes: [
                "Tarifs forfaitaires hors déplacements exceptionnels (>50 km du cabinet, facturés en sus).",
                "Le rapport est livré sous format PDF signé numériquement par l'expert.",
                "Délais en jours ouvrables, à compter de la réception du paiement et des documents demandés au client.",
                "Aucune mission de suivi inclus — pour un accompagnement projet voir P1/P2/P3.",
            ],
        };
    }
};
exports.P5PricingService = P5PricingService;
exports.P5PricingService = P5PricingService = __decorate([
    (0, common_1.Injectable)()
], P5PricingService);
