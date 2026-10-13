/**
 * Produits fournisseurs approuvés (marques, modèles, conditionnements),
 * rattachés à un code de référence CIT : GET /api/catalogue/produits
 * (contrat docs/architecture/contrat-catalogue.md). Aucune liste figée :
 * un produit approuvé apparaît automatiquement sous la fiche de son code.
 * Endpoint absent, hors ligne ou base indisponible → liste vide.
 */
import { useEffect, useState } from "react";
import type { Lang } from "../../i18n/i18n";
import { CATEGORIES, type Categorie, type MaterialRef, type UniteRef } from "../../domain/materiaux/types";
import { enregistrerCodesModeres, estCodeModere } from "../../domain/materiaux/catalogue";
import { slugifier } from "../../domain/materiaux/reference";
import { normaliserImages, type ImageProduit } from "./fournisseursCatalogue";

export type Texte = { fr: string; ar?: string; en?: string };

export interface ProduitCatalogue {
  id: string;
  codeReference: string;
  marque: string | null;
  modele: string | null;
  designation: Texte;
  description?: Texte | null;
  caracteristiques?: { libelle: Texte; valeur: Texte }[];
  conditionnements?: { code: string; libelle: Texte; facteur: number }[];
  photoUrl?: string | null;
  ficheTechniqueUrl?: string | null;
  nbFournisseurs?: number;
  prix?: { mediane: number; min: number; max: number; nbFournisseurs: number; majLe?: string } | null;
  majLe?: string;
  /** Galerie (images principale, galerie, vignettes) — normalisée par normaliserImages. */
  images?: ImageProduit[];
  /** Fournisseurs qui proposent la variante (lien fiche publique, jamais de coordonnées). */
  fournisseurs?: { slug: string; nom: Texte; ville: string | null; documentsVerifies: boolean }[];
}

/** Texte dans la langue demandée, repli sur le français. */
export function texteLocal(t: Texte | string | null | undefined, lang: Lang): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return (lang === "ar" ? t.ar : lang === "en" ? t.en : t.fr) || t.fr || "";
}

const estTexte = (v: unknown): v is Texte => !!v && typeof v === "object" && typeof (v as Texte).fr === "string";
const urlSure = (u: unknown) => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);

/** Filtre défensif d'une réponse externe : champs inattendus ignorés. */
export function normaliserProduits(j: unknown): ProduitCatalogue[] {
  const l = (j as { produits?: unknown })?.produits;
  if (!Array.isArray(l)) return [];
  return l.filter((p): p is ProduitCatalogue => !!p && typeof p === "object" && typeof p.id === "string"
    && typeof p.codeReference === "string" && /^CIT-[A-Z]{2,3}-\d{3}$/.test(p.codeReference) && estTexte(p.designation))
    .map((p) => ({ ...p, photoUrl: urlSure(p.photoUrl), ficheTechniqueUrl: urlSure(p.ficheTechniqueUrl),
      prix: p.prix && p.prix.nbFournisseurs >= 3 && p.prix.mediane > 0 ? p.prix : null,
      images: normaliserImages(p as unknown as Record<string, unknown>),
      fournisseurs: (Array.isArray(p.fournisseurs) ? p.fournisseurs : [])
        .filter((x) => x && typeof x.slug === "string" && /^[a-z0-9-]{2,80}$/.test(x.slug) && estTexte(x.nom))
        .map((x) => ({ slug: x.slug, nom: x.nom, ville: typeof x.ville === "string" ? x.ville : null, documentsVerifies: x.documentsVerifies === true })) }));
}

/** Médiane fournisseurs la mieux étayée parmi les produits d'un code (≥ 3 fournisseurs, sinon null). */
export function medianeProduits(l: ProduitCatalogue[] | undefined): { mediane: number; nbFournisseurs: number } | null {
  const p = (l || []).filter((x) => x.prix).sort((a, b) => b.prix!.nbFournisseurs - a.prix!.nbFournisseurs)[0];
  return p?.prix ? { mediane: p.prix.mediane, nbFournisseurs: p.prix.nbFournisseurs } : null;
}

let requete: Promise<Map<string, ProduitCatalogue[]>> | null = null;

function charger(): Promise<Map<string, ProduitCatalogue[]>> {
  requete ||= fetch("/api/catalogue/produits")
    .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
    .then((j) => {
      const m = new Map<string, ProduitCatalogue[]>();
      for (const p of normaliserProduits(j)) m.set(p.codeReference, [...(m.get(p.codeReference) || []), p]);
      return m;
    })
    .catch(() => new Map());
  return requete;
}

/** Produits approuvés groupés par code de référence (Map vide tant que rien n'est publié). */
export function useProduits(): Map<string, ProduitCatalogue[]> {
  const [m, setM] = useState<Map<string, ProduitCatalogue[]>>(new Map());
  useEffect(() => {
    let vivant = true;
    charger().then((x) => vivant && setM(x));
    return () => { vivant = false; };
  }, []);
  return m;
}

// ─────────────── codes créés en modération (GET /api/catalogue/referentiel) ───────────────
// Seuls les codes SANS parent sont ajoutés ici : ceux qui ont un parent sont
// publiés comme variantes du code générique (produits, codeReference = parent).
// Aucun prix de référence : prix fournisseurs agrégés (≥ 3) ou « prix sur demande ».


export interface CodeModere { ref: MaterialRef; libelle: Texte; slug: string }

const UNITES: UniteRef[] = ["kg", "t", "m3", "m2", "ml", "u", "l", "ens"];

/** Slug d'un code modéré : désignation + suffixe du code (jamais en collision avec le catalogue statique). */
export const slugModere = (code: string, libelleFr: string) => `${slugifier(libelleFr)}-${code.slice(4).toLowerCase()}`;

export function normaliserReferentiel(j: unknown): CodeModere[] {
  const l = (j as { codes?: unknown })?.codes;
  if (!Array.isArray(l)) return [];
  const out: CodeModere[] = [];
  for (const c of l as Record<string, unknown>[]) {
    if (!c || typeof c.code !== "string" || !estCodeModere(c.code) || c.parent) continue;
    if (!estTexte(c.libelle) || !(typeof c.categorie === "string" && c.categorie in CATEGORIES)) continue;
    const uniteRef = UNITES.includes(c.uniteRef as UniteRef) ? (c.uniteRef as UniteRef) : "u";
    const ref: MaterialRef = {
      code: c.code, libelle: c.libelle.fr, categorie: c.categorie as Categorie, famille: typeof c.famille === "string" ? c.famille : CATEGORIES[c.categorie as Categorie],
      lots: Array.isArray(c.lots) ? c.lots.filter((x): x is string => typeof x === "string") : [], uniteRef, ventes: [],
      prix: { min: 0, ref: 0, max: 0, fiabilite: "C", source: "Code créé à la modération d'une fiche fournisseur (sans prix de recherche)" }, alias: {},
    };
    out.push({ ref, libelle: c.libelle, slug: slugModere(c.code, c.libelle.fr) });
  }
  return out;
}

let requeteRef: Promise<CodeModere[]> | null = null;

/** Codes modérés sans parent ; null tant que la lecture n'est pas terminée. */
export function useCodesModeres(): CodeModere[] | null {
  const [l, setL] = useState<CodeModere[] | null>(null);
  useEffect(() => {
    let vivant = true;
    requeteRef ||= fetch("/api/catalogue/referentiel")
      .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
      .then((j) => { const c = normaliserReferentiel(j); enregistrerCodesModeres(c.map((x) => x.ref)); return c; })
      .catch(() => []);
    requeteRef.then((x) => vivant && setL(x));
    return () => { vivant = false; };
  }, []);
  return l;
}
