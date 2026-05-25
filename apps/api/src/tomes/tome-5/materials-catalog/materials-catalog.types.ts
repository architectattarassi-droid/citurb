/**
 * TOME 5 — Materials Catalog
 * Domain types for the BTP Morocco materials reference catalog.
 *
 * Doctrine: this is a Tome 5 helper module that serves a READ-ONLY public
 * catalog (no PII, no entitlement). Only the price observation endpoint is
 * a mutation and is rate-limit-protected.
 */

/** Standard BTP units used by the catalog. */
export type MaterialUnit = "T" | "m3" | "m2" | "ml" | "U" | "kg" | "L";

/** Material category code (see catalog.json::categories). */
export type MaterialCategory =
  | "ciment"
  | "acier"
  | "granulats"
  | "beton"
  | "maconnerie"
  | "etancheite"
  | "enduits"
  | "peinture"
  | "menuiserie_alu"
  | "menuiserie_bois"
  | "sanitaire"
  | "electrique"
  | "revetement";

/** A single BTP material reference. */
export interface Material {
  /** Unique stable code (e.g. "CIMENT_CPJ_45_SAC50"). */
  code: string;
  category: MaterialCategory | string;
  /** French label. */
  label: string;
  /** Arabic label. */
  labelAr: string;
  /** Long description, may include usage notes. */
  description: string;
  unit: MaterialUnit | string;
  /** Reference standards (e.g. ["NM 10.1.004"]). */
  normesRefs: string[];
  /** Common brands available in Morocco. */
  marquesCourantes: string[];
  /** Optional image URL (CDN). */
  imageUrl?: string;
  /** Free-form technical specs (resistance, format, etc.). */
  specs: Record<string, string | number>;
}

/** Category descriptor exposed by the API. */
export interface MaterialCategoryDescriptor {
  code: string;
  label: string;
  labelAr: string;
}

/** Region descriptor (HCP region code). */
export interface RegionDescriptor {
  code: string;
  label: string;
}

/** Price snapshot for one material in one region for one month. */
export interface MaterialPriceSnapshot {
  materialCode: string;
  region: string;
  yearMonth: string;
  prixMin: number;
  prixMoyen: number;
  prixMax: number;
  source: string;
  updatedAt: string;
  observations: number;
}

/** Material + current month prices for one region (denormalized for cards). */
export interface MaterialWithPrice extends Material {
  currentPrice?: MaterialPriceSnapshot;
  /** Variation in % vs previous month (positive = price up). */
  variationPct?: number;
}

/** Historic price point (12-month chart). */
export interface MaterialPriceHistoryPoint {
  yearMonth: string;
  prixMoyen: number;
}

/** User-submitted price observation (POST). */
export interface ObservationInput {
  region: string;
  observedPrice: number;
  unit: string;
  /** Optional: free-form comment ("vu chez X"). */
  note?: string;
}

/** CITURBAREA index: composite indicator (gros oeuvre = ciment+acier+granulats+beton). */
export interface CiturbareaIndex {
  region: string;
  yearMonth: string;
  /** Indice base 100 — moyen national mai 2026 = 100. */
  indice: number;
  variationVsBaseline: number;
  components: Array<{ category: string; weight: number; value: number }>;
}
