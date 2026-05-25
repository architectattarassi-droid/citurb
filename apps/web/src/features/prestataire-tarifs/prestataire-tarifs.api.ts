import { apiFetch } from "../../tomes/tome4/apiClient";

/**
 * Client API — Tarifs contractuels prestataires P6 (Tome 5).
 * Endpoints mountés sous `/api/prestataire-tarifs`.
 */

export type TarifUnite = "m2" | "ml" | "h" | "forfait" | "U";
export type TarifStatus = "BROUILLON" | "VALIDE_CITURBAREA" | "PUBLIE" | "SUSPENDU";

export interface TarifConditions {
  minQuantite?: number;
  maxDeplacementKm?: number;
  delaiInterventionH?: number;
  inclus: string[];
  exclus: string[];
}

export interface TarifGaranties {
  delaiIntervention: string;
  garantieTravaux: string;
  assurances: string[];
}

export interface TarifContractuel {
  id: string;
  prestataireId: string;
  corpsMetier: string;
  prestation: string;
  unite: TarifUnite;
  prixUnitaireMAD: number;
  conditions: TarifConditions;
  zoneIntervention: string[];
  status: TarifStatus;
  garanties: TarifGaranties;
  validUntil: string;
  contratSignedAt?: string;
  commissionCiturbareaPct: number;
  hashContrat: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrestationCorpus {
  code: string;
  corpsMetier: string;
  label: string;
  description: string;
  uniteRecommandee: TarifUnite;
  prixIndicatifMinMAD: number;
  prixIndicatifMaxMAD: number;
}

export interface ComparatorResult {
  prestation: string;
  unite: TarifUnite;
  clientPrice: number;
  marketStats: { min: number; max: number; median: number; count: number };
  positionPct: number;
  verdict: "TRES_BAS" | "BAS" | "MARCHE" | "ELEVE" | "TRES_ELEVE";
  badge: string;
}

const BASE = "/api/prestataire-tarifs";

export function getCorpus(): Promise<{ ok: boolean; count: number; prestations: PrestationCorpus[] }> {
  return apiFetch(`${BASE}/corpus`);
}

export function searchTarifs(params: {
  prestation?: string;
  zone?: string;
  maxPrice?: number;
}): Promise<{ ok: boolean; count: number; results: TarifContractuel[] }> {
  const q = new URLSearchParams();
  if (params.prestation) q.set("prestation", params.prestation);
  if (params.zone) q.set("zone", params.zone);
  if (typeof params.maxPrice === "number") q.set("maxPrice", String(params.maxPrice));
  return apiFetch(`${BASE}/search?${q.toString()}`);
}

export function listByPrestataire(
  prestataireId: string,
): Promise<{ ok: boolean; prestataireId: string; count: number; tarifs: TarifContractuel[] }> {
  return apiFetch(`${BASE}/prestataire/${encodeURIComponent(prestataireId)}`);
}

export function getTarif(id: string): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(`${BASE}/${encodeURIComponent(id)}`);
}

export function comparePrice(
  id: string,
  clientPrice: number,
): Promise<{ ok: boolean; comparison?: ComparatorResult; error?: string }> {
  return apiFetch(
    `${BASE}/${encodeURIComponent(id)}/comparator?clientPrice=${encodeURIComponent(String(clientPrice))}`,
  );
}

export function createTarif(
  body: Omit<TarifContractuel, "id" | "status" | "hashContrat" | "createdAt" | "updatedAt" | "contratSignedAt">,
): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(BASE, { method: "POST", body });
}

export function updateTarif(
  id: string,
  patch: Partial<TarifContractuel>,
): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export function submitTarif(id: string): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(`${BASE}/${encodeURIComponent(id)}/submit`, { method: "POST" });
}

export function signContract(id: string): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(`${BASE}/${encodeURIComponent(id)}/contract`, { method: "POST" });
}

export function suspendTarif(id: string): Promise<{ ok: boolean; tarif: TarifContractuel }> {
  return apiFetch(`${BASE}/${encodeURIComponent(id)}/suspend`, { method: "POST" });
}

/** Helpers UX. */
export function formatMAD(n: number): string {
  return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n);
}

export function statusLabel(s: TarifStatus): string {
  switch (s) {
    case "BROUILLON": return "Brouillon";
    case "VALIDE_CITURBAREA": return "En validation CITURBAREA";
    case "PUBLIE": return "Publié — contrat scellé";
    case "SUSPENDU": return "Suspendu";
  }
}

export function uniteLabel(u: TarifUnite): string {
  switch (u) {
    case "m2": return "m²";
    case "ml": return "ml";
    case "h": return "heure";
    case "forfait": return "forfait";
    case "U": return "unité";
  }
}
