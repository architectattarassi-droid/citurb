/**
 * Chargement des prix marché des fournisseurs Cercles pour le chiffrage :
 * GET /api/prix/materiaux et GET /api/prix/ouvrages (Pages Functions, contrats
 * docs/prix/contrat-fournisseurs-chiffrage.md §2 et docs/architecture/contrat-catalogue.md),
 * puis `definirPrixMarche` (domain/chiffrage/marche.ts). Hors ligne, base
 * indisponible ou réponse inattendue : aucun prix marché, le chiffrage garde
 * ses prix de recherche.
 */
import { definirPrixMarche, type DonneesMarche } from "../chiffrage/marche";
import type { Marche } from "./marche";
import { regionDe } from "./regions";

const estMarche = (m: unknown): m is Marche =>
  !!m && typeof m === "object" && typeof (m as Marche).nbFournisseurs === "number";

async function lire(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch { return null; }
}

/** Données marché d'une région (ville ou code de région), sans les installer. */
export async function lirePrixMarche(villeOuRegion: string | null): Promise<DonneesMarche | null> {
  const region = villeOuRegion ? regionDe(villeOuRegion) : null;
  const q = region ? `?region=${encodeURIComponent(region)}` : "";
  const [mat, ouv] = await Promise.all([lire(`/api/prix/materiaux${q}`), lire(`/api/prix/ouvrages${q}`)]);
  if (!mat && !ouv) return null;
  const materiaux: DonneesMarche["materiaux"] = {};
  for (const l of Array.isArray(mat?.materiaux) ? (mat!.materiaux as Record<string, unknown>[]) : []) {
    if (typeof l.code === "string" && estMarche(l.marche)) materiaux[l.code] = l.marche;
  }
  const ouvrages: DonneesMarche["ouvrages"] = {};
  for (const o of Array.isArray(ouv?.ouvrages) ? (ouv!.ouvrages as Record<string, unknown>[]) : []) {
    const m = (o.marche || {}) as Record<string, unknown>;
    const fp = estMarche(m.FOURNI_POSE) ? m.FOURNI_POSE : undefined, pose = estMarche(m.POSE) ? m.POSE : undefined;
    if (typeof o.code === "string" && (fp || pose)) ouvrages[o.code] = { ...(fp ? { FOURNI_POSE: fp } : {}), ...(pose ? { POSE: pose } : {}) };
  }
  if (!Object.keys(materiaux).length && !Object.keys(ouvrages).length) return null;
  return { region, genereLe: String(mat?.genereLe || ouv?.genereLe || new Date().toISOString()), materiaux, ouvrages };
}

/** Charge et installe les prix marché de la région ; renvoie les données (null : prix de recherche seuls). */
export async function chargerPrixMarche(villeOuRegion: string | null): Promise<DonneesMarche | null> {
  const d = await lirePrixMarche(villeOuRegion);
  definirPrixMarche(d);
  return d;
}
