/**
 * Prix marché des fournisseurs Cercles (contrat docs/prix/contrat-fournisseurs-chiffrage.md §2).
 * Fonctions pures : la Page Function GET /api/prix/materiaux lit Neon puis
 * appelle `agregerMarche`, les tests lui passent des fiches en mémoire.
 *
 * Règles :
 *  - fiches APPROVED, de fournisseurs APPROVED non fictifs, validité non
 *    dépassée, mises à jour depuis moins de 120 jours ;
 *  - fournisseur qui livre la région demandée (sa région, sa zone, ou « national ») ;
 *  - une déclinaison (parent) compte aussi pour le matériau générique ;
 *  - un fournisseur = une voix (sa fiche la plus récente pour le code) ;
 *  - CONFIDENTIALITÉ : sous 3 fournisseurs distincts, aucun prix n'est publié
 *    (une médiane de 1 ou 2 offres révélerait le tarif d'un fournisseur) ;
 *    seul le nombre d'offres est rendu, et le prix de recherche reste « indicatif ».
 */
import { CATALOGUE } from "./catalogue";
import { mediane } from "./conversions";
import { regionDe } from "./regions";

export const MIN_FOURNISSEURS_PUBLICATION = 3;
export const FRAICHEUR_JOURS = 120;

export interface FicheMarche {
  materiauCode: string;
  prixRefHT: number;
  updatedAt: string;
  validiteJusquau: string | null;
  fournisseurId: string;
  fournisseurRegion: string | null;
  zonesLivraison: string[];
}

export interface Marche {
  /** null sous MIN_FOURNISSEURS_PUBLICATION fournisseurs. */
  mediane: number | null;
  min: number | null;
  max: number | null;
  nbOffres: number;
  nbFournisseurs: number;
  fiabilite: "A" | null;
  plusRecente: string | null;
}

export function livreRegion(f: Pick<FicheMarche, "fournisseurRegion" | "zonesLivraison">, region: string | null): boolean {
  if (!region) return true;
  if (f.zonesLivraison.includes("national")) return true;
  if (f.zonesLivraison.length) return f.zonesLivraison.includes(region);
  return f.fournisseurRegion === region;
}

const PARENT = new Map(CATALOGUE.filter((r) => r.parent).map((r) => [r.code, r.parent!]));
const arrondi = (x: number) => Math.round(x * 100) / 100;

/**
 * `parentDe` (facultatif) : parent des codes absents du catalogue statique
 * (codes créés à la modération, CIT-<PFX>-9NN, table "MateriauReferentiel").
 * Sert aussi aux offres de services : `materiauCode` porte alors le code
 * d'ouvrage ou de prestation (functions/_lib/catalogue.ts).
 */
export function agregerMarche(fiches: FicheMarche[], regionDemandee: string | null, maintenant = Date.now(), parentDe?: (code: string) => string | null | undefined): Record<string, Marche> {
  const region = regionDemandee ? regionDe(regionDemandee) : null;
  const limite = maintenant - FRAICHEUR_JOURS * 86_400_000;
  const jour = new Date(maintenant).toISOString().slice(0, 10);
  // code → fournisseur → fiche la plus récente
  const parCode = new Map<string, Map<string, FicheMarche>>();
  for (const f of fiches) {
    if (!(f.prixRefHT > 0) || Date.parse(f.updatedAt) < limite) continue;
    if (f.validiteJusquau && f.validiteJusquau.slice(0, 10) < jour) continue;
    if (!livreRegion(f, region)) continue;
    for (const code of [f.materiauCode, PARENT.get(f.materiauCode) ?? parentDe?.(f.materiauCode)].filter(Boolean) as string[]) {
      const m = parCode.get(code) || new Map<string, FicheMarche>();
      const d = m.get(f.fournisseurId);
      if (!d || d.updatedAt < f.updatedAt) m.set(f.fournisseurId, f);
      parCode.set(code, m);
    }
  }
  const out: Record<string, Marche> = {};
  for (const [code, m] of parCode) {
    const l = [...m.values()];
    const prix = l.map((x) => x.prixRefHT);
    const publie = m.size >= MIN_FOURNISSEURS_PUBLICATION;
    out[code] = {
      mediane: publie ? arrondi(mediane(prix)!) : null,
      min: publie ? arrondi(Math.min(...prix)) : null,
      max: publie ? arrondi(Math.max(...prix)) : null,
      nbOffres: l.length, nbFournisseurs: m.size, fiabilite: publie ? "A" : null,
      plusRecente: publie ? l.map((x) => x.updatedAt).sort().pop()!.slice(0, 10) : null,
    };
  }
  return out;
}

/** Nombre de fournisseurs approuvés qui livrent la région, par catégorie du catalogue. */
export function fournisseursParCategorie(
  fournisseurs: { region: string | null; zonesLivraison: string[]; categories: string[] }[],
  regionDemandee: string | null,
): Record<string, number> {
  const region = regionDemandee ? regionDe(regionDemandee) : null;
  const out: Record<string, number> = {};
  for (const f of fournisseurs) {
    if (!livreRegion({ fournisseurRegion: f.region, zonesLivraison: f.zonesLivraison }, region)) continue;
    for (const c of new Set(f.categories)) out[c] = (out[c] || 0) + 1;
  }
  return out;
}
