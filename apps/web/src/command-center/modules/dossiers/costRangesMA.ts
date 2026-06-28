/**
 * costRangesMA.ts — Barème indicatif coût de construction Maroc 2026 (validé).
 *
 * Principe : PAS de prix pivot unique → uniquement des FOURCHETTES min/max DH/m²,
 * par type de projet et par niveau de standing. Le coût est ensuite ventilé par
 * lot (corps d'état) selon des pondérations. ULTRA_ECO = scénario très contraint
 * (finition minimale, sans sous-sol/ascenseur/façade coûteuse) → réservé HMB/IMM/MIX.
 */

export type Standing = "ULTRA_ECO" | "ECONOMIQUE" | "STANDARD" | "STANDING" | "PREMIUM";
export type TypeProjet = "HMB" | "VIL" | "IMM" | "MIX" | "BUR" | "AME";

export const STANDING_LABELS: Record<Standing, string> = {
  ULTRA_ECO: "Ultra-économique",
  ECONOMIQUE: "Économique",
  STANDARD: "Standard",
  STANDING: "Standing",
  PREMIUM: "Premium",
};

export const TYPE_LABELS: Record<TypeProjet, string> = {
  HMB: "Maison simple (R+0 à R+2)",
  VIL: "Villa (isolée / jumelée)",
  IMM: "Immeuble résidentiel (R+2 à R+5)",
  MIX: "Immeuble mixte (RDC commerce + logements)",
  BUR: "Bureaux / plateaux professionnels",
  AME: "Aménagement intérieur / local commercial",
};

/** Codes de lot → libellés, groupés gros œuvre → second œuvre → finitions. */
export const LOT_LABELS: Record<string, string> = {
  INS: "Installation de chantier",
  TER: "Terrassement",
  FON: "Fondations",
  STR: "Structure béton armé",
  MAC: "Maçonnerie / cloisons",
  ETA: "Étanchéité",
  FAC: "Façade",
  ALU: "Menuiserie aluminium / vitrage",
  BOI: "Menuiserie bois",
  ELE: "Électricité",
  PLO: "Plomberie",
  REV: "Revêtements (carrelage / sol)",
  PEI: "Peinture",
  PLA: "Plâtre / faux-plafonds",
  FER: "Ferronnerie",
  SEC: "Sécurité / parties communes",
  TEC: "Lots techniques (CVC, courant faible, sécurité)",
};

export const LOT_ORDER = ["INS", "TER", "FON", "STR", "MAC", "ETA", "FAC", "ALU", "BOI", "ELE", "PLO", "REV", "PEI", "PLA", "FER", "SEC", "TEC"];

type TypeConfig = {
  label: string;
  /** Garde-fou d'affichage spécifique au type (en sus du disclaimer général). */
  note?: string;
  ranges: Partial<Record<Standing, [number, number]>>;
  lots: Record<string, number>;
  /** Libellés de lot spécifiques au type (override de LOT_LABELS). */
  lotLabels?: Record<string, string>;
  /** Libellés de standing spécifiques au type (override de STANDING_LABELS). */
  standingLabels?: Partial<Record<Standing, string>>;
};

export const COST_RANGES_MA: Record<TypeProjet, TypeConfig> = {
  HMB: {
    label: TYPE_LABELS.HMB,
    ranges: { ULTRA_ECO: [2500, 3000], ECONOMIQUE: [3200, 4200], STANDARD: [4500, 5800], STANDING: [6000, 7200] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.1, STR: 0.22, MAC: 0.11, ETA: 0.04, FAC: 0.05, ALU: 0.06, BOI: 0.04, ELE: 0.07, PLO: 0.07, REV: 0.1, PEI: 0.04, PLA: 0.02, FER: 0.03 },
  },
  IMM: {
    label: TYPE_LABELS.IMM,
    ranges: { ULTRA_ECO: [2800, 3500], ECONOMIQUE: [3500, 4800], STANDARD: [5000, 6800], STANDING: [7000, 9500], PREMIUM: [10000, 14000] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.1, STR: 0.24, MAC: 0.09, ETA: 0.04, FAC: 0.05, ALU: 0.06, BOI: 0.03, ELE: 0.08, PLO: 0.08, REV: 0.08, PEI: 0.03, PLA: 0.02, FER: 0.02, SEC: 0.03 },
  },
  VIL: {
    label: TYPE_LABELS.VIL,
    // Palier "très économique" (moy. 3000 DH/m²) ajouté en bas de gamme, puis
    // décomposition du standing : Moyen standing / Standing / Haut standing / Luxe.
    ranges: { ULTRA_ECO: [2500, 3500], ECONOMIQUE: [4000, 5200], STANDARD: [5500, 7000], STANDING: [7500, 9500], PREMIUM: [10000, 14000] },
    standingLabels: { ULTRA_ECO: "Très économique", ECONOMIQUE: "Moyen standing", STANDARD: "Standing", STANDING: "Haut standing", PREMIUM: "Luxe / Premium" },
    lots: { INS: 0.02, TER: 0.03, FON: 0.08, STR: 0.18, MAC: 0.08, ETA: 0.04, FAC: 0.08, ALU: 0.09, BOI: 0.06, ELE: 0.07, PLO: 0.07, REV: 0.11, PEI: 0.03, PLA: 0.04, FER: 0.02 },
  },
  MIX: {
    label: TYPE_LABELS.MIX,
    ranges: { ULTRA_ECO: [3000, 3800], ECONOMIQUE: [4000, 5200], STANDARD: [5500, 7200], STANDING: [7500, 10000], PREMIUM: [11000, 14500] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.1, STR: 0.24, MAC: 0.08, ETA: 0.04, FAC: 0.08, ALU: 0.08, BOI: 0.03, ELE: 0.09, PLO: 0.07, REV: 0.08, PEI: 0.03, PLA: 0.02, FER: 0.02, SEC: 0.01 },
  },
  BUR: {
    label: TYPE_LABELS.BUR,
    note: "Les bureaux nécessitent souvent un budget technique plus élevé : électricité, courant faible, climatisation, faux-plafonds, sécurité et cloisonnement.",
    ranges: { ECONOMIQUE: [4000, 5200], STANDARD: [5500, 7000], STANDING: [8000, 10000], PREMIUM: [11000, 15000] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.08, STR: 0.2, MAC: 0.07, ETA: 0.04, FAC: 0.08, ALU: 0.1, BOI: 0.03, ELE: 0.11, PLO: 0.05, REV: 0.07, PEI: 0.03, PLA: 0.05, FER: 0.01, TEC: 0.03 },
  },
  AME: {
    label: TYPE_LABELS.AME,
    note: "L'aménagement intérieur ne correspond pas à une construction neuve complète : il concerne un local, plateau ou espace existant à aménager.",
    ranges: { ULTRA_ECO: [1500, 2500], ECONOMIQUE: [2500, 4000], STANDARD: [4000, 6000], STANDING: [6000, 9000], PREMIUM: [9000, 14000] },
    lots: { DEM: 0.05, CLO: 0.1, ELE: 0.18, PLO: 0.08, CLM: 0.12, PLA: 0.1, REV: 0.15, PEI: 0.08, BOI: 0.08, ENS: 0.06 },
    lotLabels: {
      DEM: "Démolition / préparation",
      CLO: "Cloisons",
      ELE: "Électricité / courant faible",
      PLO: "Plomberie",
      CLM: "Climatisation / ventilation",
      PLA: "Faux-plafonds",
      REV: "Revêtements",
      PEI: "Peinture / finitions",
      BOI: "Menuiserie / mobilier fixe",
      ENS: "Enseigne / façade commerciale",
    },
  },
};

/** Libellé d'un standing, en tenant compte des overrides par type (ex. villa). */
export function standingLabel(type: TypeProjet, standing: Standing): string {
  return COST_RANGES_MA[type]?.standingLabels?.[standing] ?? STANDING_LABELS[standing];
}

export type LotEstimate = { code: string; label: string; pct: number; min: number; max: number };
export type LotsResult = {
  type: TypeProjet;
  standing: Standing;
  surfaceM2: number;
  rangeM2: [number, number];
  totalMin: number;
  totalMax: number;
  lots: LotEstimate[];
};

/**
 * Estime le coût total (fourchette) et la ventilation par lot. Les poids sont
 * normalisés (÷ somme) pour que les lots somment exactement au total, même si
 * la grille saisie ne fait pas pile 100% (ex. MIX = 102%).
 */
export function estimateLots(type: TypeProjet, standing: Standing, surfaceM2: number): LotsResult | null {
  const cfg = COST_RANGES_MA[type];
  const rangeM2 = cfg.ranges[standing];
  if (!rangeM2 || !surfaceM2 || surfaceM2 <= 0) return null;
  const sumW = Object.values(cfg.lots).reduce((a, b) => a + b, 0);
  // Itère sur les lots du type (ordre d'insertion → gère les codes spécifiques
  // AME : DEM/CLO/CLM/ENS). Poids normalisés (÷ somme) → lots = total exact.
  const lots: LotEstimate[] = Object.keys(cfg.lots).map((code) => {
    const w = cfg.lots[code] / sumW;
    return {
      code,
      label: cfg.lotLabels?.[code] ?? LOT_LABELS[code] ?? code,
      pct: cfg.lots[code],
      min: Math.round(rangeM2[0] * w * surfaceM2),
      max: Math.round(rangeM2[1] * w * surfaceM2),
    };
  });
  return {
    type,
    standing,
    surfaceM2,
    rangeM2,
    totalMin: rangeM2[0] * surfaceM2,
    totalMax: rangeM2[1] * surfaceM2,
    lots,
  };
}

/**
 * Honoraires des intervenants, en % du COÛT DE CONSTRUCTION estimé.
 * ARCH (5%) et BET (2%) reprennent le moteur P1/P2 déjà déployé ; les autres
 * sont des taux indicatifs marché Maroc, éditables dans l'UI.
 */
export type Intervenant = { code: string; label: string; rate: number };
export const INTERVENANTS_DEFAULT: Intervenant[] = [
  { code: "ARCH", label: "Architecte (conception + suivi)", rate: 0.05 },
  { code: "BET", label: "BET structure & fluides", rate: 0.02 },
  { code: "GEO", label: "Géotechnicien (étude de sol)", rate: 0.005 },
  { code: "TOPO", label: "Topographe (relevé / implantation)", rate: 0.003 },
  { code: "CTRL", label: "Bureau de contrôle technique", rate: 0.01 },
  { code: "LABO", label: "Laboratoire (essais béton / sols)", rate: 0.005 },
];

export const DISCLAIMER_LOTS =
  "Estimation indicative (fourchette min–max). Le niveau ultra-économique correspond à une construction très simple : sans sous-sol, sans ascenseur, sans prestations de standing, finitions minimales. Hors terrain, honoraires, taxes, raccordements officiels, cuisine équipée, mobilier, VRD lourds et imprévus.";
