/**
 * costRangesMA.ts — Barème indicatif coût de construction Maroc 2026 (validé).
 *
 * Principe : PAS de prix pivot unique → uniquement des FOURCHETTES min/max DH/m²,
 * par type de projet et par niveau de standing. Le coût est ensuite ventilé par
 * lot (corps d'état) selon des pondérations. ULTRA_ECO = scénario très contraint
 * (finition minimale, sans sous-sol/ascenseur/façade coûteuse) → réservé HMB/IMM/MIX.
 */

export type Standing = "ULTRA_ECO" | "ECONOMIQUE" | "STANDARD" | "STANDING" | "PREMIUM";
export type TypeProjet = "HMB" | "VIL" | "IMM" | "MIX";

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
};

export const LOT_ORDER = ["INS", "TER", "FON", "STR", "MAC", "ETA", "FAC", "ALU", "BOI", "ELE", "PLO", "REV", "PEI", "PLA", "FER", "SEC"];

type TypeConfig = { label: string; ranges: Partial<Record<Standing, [number, number]>>; lots: Record<string, number> };

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
    ranges: { ECONOMIQUE: [4000, 5200], STANDARD: [5500, 7000], STANDING: [7500, 9500], PREMIUM: [10000, 14000] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.08, STR: 0.18, MAC: 0.08, ETA: 0.04, FAC: 0.08, ALU: 0.09, BOI: 0.06, ELE: 0.07, PLO: 0.07, REV: 0.11, PEI: 0.03, PLA: 0.04, FER: 0.02 },
  },
  MIX: {
    label: TYPE_LABELS.MIX,
    ranges: { ULTRA_ECO: [3000, 3800], ECONOMIQUE: [4000, 5200], STANDARD: [5500, 7200], STANDING: [7500, 10000], PREMIUM: [11000, 14500] },
    lots: { INS: 0.02, TER: 0.03, FON: 0.1, STR: 0.24, MAC: 0.08, ETA: 0.04, FAC: 0.08, ALU: 0.08, BOI: 0.03, ELE: 0.09, PLO: 0.07, REV: 0.08, PEI: 0.03, PLA: 0.02, FER: 0.02, SEC: 0.01 },
  },
};

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
  const lots: LotEstimate[] = LOT_ORDER.filter((c) => cfg.lots[c] != null).map((code) => {
    const w = cfg.lots[code] / sumW;
    return {
      code,
      label: LOT_LABELS[code] ?? code,
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

export const DISCLAIMER_LOTS =
  "Estimation indicative (fourchette min–max). Le niveau ultra-économique correspond à une construction très simple : sans sous-sol, sans ascenseur, sans prestations de standing, finitions minimales. Hors terrain, honoraires, taxes, raccordements officiels, cuisine équipée, mobilier, VRD lourds et imprévus.";
