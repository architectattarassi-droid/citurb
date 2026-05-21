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
    EXPERTISE_PRIX: {
        code: "EXPERTISE_PRIX",
        label: "Rapport Expertise Prix",
        shortDesc: "Valeur vénale fondée + étude comparée de marché",
        longDesc: "Avis de valeur opposable et justifié, fondé sur une visite terrain, des comparables ventes récents " +
            "et une méthodologie documentée. Livrable PDF signé numériquement par l'expert CITURBAREA.",
        rate: 0.01, // 1.0 % du prix foncier
        minHT: 5000,
        deliveryDays: 10,
        chapters: [
            "Synthèse exécutive — valeur retenue et fourchette",
            "Description du bien et visite terrain",
            "Étude de marché comparée (≥ 3 références ventes)",
            "Méthodologie de l'évaluation (comparaison directe / capitalisation)",
            "Valeur vénale fondée : fourchette + valeur centrale",
            "Annexes : photos, titre foncier, attestations",
        ],
        audience: ["Vendeurs / acquéreurs", "Banques (garantie hypothécaire)", "Successions / partages"],
        signature: "Rapport signé numériquement par l'expert immobilier CITURBAREA.",
    },
    EXPERTISE_URBA: {
        code: "EXPERTISE_URBA",
        label: "Rapport Expertise Urbanistique",
        shortDesc: "Note RU + COS/CES/gabarit + scénarios de constructibilité",
        longDesc: "Analyse réglementaire complète : note de renseignement urbanistique, vérification COS/CES, " +
            "hauteur, recul, façades, et scénarios de constructibilité optimisée. " +
            "Outil de due-diligence pour acquéreurs et investisseurs.",
        rate: 0.005, // 0.5 % du coût de construction
        minHT: 6000,
        deliveryDays: 12,
        chapters: [
            "Synthèse exécutive — verdict de constructibilité",
            "Note de renseignement urbanistique (RU) actualisée",
            "Analyse du PA / PADD / SDAU applicables",
            "COS / CES / hauteur / recul / façades — vérification",
            "Comparaison plans autorisés vs réalisé (si bâti existant)",
            "Scénarios de constructibilité (mini / médian / max)",
            "Recommandations et risques réglementaires",
            "Annexes : extraits cartographiques, titre foncier",
        ],
        audience: ["Promoteurs en phase due-diligence", "Acquéreurs fonciers", "Architectes pour scoping projet"],
        signature: "Rapport signé conjointement par l'urbaniste et l'architecte CITURBAREA.",
    },
    READY_TO_INVEST: {
        code: "READY_TO_INVEST",
        label: "Rapport Complet Premium — Ready-to-Invest",
        shortDesc: "Business Plan bankable complet (BP + ROI + sensibilité)",
        longDesc: "Rapport premium destiné aux banques, fonds d'investissement et family offices. Intègre l'expertise " +
            "prix, l'expertise urbanistique, le programme architectural, la chaîne de coûts complète (acquisition " +
            "+ études + travaux + frais financiers), le prix de vente projeté, le budget total, le ROI / TRI / VAN " +
            "et une analyse de sensibilité. Livrable PDF premium 40-60 pages signé.",
        rate: 0.01, // 1.0 % du montant total d'investissement
        minHT: 18000,
        deliveryDays: 21,
        chapters: [
            "Synthèse exécutive — recommandation investissement",
            "Foncier & acquisition (prix, frais notariés, conservation foncière, viabilité titre)",
            "Expertise urbanistique intégrée (RU, COS/CES, faisabilité, scénarios)",
            "Programme architectural (surfaces, nb logements, mix typologique)",
            "Coût d'études (honoraires architecte CNOA 5 %, BET, géotechnique, contrôle)",
            "Coût de réalisation (estimation travaux selon standing, TVA, aléas 10 %)",
            "Prix de vente projeté (étude marché localisée, scénarios bas / médian / haut)",
            "Budget investissement total (acquisition + études + travaux + frais + aléas)",
            "Rentabilité — Marge brute, TRI, VAN, payback period, multiple fonds propres",
            "Analyse de sensibilité (±10 % prix vente / coût travaux / délai commercialisation)",
            "Plan de financement (apport / dette / quasi-FP, ratios LTV / LTC)",
            "Annexes bankables (plans masse, comparables ventes, attestations expert)",
        ],
        audience: ["Banques de financement", "Fonds d'investissement immobiliers", "Family offices / HNWI", "Business angels"],
        signature: "Rapport co-signé par architecte CNOA + expert immobilier + analyste financier CITURBAREA.",
    },
};
// Migration douce : les anciens codes redirigent vers les 3 nouveaux pour le pricing.
const LEGACY_REMAP = {
    EXPERTISE_PRIX: "EXPERTISE_PRIX",
    EXPERTISE_URBA: "EXPERTISE_URBA",
    READY_TO_INVEST: "READY_TO_INVEST",
    ESTIMATION_VENALE: "EXPERTISE_PRIX",
    CONFORMITE_URBANISTIQUE: "EXPERTISE_URBA",
    RISQUE_TECHNIQUE: "EXPERTISE_URBA",
    EXPERTISE_BATI: "EXPERTISE_PRIX",
};
const DELAY_COEFFICIENT = {
    EXPRESS: 1.4, // +40 %
    STANDARD: 1.0,
    ECONOMIQUE: 0.9, // -10 %
};
const DELAY_LABEL = {
    EXPRESS: "Express",
    STANDARD: "Standard",
    ECONOMIQUE: "Économique",
};
const DELAY_DAYS_DELTA = {
    EXPRESS: 5, // 5 j fixes
    STANDARD: null, // utilise le délai standard du rapport
    ECONOMIQUE: 30, // 30 j fixes
};
/**
 * Bundle discount : si l'utilisateur demande plusieurs rapports en une fois.
 *  - 2 rapports parmi PRIX/URBA → -10 %
 *  - 3 rapports (PRIX + URBA + RTI) → -15 % (RTI inclut déjà PRIX + URBA, donc bundle peu utilisé)
 */
function bundleDiscount(types) {
    const set = new Set(types);
    if (set.size >= 3)
        return 0.15;
    if (set.size === 2)
        return 0.10;
    return 0;
}
let P5PricingService = class P5PricingService {
    listReports() {
        return Object.values(REPORT_DEFINITIONS);
    }
    computeQuote(input) {
        const normalizedCode = LEGACY_REMAP[input.reportType];
        const def = REPORT_DEFINITIONS[normalizedCode];
        if (!def)
            throw new Error(`Type de rapport inconnu: ${input.reportType}`);
        const delayMode = input.delayMode ?? "STANDARD";
        const delayCoef = DELAY_COEFFICIENT[delayMode];
        // Détermine l'assiette selon le rapport
        let assiette = 0;
        let assietteLabel = "";
        let assietteMissing = null;
        if (normalizedCode === "EXPERTISE_PRIX") {
            assiette = Number(input.prixFoncierMAD || 0);
            assietteLabel = "Prix du foncier";
            if (assiette <= 0)
                assietteMissing = "Indiquez le prix d'acquisition du foncier (MAD).";
        }
        else if (normalizedCode === "EXPERTISE_URBA") {
            assiette = Number(input.coutConstructionMAD || 0);
            assietteLabel = "Coût de construction estimé";
            if (assiette <= 0)
                assietteMissing = "Indiquez le coût de construction estimé (MAD).";
        }
        else {
            // READY_TO_INVEST — si montant fourni on l'utilise, sinon on additionne foncier + construction.
            const explicit = Number(input.montantInvestissementMAD || 0);
            const sum = Number(input.prixFoncierMAD || 0) + Number(input.coutConstructionMAD || 0);
            assiette = explicit > 0 ? explicit : sum;
            assietteLabel = "Montant total d'investissement";
            if (assiette <= 0)
                assietteMissing = "Indiquez le montant total d'investissement (ou prix foncier + coût construction).";
        }
        // Calcul brut au pourcentage, plafonné au minimum tarifaire
        const baseRaw = Math.round(assiette * def.rate);
        const baseAfterMin = Math.max(baseRaw, def.minHT);
        const minApplied = baseAfterMin > baseRaw;
        // Bundle
        const bundleCodes = (input.bundleWith || []).map(c => LEGACY_REMAP[c]).filter(Boolean);
        const allBundle = [normalizedCode, ...bundleCodes];
        const discount = bundleDiscount(allBundle);
        const totalHT = Math.round(baseAfterMin * delayCoef * (1 - discount));
        const tva = Math.round(totalHT * 0.2);
        const totalTTC = totalHT + tva;
        const deliveryDays = DELAY_DAYS_DELTA[delayMode] ?? def.deliveryDays;
        return {
            ok: true,
            currency: "MAD",
            meta: {
                reportType: normalizedCode,
                reportLabel: def.label,
                delayMode,
                delayLabel: `${DELAY_LABEL[delayMode]} — ${deliveryDays} jours ouvrables`,
                deliveryDays,
                rate: def.rate,
                assietteLabel,
                assietteMAD: assiette,
            },
            base: {
                ratePercent: def.rate * 100,
                baseRawHT: baseRaw,
                minHT: def.minHT,
                minApplied,
                delayCoefficient: delayCoef,
                bundleDiscount: discount,
            },
            deliverables: def.chapters,
            audience: def.audience,
            signature: def.signature,
            amounts: {
                totalHT,
                tvaRate: 0.2,
                tva,
                totalTTC,
            },
            payment: {
                modalities: "Paiement intégral à la commande, avant lancement de la mission. " +
                    "Le rapport est livré à réception du paiement et des documents requis.",
            },
            notes: [
                `Taux applicable : ${(def.rate * 100).toFixed(2)} % de « ${assietteLabel} ».`,
                minApplied ? `Plancher tarifaire de ${def.minHT.toLocaleString("fr-FR")} DH HT appliqué.` : null,
                discount > 0 ? `Remise bundle multi-rapports appliquée : -${Math.round(discount * 100)} %.` : null,
                "Tarifs hors déplacements exceptionnels (>50 km du cabinet, facturés en sus).",
                "Délais en jours ouvrables, à compter de la réception du paiement et des documents demandés.",
                "Aucune mission de suivi inclus — pour un accompagnement projet voir P1/P2/P3.",
                assietteMissing,
            ].filter((x) => !!x),
        };
    }
};
exports.P5PricingService = P5PricingService;
exports.P5PricingService = P5PricingService = __decorate([
    (0, common_1.Injectable)()
], P5PricingService);
