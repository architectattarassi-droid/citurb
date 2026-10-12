/**
 * Porte 5 — Rapports & expertises : devis calculé dans le navigateur.
 *
 * Reprend exactement apps/api/src/tomes/tome-6/p5/pricing.service.ts (POST
 * /p5/quote), l'API étant éteinte en production :
 *   - ESTIMATION_EXPRESS : forfait 990 DH HT ;
 *   - EXPERTISE_PRIX / EXPERTISE_URBA / READY_TO_INVEST : tranches dégressives
 *     sur une assiette (prix du foncier, coût de construction, investissement
 *     total) estimée à partir de la description du bien, avec un minimum ;
 *   - coefficient de délai : Express × 1,4 · Standard × 1 · Économique × 0,9 ;
 *   - TVA 20 %.
 */

export type P5ReportType = "ESTIMATION_EXPRESS" | "EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST";
export type P5DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";
export type P5ZoneTier = "RURAL" | "PERIPHERIE" | "VILLE_MOYENNE" | "URBAIN" | "BON_QUARTIER" | "PREMIUM" | "PRESTIGE" | "ULTRA";
export type P5StandingTier = "economique" | "moyen" | "haut" | "luxe";
export type P5BienFamily = "TERRAIN_NU" | "VILLA" | "PETIT_COLLECTIF" | "GRAND_COLLECTIF" | "EQUIPEMENT" | "AMENAGEMENT" | "AUTRE";

export const ZONE_PRICE_MID: Record<P5ZoneTier, number> = {
  RURAL: 1200, PERIPHERIE: 2800, VILLE_MOYENNE: 5000, URBAIN: 7500,
  BON_QUARTIER: 11000, PREMIUM: 17000, PRESTIGE: 27500, ULTRA: 40000,
};

const FONCIER_MULTIPLIER_BY_FAMILY: Record<P5BienFamily, number> = {
  TERRAIN_NU: 1.0, VILLA: 1.0, PETIT_COLLECTIF: 1.4, GRAND_COLLECTIF: 1.6,
  EQUIPEMENT: 1.2, AMENAGEMENT: 1.0, AUTRE: 1.0,
};

export const STANDING_COST_M2: Record<P5StandingTier, number> = {
  economique: 3250, moyen: 4500, haut: 7500, luxe: 13000,
};

const FRAIS_ANNEXES_RATIO = 0.12;

type PricingTier = { upTo: number | null; rate: number };

type ReportDef = {
  label: string;
  flatHT?: number;
  tiers?: PricingTier[];
  minHT: number;
  deliveryDays: number;
  chapters: string[];
  bankable: boolean;
};

export const P5_REPORTS: Record<P5ReportType, ReportDef> = {
  ESTIMATION_EXPRESS: {
    label: "Estimation Express",
    flatHT: 990,
    minHT: 990,
    deliveryDays: 2,
    chapters: [
      "Valeur estimée et fourchette ±10 %",
      "3 à 5 ventes récentes comparables (même quartier, type, surface)",
      "Méthode des comparables (sans visite)",
      "Note de fiabilité",
    ],
    bankable: false,
  },
  EXPERTISE_PRIX: {
    label: "Rapport Expertise Prix",
    tiers: [
      { upTo: 500_000, rate: 0.005 },
      { upTo: 2_000_000, rate: 0.004 },
      { upTo: 10_000_000, rate: 0.003 },
      { upTo: null, rate: 0.002 },
    ],
    minHT: 1500,
    deliveryDays: 10,
    chapters: [
      "Synthèse — valeur retenue et fourchette",
      "Description du bien et visite sur place",
      "Étude de marché (au moins 3 ventes de référence)",
      "Méthode d'évaluation",
      "Valeur vénale : fourchette et valeur centrale",
      "Annexes : photos, titre foncier, attestations",
    ],
    bankable: true,
  },
  EXPERTISE_URBA: {
    label: "Rapport Expertise Urbanistique",
    tiers: [
      { upTo: 500_000, rate: 0.005 },
      { upTo: 5_000_000, rate: 0.004 },
      { upTo: 50_000_000, rate: 0.003 },
      { upTo: null, rate: 0.002 },
    ],
    minHT: 2500,
    deliveryDays: 12,
    chapters: [
      "Synthèse — verdict de constructibilité",
      "Note de renseignement urbanistique actualisée",
      "Plan d'aménagement applicable",
      "COS, CES, hauteur, reculs, façades",
      "Scénarios de constructibilité (mini / médian / maxi)",
      "Recommandations et risques réglementaires",
    ],
    bankable: true,
  },
  READY_TO_INVEST: {
    label: "Rapport Complet Premium — Ready-to-Invest",
    tiers: [
      { upTo: 5_000_000, rate: 0.005 },
      { upTo: 50_000_000, rate: 0.003 },
      { upTo: 200_000_000, rate: 0.002 },
      { upTo: null, rate: 0.0015 },
    ],
    minHT: 15000,
    deliveryDays: 21,
    chapters: [
      "Synthèse — recommandation d'investissement",
      "Foncier et acquisition",
      "Expertise urbanistique intégrée",
      "Programme (surfaces, logements, typologies)",
      "Coût des études et des travaux",
      "Prix de vente projetés (3 scénarios)",
      "Budget d'investissement total",
      "Rentabilité : marge, TRI, VAN, délai de retour",
      "Sensibilité et plan de financement",
    ],
    bankable: true,
  },
};

export const P5_DELAY_COEFFICIENT: Record<P5DelayMode, number> = { EXPRESS: 1.4, STANDARD: 1.0, ECONOMIQUE: 0.9 };
const DELAY_LABEL: Record<P5DelayMode, string> = { EXPRESS: "Express", STANDARD: "Standard", ECONOMIQUE: "Économique" };
const DELAY_DAYS: Record<P5DelayMode, number | null> = { EXPRESS: 5, STANDARD: null, ECONOMIQUE: 30 };

function applyProgressiveTiers(assiette: number, tiers: PricingTier[]) {
  let total = 0;
  let lastCap = 0;
  const breakdown: { from: number; to: number; rate: number; amount: number }[] = [];
  for (const t of tiers) {
    const cap = t.upTo ?? Infinity;
    const size = Math.max(0, Math.min(cap, assiette) - lastCap);
    if (size <= 0) break;
    total += size * t.rate;
    breakdown.push({ from: lastCap, to: Math.min(cap, assiette), rate: t.rate, amount: Math.round(size * t.rate) });
    lastCap = cap;
  }
  return { total: Math.round(total), breakdown };
}

export type P5QuoteInput = {
  reportType: P5ReportType;
  delayMode?: P5DelayMode;
  bienFamily?: P5BienFamily;
  surfaceTerrainM2?: number;
  surfacePlancherM2?: number;
  rLevel?: string;
  standing?: P5StandingTier;
  zoneTier?: P5ZoneTier;
  nbBatiments?: number;
  prixFoncierMAD?: number;
  coutConstructionMAD?: number;
  montantInvestissementMAD?: number;
};

function estimatePlancher(family: P5BienFamily, terrain: number, rLevel?: string, nbBatiments?: number): number {
  if (family === "TERRAIN_NU") return 0;
  if (family === "AMENAGEMENT") return terrain;
  const lvl = rLevel ? Number(String(rLevel).replace(/[^0-9]/g, "")) : 0;
  const niveaux = Number.isFinite(lvl) ? Math.max(0, lvl) : 0;
  const emprise = family === "VILLA" ? 0.50
    : family === "PETIT_COLLECTIF" ? 0.60
    : family === "GRAND_COLLECTIF" ? 0.65
    : family === "EQUIPEMENT" ? 0.55
    : 0.50;
  let plancher = terrain * emprise * (1 + 1.1 * niveaux);
  if (family === "PETIT_COLLECTIF" || family === "GRAND_COLLECTIF") {
    const n = Number(nbBatiments || 1);
    if (Number.isFinite(n) && n > 1) plancher *= n;
  }
  return Math.round(plancher);
}

/** Estimation sommaire (assiettes) à partir de la description du bien. */
export function estimateP5(input: P5QuoteInput) {
  const terrain = Number(input.surfaceTerrainM2 || 0);
  const family = input.bienFamily || "AUTRE";
  const standing = input.standing || "moyen";
  const zone = input.zoneTier || "URBAIN";

  let plancher = Number(input.surfacePlancherM2 || 0);
  if (plancher <= 0 && terrain > 0 && family !== "TERRAIN_NU") {
    plancher = estimatePlancher(family, terrain, input.rLevel, input.nbBatiments);
  }
  let prixFoncier = Number(input.prixFoncierMAD || 0);
  if (prixFoncier <= 0 && terrain > 0) {
    prixFoncier = Math.round(terrain * Math.round(ZONE_PRICE_MID[zone] * (FONCIER_MULTIPLIER_BY_FAMILY[family] ?? 1)));
  }
  let coutConstruction = Number(input.coutConstructionMAD || 0);
  if (coutConstruction <= 0 && plancher > 0) {
    coutConstruction = Math.round(plancher * STANDING_COST_M2[standing]);
  }
  let montantTotal = Number(input.montantInvestissementMAD || 0);
  if (montantTotal <= 0) {
    montantTotal = prixFoncier + coutConstruction + Math.round((prixFoncier + coutConstruction) * FRAIS_ANNEXES_RATIO);
  }
  return { prixFoncierMAD: prixFoncier, coutConstructionMAD: coutConstruction, montantInvestissementMAD: montantTotal, surfacePlancherEstimee: plancher };
}

export type P5Quote = ReturnType<typeof computeP5Quote>;

export function computeP5Quote(input: P5QuoteInput) {
  const code = input.reportType;
  const def = P5_REPORTS[code];
  if (!def) throw new Error(`Type de rapport inconnu : ${code}`);
  const delayMode: P5DelayMode = input.delayMode ?? "STANDARD";
  const estim = estimateP5(input);

  let assiette = 0;
  let assietteLabel = "Valeur estimée du bien";
  let assietteSource: "client" | "estimation_interne" = "estimation_interne";
  if (code === "EXPERTISE_PRIX") {
    const c = Number(input.prixFoncierMAD || 0);
    assiette = c > 0 ? c : estim.prixFoncierMAD;
    assietteSource = c > 0 ? "client" : "estimation_interne";
    assietteLabel = "Prix du foncier / valeur du bien";
  } else if (code === "EXPERTISE_URBA") {
    const c = Number(input.coutConstructionMAD || 0);
    assiette = c > 0 ? c : estim.coutConstructionMAD;
    assietteSource = c > 0 ? "client" : "estimation_interne";
    assietteLabel = "Coût de construction estimé";
  } else if (code === "READY_TO_INVEST") {
    const c = Number(input.montantInvestissementMAD || 0);
    assiette = c > 0 ? c : estim.montantInvestissementMAD;
    assietteSource = c > 0 ? "client" : "estimation_interne";
    assietteLabel = "Montant total d'investissement";
  } else {
    assiette = estim.prixFoncierMAD || estim.montantInvestissementMAD || 0;
  }

  let baseRaw: number;
  let breakdown: { from: number; to: number; rate: number; amount: number }[] | undefined;
  if (def.flatHT != null) baseRaw = def.flatHT;
  else if (def.tiers) ({ total: baseRaw, breakdown } = applyProgressiveTiers(assiette, def.tiers));
  else baseRaw = def.minHT;

  const baseAfterMin = Math.max(baseRaw, def.minHT);
  const delayCoef = P5_DELAY_COEFFICIENT[delayMode];
  const totalHT = Math.round(baseAfterMin * delayCoef);
  const tva = Math.round(totalHT * 0.2);
  const deliveryDays = DELAY_DAYS[delayMode] ?? def.deliveryDays;

  return {
    ok: true as const,
    currency: "MAD" as const,
    source: "local" as const,
    meta: {
      reportType: code,
      reportLabel: def.label,
      bankable: def.bankable,
      delayMode,
      delayLabel: `${DELAY_LABEL[delayMode]} — ${deliveryDays} jours ouvrables`,
      deliveryDays,
      pricingModel: (def.flatHT != null ? "flat" : "tiers") as "flat" | "tiers",
      flatHT: def.flatHT,
      tiers: def.tiers,
      assietteLabel,
      assietteMAD: assiette,
      assietteSource,
    },
    base: { baseRawHT: baseRaw, minHT: def.minHT, minApplied: baseAfterMin > baseRaw, delayCoefficient: delayCoef, bundleDiscount: 0, breakdown },
    estimation: { ...estim, hypotheses: [] as string[] },
    deliverables: def.chapters,
    audience: [] as string[],
    signature: "",
    amounts: { totalHT, tvaRate: 0.2, tva, totalTTC: totalHT + tva },
    payment: {
      modalities: "Après validation de votre demande, nous vous envoyons la proposition et le lien de paiement. La mission démarre à réception du paiement et des documents utiles.",
    },
    notes: [
      def.flatHT != null
        ? `Forfait fixe : ${def.flatHT.toLocaleString("fr-FR")} DH HT.`
        : "Tarif dégressif par tranches, appliqué à la valeur estimée à partir de votre description.",
      !def.bankable ? "Estimation informative, non opposable auprès d'une banque." : null,
      "Hors déplacements exceptionnels (plus de 50 km du cabinet).",
    ].filter((x): x is string => !!x),
  };
}
