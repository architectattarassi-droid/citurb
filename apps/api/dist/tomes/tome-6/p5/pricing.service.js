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
const ZONE_PRICE_MID = {
    RURAL: 1200,
    PERIPHERIE: 2800,
    VILLE_MOYENNE: 5000,
    URBAIN: 7500,
    BON_QUARTIER: 11000,
    PREMIUM: 17000,
    PRESTIGE: 27500,
    ULTRA: 40000,
};
/**
 * Multiplicateur destination foncier — un terrain pour immeuble en hauteur capte
 * la rente du COS, donc se vend plus cher au m² qu'un terrain villa dans le même
 * quartier. Calibré sur les écarts observés Rabat Agdal villa 14k vs imm. 25k
 * et Casa Anfa villa 25k vs imm. 40k.
 */
const FONCIER_MULTIPLIER_BY_FAMILY = {
    TERRAIN_NU: 1.0, // hypothèse villa par défaut
    VILLA: 1.0, // R / R+1 / R+2 — COS ≤ 0,6
    PETIT_COLLECTIF: 1.4, // R+1 à R+4 — COS 1-2
    GRAND_COLLECTIF: 1.6, // R+5 et plus — COS 2-4
    EQUIPEMENT: 1.2, // hôtel / école / clinique — souvent terrain commercial
    AMENAGEMENT: 1.0, // rénovation — pas pertinent (pas d'achat foncier)
    AUTRE: 1.0,
};
const STANDING_COST_M2 = {
    economique: 3250,
    moyen: 4500,
    haut: 7500,
    luxe: 13000,
};
/** Frais annexes appliqués à (foncier + construction) pour le calcul d'investissement total.
 *  Inclut : honoraires notaire, conservation foncière, taxes d'enregistrement, frais financiers
 *  initiaux. Calibré marché Maroc — 12 % est un médian conservateur (réalité 10-15 % selon ville). */
const FRAIS_ANNEXES_RATIO = 0.12;
/** Applique des tranches progressives dégressives sur une assiette. */
function applyProgressiveTiers(assiette, tiers) {
    let total = 0;
    let remaining = assiette;
    let lastCap = 0;
    for (const tier of tiers) {
        const cap = tier.upTo ?? Infinity;
        const tranchSize = Math.max(0, Math.min(cap, assiette) - lastCap);
        if (tranchSize <= 0)
            break;
        total += tranchSize * tier.rate;
        lastCap = cap;
        remaining -= tranchSize;
        if (remaining <= 0)
            break;
    }
    return Math.round(total);
}
const REPORT_DEFINITIONS = {
    ESTIMATION_EXPRESS: {
        code: "ESTIMATION_EXPRESS",
        label: "Estimation Express",
        shortDesc: "Avis de valeur rapide, livré sous 48h",
        longDesc: "Estimation rapide de la valeur de votre bien sans visite, basée sur la méthode des comparables ventes récentes dans votre quartier. Idéal pour une décision personnelle (succession, partage, négociation, premier prix). Non opposable bancairement.",
        flatHT: 990, // FORFAIT FIXE — accessible à tous
        minHT: 990,
        deliveryDays: 2,
        chapters: [
            "Synthèse — valeur estimée et fourchette ±10 %",
            "3-5 comparables ventes récentes (mêmes quartier, type, surface)",
            "Méthodologie comparables (sans visite)",
            "Note de fiabilité (limites de l'estimation rapide)",
        ],
        audience: ["Particuliers en réflexion d'achat / vente", "Successions / partages familiaux", "Première estimation rapide"],
        signature: "Estimation signée par CITURBAREA — usage informatif (non opposable bancairement).",
        bankable: false,
    },
    EXPERTISE_PRIX: {
        code: "EXPERTISE_PRIX",
        label: "Rapport Expertise Prix",
        shortDesc: "Valeur vénale fondée + visite terrain + comparables",
        longDesc: "Avis de valeur opposable, fondé sur une visite terrain, des comparables ventes récents et une méthodologie documentée. Utilisable banque / succession / vente.",
        // Tranches dégressives — un appart à 800k DH paiera ~3 700 DH HT, pas 8 000.
        tiers: [
            { upTo: 500_000, rate: 0.005 }, // 0 - 500k : 0,5 %  →  max 2 500
            { upTo: 2_000_000, rate: 0.004 }, // 500k - 2M : 0,4 %
            { upTo: 10_000_000, rate: 0.003 }, // 2M - 10M : 0,3 %
            { upTo: null, rate: 0.002 }, // > 10M : 0,2 %
        ],
        minHT: 1500, // plancher accessible — petit appart < 300k peut commander un vrai rapport
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
        bankable: true,
    },
    EXPERTISE_URBA: {
        code: "EXPERTISE_URBA",
        label: "Rapport Expertise Urbanistique",
        shortDesc: "Note RU + COS/CES/gabarit + scénarios de constructibilité",
        longDesc: "Analyse réglementaire complète : note RU, vérification COS/CES, hauteur, recul, façades, scénarios de constructibilité optimisée.",
        // Tranches dégressives sur le coût de construction estimé
        tiers: [
            { upTo: 500_000, rate: 0.005 }, // 0 - 500k : 0,5 %
            { upTo: 5_000_000, rate: 0.004 }, // 500k - 5M : 0,4 %
            { upTo: 50_000_000, rate: 0.003 }, // 5M - 50M : 0,3 %
            { upTo: null, rate: 0.002 }, // > 50M : 0,2 %
        ],
        minHT: 2500, // accessible à un petit projet
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
        bankable: true,
    },
    READY_TO_INVEST: {
        code: "READY_TO_INVEST",
        label: "Rapport Complet Premium — Ready-to-Invest",
        shortDesc: "Business Plan bankable complet (BP + ROI + sensibilité)",
        longDesc: "Rapport premium destiné aux banques, fonds et family offices. Intègre expertise prix + urba + programme + coûts + prix vente + ROI/TRI/VAN + sensibilité.",
        // Tranches dégressives sur le montant total d'investissement
        tiers: [
            { upTo: 5_000_000, rate: 0.005 }, // 0 - 5M : 0,5 %
            { upTo: 50_000_000, rate: 0.003 }, // 5M - 50M : 0,3 %
            { upTo: 200_000_000, rate: 0.002 }, // 50M - 200M : 0,2 %
            { upTo: null, rate: 0.0015 }, // > 200M : 0,15 %
        ],
        minHT: 15000, // plus accessible qu'avant (était 20 000)
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
        bankable: true,
    },
};
const LEGACY_REMAP = {
    ESTIMATION_EXPRESS: "ESTIMATION_EXPRESS",
    EXPERTISE_PRIX: "EXPERTISE_PRIX",
    EXPERTISE_URBA: "EXPERTISE_URBA",
    READY_TO_INVEST: "READY_TO_INVEST",
    ESTIMATION_VENALE: "EXPERTISE_PRIX",
    CONFORMITE_URBANISTIQUE: "EXPERTISE_URBA",
    RISQUE_TECHNIQUE: "EXPERTISE_URBA",
    EXPERTISE_BATI: "EXPERTISE_PRIX",
};
const DELAY_COEFFICIENT = {
    EXPRESS: 1.4, STANDARD: 1.0, ECONOMIQUE: 0.9,
};
const DELAY_LABEL = {
    EXPRESS: "Express", STANDARD: "Standard", ECONOMIQUE: "Économique",
};
const DELAY_DAYS_DELTA = {
    EXPRESS: 5, STANDARD: null, ECONOMIQUE: 30,
};
function bundleDiscount(types) {
    const set = new Set(types);
    if (set.size >= 3)
        return 0.15;
    if (set.size === 2)
        return 0.10;
    return 0;
}
function estimatePlancher(family, surfaceTerrain, rLevel, nbBatiments) {
    if (family === "TERRAIN_NU")
        return 0;
    if (family === "AMENAGEMENT")
        return surfaceTerrain; // surface du local
    const lvl = rLevel ? Number(String(rLevel).replace(/[^0-9]/g, "")) : 0;
    const niveaux = Number.isFinite(lvl) ? Math.max(0, lvl) : 0;
    // Emprise au sol selon la famille (% du terrain)
    const empriseRatio = family === "VILLA" ? 0.50
        : family === "PETIT_COLLECTIF" ? 0.60
            : family === "GRAND_COLLECTIF" ? 0.65
                : family === "EQUIPEMENT" ? 0.55
                    : 0.50;
    const empriseSol = surfaceTerrain * empriseRatio;
    // RDC + niveaux supérieurs (coefficient 1.1 sur étages courants pour balcons/communs)
    let plancher = empriseSol * (1 + 1.1 * niveaux);
    // Groupement : on multiplie par nombre de bâtiments si fourni
    if (family === "PETIT_COLLECTIF" || family === "GRAND_COLLECTIF") {
        const n = Number(nbBatiments || 1);
        if (Number.isFinite(n) && n > 1)
            plancher = plancher * n;
    }
    return Math.round(plancher);
}
function estimateInternal(input) {
    const hypotheses = [];
    const terrain = Number(input.surfaceTerrainM2 || 0);
    const family = input.bienFamily || "AUTRE";
    const standing = input.standing || "moyen";
    const zone = input.zoneTier || "URBAIN";
    // Plancher : utilise la valeur fournie ou la dérive du terrain
    let plancher = Number(input.surfacePlancherM2 || 0);
    if (plancher <= 0 && terrain > 0 && family !== "TERRAIN_NU") {
        plancher = estimatePlancher(family, terrain, input.rLevel, input.nbBatiments);
        if (plancher > 0) {
            hypotheses.push(`Surface plancher estimée à ${plancher.toLocaleString("fr-FR")} m² (emprise × niveaux × bâtiments).`);
        }
    }
    // Prix foncier : utilise valeur fournie ou estime via terrain × prix zone × multiplicateur destination
    // (un terrain pour immeuble R+5 capte la rente du COS → ~1,6x le prix villa du même quartier)
    let prixFoncier = Number(input.prixFoncierMAD || 0);
    if (prixFoncier <= 0 && terrain > 0) {
        const pxM2Base = ZONE_PRICE_MID[zone];
        const mult = FONCIER_MULTIPLIER_BY_FAMILY[family] ?? 1.0;
        const pxM2 = Math.round(pxM2Base * mult);
        prixFoncier = Math.round(terrain * pxM2);
        const multLabel = mult === 1.0
            ? ""
            : ` × ${mult} (destination ${family.toLowerCase().replace("_", " ")})`;
        hypotheses.push(`Prix foncier estimé : ${terrain.toLocaleString("fr-FR")} m² × ${pxM2Base.toLocaleString("fr-FR")} DH/m² (zone ${zone})${multLabel} = ${prixFoncier.toLocaleString("fr-FR")} DH.`);
    }
    // Coût construction : utilise valeur fournie ou estime via plancher × coût standing
    let coutConstruction = Number(input.coutConstructionMAD || 0);
    if (coutConstruction <= 0 && plancher > 0) {
        const cM2 = STANDING_COST_M2[standing];
        coutConstruction = Math.round(plancher * cM2);
        hypotheses.push(`Coût construction estimé : ${plancher.toLocaleString("fr-FR")} m² × ${cM2.toLocaleString("fr-FR")} DH/m² (standing ${standing}) = ${coutConstruction.toLocaleString("fr-FR")} DH.`);
    }
    // Montant total investissement = explicite OU foncier + construction + frais annexes (12 %)
    // Inclut : honoraires notaire, conservation foncière, taxes d'enregistrement, frais financiers
    // initiaux. 12 % est un médian marché Maroc (réalité 10-15 % selon ville et complexité).
    let montantTotal = Number(input.montantInvestissementMAD || 0);
    if (montantTotal <= 0) {
        const fraisAnnexes = Math.round((prixFoncier + coutConstruction) * FRAIS_ANNEXES_RATIO);
        montantTotal = prixFoncier + coutConstruction + fraisAnnexes;
        if (fraisAnnexes > 0) {
            hypotheses.push(`Frais annexes estimés (notaire, conservation foncière, taxes, frais financiers) : +${Math.round(FRAIS_ANNEXES_RATIO * 100)} % sur foncier + construction = ${fraisAnnexes.toLocaleString("fr-FR")} DH.`);
        }
    }
    return {
        prixFoncierMAD: prixFoncier,
        coutConstructionMAD: coutConstruction,
        montantInvestissementMAD: montantTotal,
        surfacePlancherEstimee: plancher,
        hypotheses,
    };
}
let P5PricingService = class P5PricingService {
    listReports() {
        return Object.values(REPORT_DEFINITIONS);
    }
    /** Expose l'estimation sommaire (pour debug ou aperçu en transparence côté front). */
    estimate(input) {
        return estimateInternal(input);
    }
    computeQuote(input) {
        const normalizedCode = LEGACY_REMAP[input.reportType];
        const def = REPORT_DEFINITIONS[normalizedCode];
        if (!def)
            throw new Error(`Type de rapport inconnu: ${input.reportType}`);
        const delayMode = input.delayMode ?? "STANDARD";
        const delayCoef = DELAY_COEFFICIENT[delayMode];
        // Estimation sommaire en interne : on calcule prix foncier, coût construction
        // et montant total à partir des données descriptives — le client n'a pas à les fournir.
        const estim = estimateInternal(input);
        let assiette = 0;
        let assietteLabel = "";
        let assietteMissing = null;
        let assietteSource = "estimation_interne";
        if (normalizedCode === "ESTIMATION_EXPRESS") {
            // Forfait fixe — pas d'assiette nécessaire
            assiette = estim.prixFoncierMAD || estim.montantInvestissementMAD || 0;
            assietteSource = "estimation_interne";
            assietteLabel = "Valeur estimée du bien";
        }
        else if (normalizedCode === "EXPERTISE_PRIX") {
            // Si le client a fourni un prix foncier explicite, on l'utilise. Sinon estimation.
            assiette = input.prixFoncierMAD && input.prixFoncierMAD > 0 ? input.prixFoncierMAD : estim.prixFoncierMAD;
            assietteSource = input.prixFoncierMAD && input.prixFoncierMAD > 0 ? "client" : "estimation_interne";
            assietteLabel = "Prix du foncier / valeur du bien";
            if (assiette <= 0)
                assietteMissing = "Renseignez au moins la surface du terrain et la tranche de prix de la zone.";
        }
        else if (normalizedCode === "EXPERTISE_URBA") {
            assiette = input.coutConstructionMAD && input.coutConstructionMAD > 0 ? input.coutConstructionMAD : estim.coutConstructionMAD;
            assietteSource = input.coutConstructionMAD && input.coutConstructionMAD > 0 ? "client" : "estimation_interne";
            assietteLabel = "Coût de construction estimé";
            if (assiette <= 0)
                assietteMissing = "Renseignez le terrain et le standing pour estimer le coût de construction.";
        }
        else {
            // READY_TO_INVEST — priorité au montant explicite, sinon notre estimation.
            assiette = input.montantInvestissementMAD && input.montantInvestissementMAD > 0
                ? input.montantInvestissementMAD
                : estim.montantInvestissementMAD;
            assietteSource = input.montantInvestissementMAD && input.montantInvestissementMAD > 0 ? "client" : "estimation_interne";
            assietteLabel = "Montant total d'investissement";
            if (assiette <= 0)
                assietteMissing = "Renseignez terrain + standing + zone — nous calculons l'enveloppe d'investissement.";
        }
        // CALCUL TARIF — forfait fixe OU tranches progressives dégressives
        let baseRaw;
        let breakdown;
        if (def.flatHT != null) {
            baseRaw = def.flatHT;
        }
        else if (def.tiers && def.tiers.length > 0) {
            baseRaw = applyProgressiveTiers(assiette, def.tiers);
            // Détail de calcul par tranche (pour transparence client)
            breakdown = [];
            let lastCap = 0;
            for (const t of def.tiers) {
                const cap = t.upTo ?? Infinity;
                const tranchSize = Math.max(0, Math.min(cap, assiette) - lastCap);
                if (tranchSize <= 0)
                    break;
                breakdown.push({ from: lastCap, to: Math.min(cap, assiette), rate: t.rate, amount: Math.round(tranchSize * t.rate) });
                lastCap = cap;
            }
        }
        else {
            baseRaw = def.minHT;
        }
        const baseAfterMin = Math.max(baseRaw, def.minHT);
        const minApplied = baseAfterMin > baseRaw;
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
                bankable: def.bankable,
                delayMode,
                delayLabel: `${DELAY_LABEL[delayMode]} — ${deliveryDays} jours ouvrables`,
                deliveryDays,
                // pricingModel : 'flat' (forfait) ou 'tiers' (tranches progressives)
                pricingModel: def.flatHT != null ? "flat" : "tiers",
                flatHT: def.flatHT,
                tiers: def.tiers,
                assietteLabel,
                assietteMAD: assiette,
                assietteSource,
            },
            base: {
                baseRawHT: baseRaw,
                minHT: def.minHT,
                minApplied,
                delayCoefficient: delayCoef,
                bundleDiscount: discount,
                // Détail des montants par tranche (transparence client)
                breakdown,
            },
            // Estimation sommaire interne — pour transparence côté client
            estimation: estim,
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
                def.flatHT != null
                    ? `Forfait fixe : ${def.flatHT.toLocaleString("fr-FR")} DH HT — sans calcul progressif.`
                    : `Tarification dégressive par tranches sur « ${assietteLabel} » (modèle cabinets d'expertise immobilière marocains).`,
                assietteSource === "estimation_interne" && def.flatHT == null
                    ? "Assiette calculée par notre estimation sommaire à partir des caractéristiques du bien — le rapport l'affinera précisément."
                    : null,
                assietteSource === "client" && def.flatHT == null ? "Assiette renseignée par le client." : null,
                minApplied ? `Plancher tarifaire de ${def.minHT.toLocaleString("fr-FR")} DH HT appliqué.` : null,
                discount > 0 ? `Remise bundle multi-rapports appliquée : -${Math.round(discount * 100)} %.` : null,
                !def.bankable ? "⚠ Rapport NON opposable bancairement — usage informatif uniquement." : null,
                "Tarifs hors déplacements exceptionnels (>50 km du cabinet, facturés en sus).",
                "Délais en jours ouvrables, à compter de la réception du paiement et des documents demandés.",
                assietteMissing,
            ].filter((x) => !!x),
        };
    }
};
exports.P5PricingService = P5PricingService;
exports.P5PricingService = P5PricingService = __decorate([
    (0, common_1.Injectable)()
], P5PricingService);
