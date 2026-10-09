/**
 * Conversions unité de vente ↔ unité de référence, et statistiques de prix.
 * Fonctions pures, partagées par le front ET les Pages Functions (functions/).
 */
import { materiau } from "./catalogue";
import type { MaterialRef, UniteVente } from "./types";

const arrondi = (x: number, n = 4) => Math.round(x * 10 ** n) / 10 ** n;

/** Unités de vente admises pour un matériau, uniteRef (facteur 1) en tête. */
export function unitesVente(ref: MaterialRef): UniteVente[] {
  return [{ code: ref.uniteRef, libelle: ref.uniteRef, facteur: 1 }, ...ref.ventes];
}

export function uniteVente(ref: MaterialRef, code: string): UniteVente | undefined {
  return unitesVente(ref).find((u) => u.code === code);
}

/** Prix par unité de vente → prix par uniteRef (null si unité inconnue pour ce matériau). */
export function prixParUniteRef(code: string, uniteCode: string, prix: number): number | null {
  const ref = materiau(code);
  const u = ref && uniteVente(ref, uniteCode);
  if (!u || !(prix >= 0)) return null;
  return arrondi(prix / u.facteur);
}

/** Prix par uniteRef → prix par unité de vente. */
export function prixParUniteVente(code: string, uniteCode: string, prixRef: number): number | null {
  const ref = materiau(code);
  const u = ref && uniteVente(ref, uniteCode);
  if (!u) return null;
  return arrondi(prixRef * u.facteur, 2);
}

/** Quantité en uniteRef (issue d'un métré / sous-détail) → nombre d'unités de vente à commander (arrondi au-dessus). */
export function quantiteACommander(code: string, uniteCode: string, quantiteRef: number): number | null {
  const ref = materiau(code);
  const u = ref && uniteVente(ref, uniteCode);
  if (!u) return null;
  return Math.ceil(arrondi(quantiteRef / u.facteur, 6));
}

export function mediane(valeurs: number[]): number | null {
  const v = valeurs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const k = Math.floor(v.length / 2);
  return v.length % 2 ? v[k] : (v[k - 1] + v[k]) / 2;
}

/** Écart relatif d'un prix (par uniteRef) à la référence de recherche : 0,6 = +60 %. */
export function ecartReference(code: string, prixRef: number): number | null {
  const ref = materiau(code);
  if (!ref || !ref.prix.ref) return null;
  return arrondi(prixRef / ref.prix.ref - 1, 3);
}

/** Seuil de signalement à la modération (hors ±50 % de la référence) : signalé, jamais bloqué. */
export const SEUIL_ABERRANT = 0.5;
export function prixAberrant(code: string, prixRef: number): boolean {
  const e = ecartReference(code, prixRef);
  return e !== null && Math.abs(e) > SEUIL_ABERRANT;
}
