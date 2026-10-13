/**
 * Produits fournisseurs approuvés (marques, modèles, conditionnements),
 * rattachés à un code de référence CIT : GET /api/catalogue/produits
 * (contrat docs/architecture/contrat-catalogue.md). Aucune liste figée :
 * un produit approuvé apparaît automatiquement sous la fiche de son code.
 * Endpoint absent, hors ligne ou base indisponible → liste vide.
 */
import { useEffect, useState } from "react";
import type { Lang } from "../../i18n/i18n";

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
      prix: p.prix && p.prix.nbFournisseurs >= 3 && p.prix.mediane > 0 ? p.prix : null }));
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
