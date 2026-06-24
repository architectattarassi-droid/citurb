/**
 * parcelleSP.ts — calcul de la Surface Plancher (SP) depuis la PARCELLE,
 * porté fidèlement de la qualification P1Landing (CES, cour, galerie, sous-sol,
 * R+N, largeur de voie, forfait cage/buanderie/terrasse 24 m²).
 *
 * Sert de mode « Calcul par parcelle (CES + cour) » dans le helper de surface,
 * pour estimer le coût/honoraires sur un plancher réglementaire réaliste.
 */

export type Bati = "villa" | "immeuble";
export type VillaType = "bande" | "jumelee" | "isolee";
export type ImmeubleType = "standard" | "maison_ville" | "rdc_commercial";
export type RdcCourMode = "with_cour" | "without_cour" | "unknown";

export type ParcelleInput = {
  bati: Bati;
  surfaceTerrain: number; // m² de lot
  etages: number; // R+N → N niveaux au-dessus du RDC
  voieLarge: boolean; // voie ≥ 12 m → coef étage 1.1 (porte-à-faux)
  sousSol: boolean;
  villaType?: VillaType;
  immeubleType?: ImmeubleType;
  facades?: number; // 1 (mitoyen 2 côtés) ou 2 (≥2 façades)
  galerie?: boolean; // RDC commercial : galerie (recul → CES 0.7) ou non (CES 1.0)
  rdcCourMode?: RdcCourMode;
  courSurface?: number;
};

// Cage d'escalier + buanderie + terrasse (règle métier 2026-06).
const FORFAIT_ADDONS_M2 = 24;

/** Cour minimum réglementaire selon le nombre d'étages. */
function courMinReglementaire(e: number): number {
  if (e <= 1) return 9;
  if (e === 2) return 16;
  if (e === 3) return 20;
  return 24;
}

/** Retourne la SP estimée (m²) ou null si données insuffisantes. */
export function computeParcelleSP(p: ParcelleInput): number | null {
  const st = Number(p.surfaceTerrain);
  if (!Number.isFinite(st) || st <= 0) return null;
  const hasBasement = p.sousSol ? 1 : 0;
  const coefEtage = p.voieLarge ? 1.1 : 1.0;
  const e = Math.max(0, Math.floor(Number(p.etages) || 0));

  // ── VILLA ──
  if (p.bati === "villa") {
    if (!p.villaType) return null;
    const coef = p.villaType === "bande" ? 0.5 : p.villaType === "jumelee" ? 0.4 : 0.3;
    return Math.round(st * coef * (1 + coefEtage * e + hasBasement) + FORFAIT_ADDONS_M2);
  }

  // ── IMMEUBLE ──
  const it = p.immeubleType ?? "standard";
  const CES = it === "maison_ville" ? 0.7 : it === "rdc_commercial" ? (p.galerie === false ? 1.0 : 0.7) : 1.0;
  const RDC_plein = st * CES;
  const fac = Number(p.facades ?? 2);

  // ≥ 2 façades : formule standard (coef étage appliqué).
  if (fac >= 2) {
    return Math.round(RDC_plein * (1 + hasBasement + coefEtage * e) + FORFAIT_ADDONS_M2);
  }

  // 1 façade (mitoyen 2 côtés) : règles de cour.
  const mode = p.rdcCourMode ?? "unknown";
  if (mode === "unknown") {
    return Math.round(RDC_plein * (1 + hasBasement + e) + FORFAIT_ADDONS_M2);
  }
  if (mode === "with_cour") {
    const cour = Math.max(Number(p.courSurface || 0), courMinReglementaire(e));
    const RDC_net = Math.max(0, RDC_plein - cour);
    return Math.round(RDC_net * (1 + hasBasement + e) + FORFAIT_ADDONS_M2);
  }
  // without_cour : cour de jour par étage (9 m², R+3 dernier 16, R+4+ dernier 20).
  let etagesTotal = 0;
  for (let i = 1; i <= e; i++) {
    let cour = 9;
    if (e === 3 && i === 3) cour = 16;
    else if (e >= 4 && i === e) cour = 20;
    etagesTotal += Math.max(0, RDC_plein - cour);
  }
  const sousSol_m2 = hasBasement * RDC_plein;
  return Math.round(RDC_plein + sousSol_m2 + etagesTotal + FORFAIT_ADDONS_M2);
}
