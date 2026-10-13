/**
 * Navigation « Par fournisseur » de la matériauthèque (contrat
 * docs/architecture/contrat-catalogue.md, « Navigation par fournisseur ») :
 *   GET /api/catalogue/fournisseurs?region=               → pros vérifiés ayant des produits publiés
 *   GET /api/catalogue/fournisseurs/:slug/produits        → fournisseur + produits groupés par famille
 * Textes {fr, ar}, images modérées ; ni coordonnées ni prix nominatif.
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
  metier: Texte | null;
  /** Familles de produits publiées (libellé bilingue, nombre). */
  familles: { famille: string; libelle: Texte; nb: number }[];
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
const estTexte = (v: unknown): v is Texte => !!v && typeof v === "object" && typeof (v as Texte).fr === "string" && !!(v as Texte).fr.trim();
const texteOuChaine = (v: unknown, ar?: unknown): Texte | null =>
  estTexte(v) ? { fr: v.fr, ...(typeof v.ar === "string" && v.ar ? { ar: v.ar } : {}) } : texteDe(v, ar);
const texteDe = (fr: unknown, ar: unknown): Texte | null => {
  const f = txt(fr), a = txt(ar);
  return f || a ? { fr: (f || a)!, ...(a ? { ar: a } : {}) } : null;
};

/** Images d'un produit : `images` [{url, vignette, legende}] (contrat catalogue), sinon `photos` [url] ou `photoUrl`. */
export function normaliserImages(p: Record<string, unknown>): ImageProduit[] {
  const out: ImageProduit[] = [];
  // Principale d'abord, puis par ordre (contrat : images [{url, vignette, principale, ordre, legende}]).
  const brutes = Array.isArray(p.images)
    ? [...(p.images as Record<string, unknown>[])].filter((i) => i && typeof i === "object")
      .sort((a, b) => Number(b.principale === true) - Number(a.principale === true) || (Number(a.ordre) || 0) - (Number(b.ordre) || 0))
    : [];
  if (brutes.length)
    for (const i of brutes) {
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
  const nom = texteOuChaine(f.nom) || texteDe(f.raisonSociale, f.raisonSocialeAr);
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !nom) return null;
  return {
    slug, nom, ville: txt(f.ville), zonesLivraison: liste(f.zonesLivraison), categories: liste(f.categories),
    verifie: f.verifie === true, documentsVerifies: f.documentsVerifies === true, nbProduits: Number(f.nbProduits) || 0,
    logoUrl: https(f.logoUrl), metier: texteOuChaine(f.metierLibelle) || texteOuChaine(f.metier),
    familles: (Array.isArray(f.familles) ? (f.familles as Record<string, unknown>[]) : [])
      .map((x) => ({ famille: txt(x?.famille) || "", libelle: texteOuChaine(x?.libelle) || { fr: txt(x?.famille) || "" }, nb: Number(x?.nb) || 0 }))
      .filter((x) => x.famille),
  };
}

/** Produit d'un fournisseur : variante du catalogue (codeReference, designation {fr, ar}) ou ancienne vue (designationFr/Ar, materiauCode). */
export function normaliserProduitFournisseur(p: Record<string, unknown>): ProduitFournisseur | null {
  const id = txt(p.id);
  const designation = texteOuChaine(p.designation) || texteDe(p.designationFr, p.designationAr);
  if (!id || !designation) return null;
  const code = txt(p.codeReference) || txt(p.materiauCode);
  const cond = Array.isArray(p.conditionnements) ? (p.conditionnements as Record<string, unknown>[])[0] : null;
  return {
    id, designation, description: texteOuChaine(p.description) || texteDe(p.descriptionFr, p.descriptionAr), marque: txt(p.marque), modele: txt(p.modele),
    famille: txt(p.famille), categorie: txt(p.categorie), materiauCode: code && /^CIT-[A-Z]{2,3}-\d{3}$/.test(code) ? code : null,
    conditionnement: txt(p.conditionnement) || (cond ? texteOuChaine(cond.libelle)?.fr ?? null : null), images: normaliserImages(p), ficheTechniqueUrl: https(p.ficheTechniqueUrl),
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
    json(`/api/catalogue/fournisseurs${ville ? `?region=${encodeURIComponent(ville)}` : ""}`).then((j) => {
      if (!vivant) return;
      const brut = Array.isArray(j?.fournisseurs) ? (j!.fournisseurs as Record<string, unknown>[]) : [];
      setL(brut.map(normaliserFournisseur).filter((x): x is FournisseurResume => !!x));
    });
    return () => { vivant = false; };
  }, [ville]);
  return l;
}

export interface GroupeProduits { famille: string; libelle: Texte; produits: ProduitFournisseur[] }
export interface PageFournisseur { fournisseur: FournisseurResume; groupes: GroupeProduits[]; produits: ProduitFournisseur[] }

/** Réponse de GET /api/catalogue/fournisseurs/:slug/produits (pure, testée). */
export function normaliserPageFournisseur(j: Record<string, unknown> | null): PageFournisseur | null {
  const f = j?.fournisseur && typeof j.fournisseur === "object" ? normaliserFournisseur(j.fournisseur as Record<string, unknown>) : null;
  if (!f) return null;
  const groupes: GroupeProduits[] = (Array.isArray(j!.familles) ? (j!.familles as Record<string, unknown>[]) : []).map((g) => ({
    famille: txt(g?.famille) || "", libelle: texteOuChaine(g?.libelle) || { fr: txt(g?.famille) || "" },
    produits: (Array.isArray(g?.produits) ? (g.produits as Record<string, unknown>[]) : [])
      .map(normaliserProduitFournisseur).filter((x): x is ProduitFournisseur => !!x),
  })).filter((g) => g.produits.length);
  const produits = groupes.flatMap((g) => g.produits);
  return { fournisseur: { ...f, nbProduits: f.nbProduits || produits.length }, groupes, produits };
}

/** Page d'un fournisseur ; undefined pendant le chargement, null si introuvable ou base pas prête. */
export function useFournisseur(slug: string): PageFournisseur | null | undefined {
  const [d, setD] = useState<PageFournisseur | null | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    setD(undefined);
    json(`/api/catalogue/fournisseurs/${encodeURIComponent(slug)}/produits`).then((j) => { if (vivant) setD(normaliserPageFournisseur(j)); });
    return () => { vivant = false; };
  }, [slug]);
  return d;
}
