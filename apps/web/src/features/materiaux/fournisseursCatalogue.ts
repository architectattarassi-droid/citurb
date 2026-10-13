/**
 * Navigation « Par fournisseur » de la matériauthèque. Lectures publiques
 * existantes de la session Cercles (functions/) :
 *   GET /api/cercles/annuaire?groupe=MATERIAUX&region=  → fournisseurs approuvés (vue publique, nombre de produits)
 *   GET /api/cercles/pro/:slug                           → société + produits (photos), sans prix nominatif ni coordonnées
 * Normalisation défensive : champ inattendu ignoré, URL non https ignorée,
 * aucune coordonnée conservée même si elle était renvoyée par erreur.
 * Endpoint absent, hors ligne ou base vide → listes vides (état vide propre).
 */
import { useEffect, useState } from "react";
import type { Texte } from "./catalogueProduits";

export interface ImageProduit { url: string; vignette?: string; legende?: Texte }

export interface FournisseurResume {
  slug: string;
  nom: Texte;
  ville: string | null;
  zonesLivraison: string[];
  categories: string[];
  verifie: boolean;
  documentsVerifies: boolean;
  nbProduits: number;
  logoUrl: string | null;
  metier: string | null;
}

export interface ProduitFournisseur {
  id: string;
  designation: Texte;
  description: Texte | null;
  marque: string | null;
  modele: string | null;
  famille: string | null;
  categorie: string | null;
  materiauCode: string | null;
  conditionnement: string | null;
  images: ImageProduit[];
  ficheTechniqueUrl: string | null;
}

const https = (u: unknown): string | null => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);
const txt = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const texteDe = (fr: unknown, ar: unknown): Texte | null => {
  const f = txt(fr), a = txt(ar);
  return f || a ? { fr: (f || a)!, ...(a ? { ar: a } : {}) } : null;
};

/** Images d'un produit : `images` [{url, vignette, legende}] (contrat catalogue), sinon `photos` [url] ou `photoUrl`. */
export function normaliserImages(p: Record<string, unknown>): ImageProduit[] {
  const out: ImageProduit[] = [];
  if (Array.isArray(p.images))
    for (const i of p.images as Record<string, unknown>[]) {
      const url = https(i?.url);
      if (!url) continue;
      const leg = i.legende as Texte | undefined;
      out.push({ url, ...(https(i.vignette) ? { vignette: https(i.vignette)! } : {}), ...(leg && typeof leg.fr === "string" ? { legende: { fr: leg.fr, ...(typeof leg.ar === "string" ? { ar: leg.ar } : {}) } } : {}) });
    }
  for (const u of [...liste(p.photos), p.photoUrl]) { const url = https(u); if (url && !out.some((x) => x.url === url)) out.push({ url }); }
  return out.slice(0, 12);
}

export function normaliserFournisseur(f: Record<string, unknown>): FournisseurResume | null {
  const slug = txt(f.slug);
  const nom = texteDe(f.raisonSociale, f.raisonSocialeAr);
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !nom) return null;
  return {
    slug, nom, ville: txt(f.ville), zonesLivraison: liste(f.zonesLivraison), categories: liste(f.categories),
    verifie: f.verifie === true, documentsVerifies: f.documentsVerifies === true, nbProduits: Number(f.nbProduits) || 0,
    logoUrl: https(f.logoUrl), metier: txt(f.metierLibelle) || txt(f.metier),
  };
}

export function normaliserProduitFournisseur(p: Record<string, unknown>): ProduitFournisseur | null {
  const id = txt(p.id);
  const designation = texteDe(p.designationFr, p.designationAr) || (p.designation as Texte | undefined) || null;
  if (!id || !designation || typeof designation.fr !== "string") return null;
  const code = txt(p.materiauCode);
  return {
    id, designation, description: texteDe(p.descriptionFr, p.descriptionAr), marque: txt(p.marque), modele: txt(p.modele),
    famille: txt(p.famille), categorie: txt(p.categorie), materiauCode: code && /^CIT-[A-Z]{2,3}-\d{3}$/.test(code) ? code : null,
    conditionnement: txt(p.conditionnement), images: normaliserImages(p), ficheTechniqueUrl: https(p.ficheTechniqueUrl),
  };
}

async function json(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url);
    return r.ok && (r.headers.get("content-type") || "").includes("json") ? ((await r.json()) as Record<string, unknown>) : null;
  } catch { return null; }
}

/** Fournisseurs de matériaux approuvés (null pendant le chargement). */
export function useFournisseurs(ville: string): FournisseurResume[] | null {
  const [l, setL] = useState<FournisseurResume[] | null>(null);
  useEffect(() => {
    let vivant = true;
    setL(null);
    json(`/api/cercles/annuaire?groupe=MATERIAUX&limite=200${ville ? `&region=${encodeURIComponent(ville)}` : ""}`).then((j) => {
      if (!vivant) return;
      const brut = Array.isArray(j?.fournisseurs) ? (j!.fournisseurs as Record<string, unknown>[]) : [];
      setL(brut.map(normaliserFournisseur).filter((x): x is FournisseurResume => !!x));
    });
    return () => { vivant = false; };
  }, [ville]);
  return l;
}

/** Fiche d'un fournisseur et ses produits ; undefined pendant le chargement, null si introuvable. */
export function useFournisseur(slug: string): { fournisseur: FournisseurResume; produits: ProduitFournisseur[] } | null | undefined {
  const [d, setD] = useState<{ fournisseur: FournisseurResume; produits: ProduitFournisseur[] } | null | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    setD(undefined);
    json(`/api/cercles/pro/${encodeURIComponent(slug)}`).then((j) => {
      if (!vivant) return;
      const f = j?.fournisseur && typeof j.fournisseur === "object" ? normaliserFournisseur(j.fournisseur as Record<string, unknown>) : null;
      const produits = Array.isArray(j?.produits) ? (j!.produits as Record<string, unknown>[]).map(normaliserProduitFournisseur).filter((x): x is ProduitFournisseur => !!x) : [];
      setD(f ? { fournisseur: { ...f, nbProduits: f.nbProduits || produits.length }, produits } : null);
    });
    return () => { vivant = false; };
  }, [slug]);
  return d;
}
