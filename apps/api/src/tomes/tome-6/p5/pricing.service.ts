import { Injectable } from "@nestjs/common";

/**
 * P5 Pricing Service — Rapports d'expertise (refonte v3)
 *
 * Doctrine v3 — 3 rapports premium au pourcentage :
 *
 *   EXPERTISE_PRIX     = 1.0 % du prix foncier
 *   EXPERTISE_URBA     = 0.5 % du coût de construction
 *   READY_TO_INVEST    = 1.0 % du montant total d'investissement (BP bankable)
 *
 * **UX CRITIQUE** : le client vient justement pour OBTENIR l'estimation. On ne
 * peut pas lui demander de connaître son prix foncier ou son coût de construction
 * (sinon il n'a pas besoin du rapport). Le client renseigne donc des données
 * DESCRIPTIVES (terrain m², type de projet, R+, standing, tranche de zone) et
 * c'est nous qui calculons en interne une estimation sommaire qui sert d'assiette
 * au devis du rapport.
 *
 * Le rapport final affinera/validera cette estimation : c'est précisément ce que
 * le client paie. Le devis lui-même est calculé à partir de notre estimation
 * pour rester proportionné à l'enjeu du projet.
 *
 * Planchers tarifaires (anti-dumping) :
 *   - EXPERTISE_PRIX : min 5 000 DH HT
 *   - EXPERTISE_URBA : min 6 000 DH HT
 *   - READY_TO_INVEST : min 18 000 DH HT
 */

export type P5ReportType =
  | "EXPERTISE_PRIX"
  | "EXPERTISE_URBA"
  | "READY_TO_INVEST"
  // Anciens codes (compat) — remappés vers les nouveaux pour le pricing.
  | "ESTIMATION_VENALE"
  | "CONFORMITE_URBANISTIQUE"
  | "RISQUE_TECHNIQUE"
  | "EXPERTISE_BATI";

export type P5DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";

/**
 * Tranche de prix au m² du foncier — calibré sur les vrais prix marché Maroc
 * 2025-2026 (sources : Agenz, Yakeey, Mubawab, Sarouty, KNA Agence).
 *
 * Le marché marocain a un écart fort entre villes : un foncier à Marrakech
 * Targa (2 500-4 500 DH/m²) ≠ Casablanca Maarif (13 000-18 000 DH/m²) ≠
 * Casablanca Anfa (20 000-27 000 DH/m²) ≠ Rabat Souissi haut (30 000-50 000 DH/m²).
 * On retient 6 tranches plutôt que 5 pour mieux capter la diversité.
 */
export type P5ZoneTier =
  | "RURAL"          //   300 -   900 DH/m²   (rural, périurbain agricole, terrains éloignés)
  | "VILLE_MOYENNE"  // 1 000 - 1 800 DH/m²   (Kénitra, El Jadida, Mohammedia, Settat, Témara périphérie)
  | "URBAIN"         // 2 500 - 5 500 DH/m²   (Marrakech périphérie/Targa, Tanger, Agadir, Fès, Casa banlieue moyenne)
  | "BON_QUARTIER"   // 6 000 -12 000 DH/m²   (Casa Maarif moyen, Rabat Agdal moyen, Marrakech Guéliz)
  | "PREMIUM"        //15 000 -22 000 DH/m²   (Casa Anfa/CIL, Rabat Hassan, Marrakech Hivernage)
  | "ULTRA";         //27 000 -50 000 DH/m²   (Casa Corniche/Ain Diab, Rabat Souissi haut, Tanger Marina)

const ZONE_PRICE_MID: Record<P5ZoneTier, number> = {
  RURAL: 600,
  VILLE_MOYENNE: 1400,
  URBAIN: 4000,
  BON_QUARTIER: 9000,
  PREMIUM: 18500,
  ULTRA: 38000,
};

/**
 * Coût de construction au m² selon standing — recalibré marché Maroc 2025-2026.
 * Inclut gros œuvre + second œuvre + finitions (hors architecte CNOA, hors VRD).
 *
 * Sources : Fadil Group, Tachrone, CB Signature, Francobat, KNA, programmes-immobilier.
 *
 * Médianes :
 *   économique  3 250 DH/m²  (logements sociaux conventionnés)
 *   moyen       4 500 DH/m²  (carrelage, PVC, peinture, sanitaires standards)
 *   haut        7 500 DH/m²  (marbre, zellige, menuiseries alu, domotique basique)
 *   luxe       13 000 DH/m²  (architecture sur mesure, bois noble, domotique intégrale)
 */
export type P5StandingTier = "economique" | "moyen" | "haut" | "luxe";
const STANDING_COST_M2: Record<P5StandingTier, number> = {
  economique: 3250,
  moyen: 4500,
  haut: 7500,
  luxe: 13000,
};

/** Frais annexes appliqués à (foncier + construction) pour le calcul d'investissement total.
 *  Inclut : honoraires notaire, conservation foncière, taxes d'enregistrement, frais financiers
 *  initiaux. Calibré marché Maroc — 12 % est un médian conservateur (réalité 10-15 % selon ville). */
const FRAIS_ANNEXES_RATIO = 0.12;

/** Famille de bien — pilote le calcul du plancher estimé à partir du terrain. */
export type P5BienFamily =
  | "TERRAIN_NU"        // pas de construction prévue
  | "VILLA"             // R / R+1 / R+2 — emprise ~40-60% du terrain
  | "PETIT_COLLECTIF"   // R+1 à R+4 — emprise + niveaux
  | "GRAND_COLLECTIF"   // R+5+ — emprise + niveaux
  | "EQUIPEMENT"        // EPIG (hôtel, école, hangar…) — plancher saisi
  | "AMENAGEMENT"       // local existant — surface saisie
  | "AUTRE";

export type P5QuoteInput = {
  reportType: P5ReportType;
  delayMode?: P5DelayMode;

  // ── Inputs descriptifs (le client donne ce qu'il sait, on estime le reste) ──
  bienFamily?: P5BienFamily;
  surfaceTerrainM2?: number;       // terrain (m²)
  surfacePlancherM2?: number;      // plancher si déjà connu (sinon estimé)
  rLevel?: string;                 // "R0" | "R1" | ... | "R8" (info)
  standing?: P5StandingTier;       // pour coût construction
  zoneTier?: P5ZoneTier;           // pour prix foncier au m²
  nbBatiments?: number;            // si groupement

  // ── Inputs financiers (optionnels — si le client les connaît, on les utilise) ──
  prixFoncierMAD?: number;
  coutConstructionMAD?: number;
  montantInvestissementMAD?: number;

  // Bundle multi-rapports
  bundleWith?: P5ReportType[];
};

type ReportDef = {
  code: P5ReportType;
  label: string;
  shortDesc: string;
  longDesc: string;
  rate: number;
  minHT: number;
  deliveryDays: number;
  chapters: string[];
  audience: string[];
  signature: string;
};

const REPORT_DEFINITIONS: Record<"EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST", ReportDef> = {
  EXPERTISE_PRIX: {
    code: "EXPERTISE_PRIX",
    label: "Rapport Expertise Prix",
    shortDesc: "Valeur vénale fondée + étude comparée de marché",
    longDesc: "Avis de valeur opposable, fondé sur une visite terrain, des comparables ventes récents et une méthodologie documentée.",
    rate: 0.01,
    // Marché Maroc 2025 : cabinets pratiquent 4 000 - 10 000 DH HT (médiane 6 500-8 000).
    // On cale le plancher à 6 000 pour rester dans la médiane basse, compétitif.
    minHT: 6000,
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
    longDesc: "Analyse réglementaire complète : note RU, vérification COS/CES, hauteur, recul, façades, scénarios de constructibilité optimisée.",
    rate: 0.005,
    // Marché Maroc 2025 : 5 000 - 12 000 DH HT (inféré, données limitées publiquement).
    // Plancher 7 500 pour intégrer la complexité réglementaire marocaine.
    minHT: 7500,
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
    longDesc: "Rapport premium destiné aux banques, fonds et family offices. Intègre expertise prix + urba + programme + coûts + prix vente + ROI/TRI/VAN + sensibilité.",
    rate: 0.01,
    // Marché Maroc 2025 : pas de benchmark public fiable pour ce type de rapport.
    // Estimations cabinets de prestige (JLL, CBRE, Agenz, Cushman) : 15 000-30 000+ DH HT.
    // Plancher 20 000 pour s'aligner sur les cabinets institutionnels, qualité bankable.
    minHT: 20000,
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

const LEGACY_REMAP: Record<P5ReportType, "EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST"> = {
  EXPERTISE_PRIX: "EXPERTISE_PRIX",
  EXPERTISE_URBA: "EXPERTISE_URBA",
  READY_TO_INVEST: "READY_TO_INVEST",
  ESTIMATION_VENALE: "EXPERTISE_PRIX",
  CONFORMITE_URBANISTIQUE: "EXPERTISE_URBA",
  RISQUE_TECHNIQUE: "EXPERTISE_URBA",
  EXPERTISE_BATI: "EXPERTISE_PRIX",
};

const DELAY_COEFFICIENT: Record<P5DelayMode, number> = {
  EXPRESS: 1.4, STANDARD: 1.0, ECONOMIQUE: 0.9,
};
const DELAY_LABEL: Record<P5DelayMode, string> = {
  EXPRESS: "Express", STANDARD: "Standard", ECONOMIQUE: "Économique",
};
const DELAY_DAYS_DELTA: Record<P5DelayMode, number | null> = {
  EXPRESS: 5, STANDARD: null, ECONOMIQUE: 30,
};

function bundleDiscount(types: ("EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST")[]): number {
  const set = new Set(types);
  if (set.size >= 3) return 0.15;
  if (set.size === 2) return 0.10;
  return 0;
}

/**
 * Estimation sommaire — calcule prix foncier, coût construction et montant
 * d'investissement à partir des données descriptives du client.
 *
 * C'est volontairement une fourchette large (±20%) pour couvrir la diversité
 * des situations. Le rapport final affinera ces chiffres.
 */
export type P5InternalEstimation = {
  prixFoncierMAD: number;
  coutConstructionMAD: number;
  montantInvestissementMAD: number;
  surfacePlancherEstimee: number;
  hypotheses: string[];
};

function estimatePlancher(
  family: P5BienFamily,
  surfaceTerrain: number,
  rLevel?: string,
  nbBatiments?: number,
): number {
  if (family === "TERRAIN_NU") return 0;
  if (family === "AMENAGEMENT") return surfaceTerrain; // surface du local

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
    if (Number.isFinite(n) && n > 1) plancher = plancher * n;
  }
  return Math.round(plancher);
}

function estimateInternal(input: P5QuoteInput): P5InternalEstimation {
  const hypotheses: string[] = [];
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

  // Prix foncier : utilise valeur fournie ou estime via terrain × prix moyen zone
  let prixFoncier = Number(input.prixFoncierMAD || 0);
  if (prixFoncier <= 0 && terrain > 0) {
    const pxM2 = ZONE_PRICE_MID[zone];
    prixFoncier = Math.round(terrain * pxM2);
    hypotheses.push(`Prix foncier estimé : ${terrain.toLocaleString("fr-FR")} m² × ${pxM2.toLocaleString("fr-FR")} DH/m² (zone ${zone}) = ${prixFoncier.toLocaleString("fr-FR")} DH.`);
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

@Injectable()
export class P5PricingService {
  listReports() {
    return Object.values(REPORT_DEFINITIONS);
  }

  /** Expose l'estimation sommaire (pour debug ou aperçu en transparence côté front). */
  estimate(input: P5QuoteInput): P5InternalEstimation {
    return estimateInternal(input);
  }

  computeQuote(input: P5QuoteInput) {
    const normalizedCode = LEGACY_REMAP[input.reportType];
    const def = REPORT_DEFINITIONS[normalizedCode];
    if (!def) throw new Error(`Type de rapport inconnu: ${input.reportType}`);

    const delayMode: P5DelayMode = input.delayMode ?? "STANDARD";
    const delayCoef = DELAY_COEFFICIENT[delayMode];

    // Estimation sommaire en interne : on calcule prix foncier, coût construction
    // et montant total à partir des données descriptives — le client n'a pas à les fournir.
    const estim = estimateInternal(input);

    let assiette = 0;
    let assietteLabel = "";
    let assietteMissing: string | null = null;
    let assietteSource: "client" | "estimation_interne" = "estimation_interne";

    if (normalizedCode === "EXPERTISE_PRIX") {
      // Si le client a fourni un prix foncier explicite, on l'utilise. Sinon estimation.
      assiette = input.prixFoncierMAD && input.prixFoncierMAD > 0 ? input.prixFoncierMAD : estim.prixFoncierMAD;
      assietteSource = input.prixFoncierMAD && input.prixFoncierMAD > 0 ? "client" : "estimation_interne";
      assietteLabel = "Prix du foncier";
      if (assiette <= 0) assietteMissing = "Renseignez au moins la surface du terrain et la tranche de prix de la zone.";
    } else if (normalizedCode === "EXPERTISE_URBA") {
      assiette = input.coutConstructionMAD && input.coutConstructionMAD > 0 ? input.coutConstructionMAD : estim.coutConstructionMAD;
      assietteSource = input.coutConstructionMAD && input.coutConstructionMAD > 0 ? "client" : "estimation_interne";
      assietteLabel = "Coût de construction estimé";
      if (assiette <= 0) assietteMissing = "Renseignez le terrain et le standing pour estimer le coût de construction.";
    } else {
      // READY_TO_INVEST — priorité au montant explicite, sinon notre estimation.
      assiette = input.montantInvestissementMAD && input.montantInvestissementMAD > 0
        ? input.montantInvestissementMAD
        : estim.montantInvestissementMAD;
      assietteSource = input.montantInvestissementMAD && input.montantInvestissementMAD > 0 ? "client" : "estimation_interne";
      assietteLabel = "Montant total d'investissement";
      if (assiette <= 0) assietteMissing = "Renseignez terrain + standing + zone — nous calculons l'enveloppe d'investissement.";
    }

    const baseRaw = Math.round(assiette * def.rate);
    const baseAfterMin = Math.max(baseRaw, def.minHT);
    const minApplied = baseAfterMin > baseRaw;

    const bundleCodes = (input.bundleWith || []).map(c => LEGACY_REMAP[c]).filter(Boolean) as ("EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST")[];
    const allBundle = [normalizedCode, ...bundleCodes];
    const discount = bundleDiscount(allBundle);

    const totalHT = Math.round(baseAfterMin * delayCoef * (1 - discount));
    const tva = Math.round(totalHT * 0.2);
    const totalTTC = totalHT + tva;

    const deliveryDays = DELAY_DAYS_DELTA[delayMode] ?? def.deliveryDays;

    return {
      ok: true as const,
      currency: "MAD" as const,
      meta: {
        reportType: normalizedCode,
        reportLabel: def.label,
        delayMode,
        delayLabel: `${DELAY_LABEL[delayMode]} — ${deliveryDays} jours ouvrables`,
        deliveryDays,
        rate: def.rate,
        assietteLabel,
        assietteMAD: assiette,
        assietteSource,
      },
      base: {
        ratePercent: def.rate * 100,
        baseRawHT: baseRaw,
        minHT: def.minHT,
        minApplied,
        delayCoefficient: delayCoef,
        bundleDiscount: discount,
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
        modalities:
          "Paiement intégral à la commande, avant lancement de la mission. " +
          "Le rapport est livré à réception du paiement et des documents requis.",
      },
      notes: [
        `Taux applicable : ${(def.rate * 100).toFixed(2)} % de « ${assietteLabel} ».`,
        assietteSource === "estimation_interne"
          ? "Assiette calculée par notre estimation sommaire à partir des caractéristiques du bien — le rapport l'affinera précisément."
          : "Assiette renseignée par le client.",
        minApplied ? `Plancher tarifaire de ${def.minHT.toLocaleString("fr-FR")} DH HT appliqué.` : null,
        discount > 0 ? `Remise bundle multi-rapports appliquée : -${Math.round(discount * 100)} %.` : null,
        "Tarifs hors déplacements exceptionnels (>50 km du cabinet, facturés en sus).",
        "Délais en jours ouvrables, à compter de la réception du paiement et des documents demandés.",
        assietteMissing,
      ].filter((x): x is string => !!x),
    };
  }
}
