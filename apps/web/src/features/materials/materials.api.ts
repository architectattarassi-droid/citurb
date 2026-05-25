/**
 * apps/web/src/features/materials/materials.api.ts
 *
 * Client API REST pour le module Catalogue Prix Matériaux BTP Maroc.
 * Réutilise apiFetch (TOME@4) qui gère JWT, X-Firm-Slug et les erreurs.
 *
 * Doctrine: ce module est PUBLIC en lecture (cache 1h côté serveur).
 * L'unique mutation (`postObservation`) est anonyme et rate-limit-protégée.
 */

import { apiFetch } from "../../tomes/tome4/apiClient";

export type MaterialUnit = "T" | "m3" | "m2" | "ml" | "U" | "kg" | "L";

export type Material = {
  code: string;
  category: string;
  label: string;
  labelAr: string;
  description: string;
  unit: MaterialUnit | string;
  normesRefs: string[];
  marquesCourantes: string[];
  imageUrl?: string;
  specs: Record<string, string | number>;
};

export type MaterialPriceSnapshot = {
  materialCode: string;
  region: string;
  yearMonth: string;
  prixMin: number;
  prixMoyen: number;
  prixMax: number;
  source: string;
  observations: number;
  updatedAt: string;
};

export type MaterialWithPrice = Material & {
  currentPrice?: MaterialPriceSnapshot;
  variationPct?: number;
};

export type MaterialCategoryDescriptor = { code: string; label: string; labelAr: string };
export type RegionDescriptor = { code: string; label: string };
export type MaterialPriceHistoryPoint = { yearMonth: string; prixMoyen: number };
export type CiturbareaIndex = {
  region: string;
  yearMonth: string;
  indice: number;
  variationVsBaseline: number;
  components: Array<{ category: string; weight: number; value: number }>;
};

export type CatalogResponse = {
  ok: true;
  meta: {
    version?: string;
    lastUpdated?: string;
    yearMonth?: string;
    currency: string;
    vatNote: string;
    materialsCount: number;
    regionsCount: number;
  };
  categories: MaterialCategoryDescriptor[];
  regions: RegionDescriptor[];
  materials: MaterialWithPrice[];
};

/** Default region = Casablanca-Settat (~30% du PIB national, marché de référence). */
export const DEFAULT_REGION = "06_CASABLANCA_SETTAT";

export async function fetchCatalog(opts: { category?: string; region?: string } = {}): Promise<CatalogResponse> {
  const p = new URLSearchParams();
  if (opts.category) p.set("category", opts.category);
  if (opts.region) p.set("region", opts.region);
  const qs = p.toString() ? `?${p.toString()}` : "";
  return apiFetch<CatalogResponse>(`/api/materials/catalog${qs}`);
}

export async function searchMaterials(q: string, region: string = DEFAULT_REGION): Promise<{ ok: true; query: string; results: MaterialWithPrice[] }> {
  const p = new URLSearchParams({ q, region });
  return apiFetch(`/api/materials/catalog/search?${p.toString()}`);
}

export async function fetchMaterial(code: string, region: string = DEFAULT_REGION): Promise<{ ok: true; material: MaterialWithPrice }> {
  return apiFetch(`/api/materials/${encodeURIComponent(code)}?region=${encodeURIComponent(region)}`);
}

export async function fetchPriceHistory(code: string, region: string = DEFAULT_REGION, months = 12): Promise<{ ok: true; history: MaterialPriceHistoryPoint[] }> {
  return apiFetch(`/api/materials/${encodeURIComponent(code)}/prices/history?region=${encodeURIComponent(region)}&months=${months}`);
}

export async function fetchIndex(region: string = DEFAULT_REGION): Promise<{ ok: true; index: CiturbareaIndex }> {
  return apiFetch(`/api/materials/index/citurbarea?region=${encodeURIComponent(region)}`);
}

export async function postObservation(
  code: string,
  body: { region: string; observedPrice: number; unit: string; note?: string },
): Promise<{ ok: true; received: number }> {
  return apiFetch(`/api/materials/${encodeURIComponent(code)}/observation`, { method: "POST", body });
}

/** Format MAD HT for display (1234.5 → "1 234,50 MAD HT"). */
export function fmtMad(n: number, withSuffix = true): string {
  const f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return withSuffix ? `${f} MAD HT` : f;
}

/** Pretty unit (per-something). */
export function fmtUnit(u: string): string {
  switch (u) {
    case "T":   return "/ T";
    case "m3":  return "/ m³";
    case "m2":  return "/ m²";
    case "ml":  return "/ ml";
    case "U":   return "/ U";
    case "kg":  return "/ kg";
    case "L":   return "/ L";
    default:    return `/ ${u}`;
  }
}
