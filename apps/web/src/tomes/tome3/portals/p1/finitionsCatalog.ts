/**
 * Catalogue de finitions client (P1) — options visuelles présentées à côté des
 * prix lorsque le client COMPOSE son projet lot par lot.
 *
 * Les vignettes sont pour l'instant des PLACEHOLDERS (dégradés CSS représentant
 * la matière). Remplacer `swatch` par `img: "/finitions/xxx.jpg"` quand la
 * photothèque réelle est disponible — la structure UI est déjà prête.
 *
 * Le `factor` multiplie le prix MÉDIAN du lot (issu de costRangesMA/estimateLots),
 * de sorte que le moteur de coût reste l'unique source de vérité.
 */

export type FinitionTier = "ECO" | "STD" | "PREM";

export type Finition = {
  id: string;
  label: string;
  tier: FinitionTier;
  /** Multiplicateur appliqué au prix médian du lot. */
  factor: number;
  /** Vignette placeholder (dégradé CSS) — remplacée par une vraie photo plus tard. */
  swatch: string;
  /** Photo réelle (optionnelle) — prioritaire sur swatch quand fournie. */
  img?: string;
  desc?: string;
};

export const TIER_LABELS: Record<FinitionTier, string> = {
  ECO: "Économique",
  STD: "Standard",
  PREM: "Premium",
};

/**
 * Finitions par lot (codes alignés sur LOT_LABELS de costRangesMA).
 * On n'expose que les lots où le CLIENT a un vrai choix esthétique/qualité.
 */
export const FINITIONS: Record<string, Finition[]> = {
  REV: [
    { id: "rev_carrelage", label: "Carrelage standard", tier: "ECO", factor: 0.8, swatch: "linear-gradient(135deg,#ece7dc,#cfc7b6)", desc: "Grès 45×45 / 60×60" },
    { id: "rev_gres", label: "Grès cérame grand format", tier: "STD", factor: 1.0, swatch: "linear-gradient(135deg,#ded7c8,#b9ad97)", desc: "Rectifié, pose droite" },
    { id: "rev_marbre", label: "Marbre / pierre naturelle", tier: "PREM", factor: 1.7, swatch: "linear-gradient(135deg,#f4f1eb,#d8cdb6 55%,#9c8f73)", desc: "Marbre, travertin" },
    { id: "rev_microciment", label: "Microciment / béton ciré", tier: "PREM", factor: 1.4, swatch: "linear-gradient(135deg,#d2d5d3,#9aa0a0)", desc: "Sol design continu" },
  ],
  PEI: [
    { id: "pei_std", label: "Peinture standard", tier: "ECO", factor: 0.85, swatch: "linear-gradient(135deg,#f6f6f4,#e3e3df)", desc: "Mat / satiné" },
    { id: "pei_velours", label: "Velours lessivable", tier: "STD", factor: 1.0, swatch: "linear-gradient(135deg,#eef0f2,#d4d9de)", desc: "Lessivable, haut rendement" },
    { id: "pei_deco", label: "Enduits décoratifs / staff", tier: "PREM", factor: 1.5, swatch: "linear-gradient(135deg,#efe9df,#cdbfa6)", desc: "Stuc, béton minéral, staff" },
  ],
  ALU: [
    { id: "alu_std", label: "Aluminium standard", tier: "ECO", factor: 0.85, swatch: "linear-gradient(135deg,#dfe3e6,#aeb6bd)", desc: "Laqué, simple vitrage renforcé" },
    { id: "alu_rpt", label: "Rupture de pont thermique", tier: "STD", factor: 1.1, swatch: "linear-gradient(135deg,#cdd4da,#8e99a2)", desc: "Double vitrage, RPT" },
    { id: "alu_minimal", label: "Profilés minimalistes + volets élec.", tier: "PREM", factor: 1.6, swatch: "linear-gradient(135deg,#bcc4cc,#6f7b85)", desc: "Grandes baies, motorisé" },
  ],
  FAC: [
    { id: "fac_enduit", label: "Enduit projeté", tier: "ECO", factor: 0.8, swatch: "linear-gradient(135deg,#efe9df,#d8cfbf)", desc: "Monocouche teinté" },
    { id: "fac_mixte", label: "Enduit + pierre partielle", tier: "STD", factor: 1.15, swatch: "linear-gradient(135deg,#e3d9c8,#b9a888)", desc: "Habillage partiel pierre/bois" },
    { id: "fac_premium", label: "Pierre / composite / GRC", tier: "PREM", factor: 1.7, swatch: "linear-gradient(135deg,#cfc3ad,#8c7c5f)", desc: "Façade noble intégrale" },
  ],
  BOI: [
    { id: "boi_melamine", label: "Mélaminé / mélaminé hydro", tier: "ECO", factor: 0.85, swatch: "linear-gradient(135deg,#e8d9c4,#c9ad88)", desc: "Placards, portes std" },
    { id: "boi_mdf", label: "MDF laqué / plaqué", tier: "STD", factor: 1.1, swatch: "linear-gradient(135deg,#d8c4a6,#a8865e)", desc: "Laqué mat, plaqué chêne" },
    { id: "boi_massif", label: "Bois massif / ébénisterie", tier: "PREM", factor: 1.7, swatch: "linear-gradient(135deg,#b98c5a,#6e4a28)", desc: "Sur-mesure, essences nobles" },
  ],
  PLO: [
    { id: "plo_std", label: "Sanitaire standard", tier: "ECO", factor: 0.85, swatch: "linear-gradient(135deg,#eef2f4,#d3dde2)", desc: "Robinetterie / faïence std" },
    { id: "plo_confort", label: "Confort", tier: "STD", factor: 1.0, swatch: "linear-gradient(135deg,#e2eef2,#bcd4dc)", desc: "Mitigeurs qualité, douche" },
    { id: "plo_premium", label: "Premium (douche à l'italienne…)", tier: "PREM", factor: 1.5, swatch: "linear-gradient(135deg,#dceaf0,#9fc2cf)", desc: "Encastré, italienne, design" },
  ],
};

export const FINITION_LOTS = Object.keys(FINITIONS);

/** Finition par défaut d'un lot (option STD si présente, sinon la 1re). */
export function defaultFinition(lot: string): Finition | null {
  const opts = FINITIONS[lot];
  if (!opts || !opts.length) return null;
  return opts.find((o) => o.tier === "STD") || opts[0];
}
