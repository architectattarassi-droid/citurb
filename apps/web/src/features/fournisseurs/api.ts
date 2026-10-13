/**
 * Client des Pages Functions Cercles (même origine ; cookie frn_session
 * HttpOnly posé par /api/cercles/acces/verifier pour l'espace pro).
 * Contrat : docs/architecture/contrat-catalogue.md. Les messages d'erreur
 * lisibles (FR/AR/EN) sont dans textes.ts (`useTextes().erreur(code)`).
 */
import type { DocumentPro, ReferenceChantier, Score } from "../../domain/cercles/gabarits";

/** Champs du gabarit du métier (domain/cercles/gabarits.ts) ; `references` : chantiers. */
export type FicheSociete = Record<string, unknown> & { references?: ReferenceChantier[] };

export interface FournisseurPublic {
  slug: string; raisonSociale: string; raisonSocialeAr: string | null; metier: string; metierLibelle: string; ville: string; region: string | null;
  zonesLivraison: string[]; categories: string[]; logoUrl: string | null; description: string | null; descriptionAr: string | null;
  verifie: boolean; documentsVerifies: boolean; fiche: FicheSociete; membreDepuis: string | null;
}
export interface FournisseurPrive extends FournisseurPublic {
  id: string; statut: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"; contactNom: string | null; telephone: string; email: string;
  ice: string | null; siteWeb: string | null; motifRejet: string | null; documents: DocumentPro[]; formule: string;
}
export interface Livraison { zone: string; frais: number; delaiJours: number | null }
export interface Degressif { aPartirDe: number; prixHT: number }
export interface Fiche {
  id: string; materiauCode: string; libelle: string; uniteRef: string | null; uniteVente: string; uniteVenteLibelle: string;
  prixHT: number; tvaPct: number; prixTTC: number; prixRefHT: number; quantiteMin: number | null; degressifs: Degressif[]; livraison: Livraison[];
  disponibilite: string; validiteJusquau: string | null; marque: string | null; note: string | null;
  statut: "PENDING" | "APPROVED" | "REJECTED"; signalement: string | null; ecartRef: number | null; updatedAt: string | null;
}
export interface FicheSaisie {
  materiauCode: string; uniteVente: string; prixHT: number | string; tvaPct?: number; quantiteMin?: number | string | null;
  degressifs?: Degressif[]; livraison?: Livraison[]; disponibilite?: string; validiteJusquau?: string; marque?: string; note?: string;
}
export type StatutOffre = "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
/** Fiche produit : vue publique (sans prix ni statut) ; champs facultatifs = vue propriétaire. */
export interface Produit {
  id: string; slug: string; famille: string; categorie: string; designationFr: string | null; designationAr: string | null;
  descriptionFr: string | null; descriptionAr: string | null; marque: string | null; modele: string | null; gamme: string | null;
  caracteristiques: Record<string, unknown>; uniteVente: string; conditionnement: string | null; uniteRef: string; facteur: number;
  quantiteMin: number | null; delaiJours: number | null; zones: string[]; disponibilite: string; validiteJusquau: string | null;
  photos: string[]; ficheTechniqueUrl: string | null; materiauCode: string | null; misAJour: string | null; images?: ImagePublique[];
  prixHT?: number; tvaPct?: number; prixTTC?: number; prixRefHT?: number; degressifs?: Degressif[];
  statut?: StatutOffre; codePropose?: string | null; signalement?: string | null; ecartRef?: number | null; motifRejet?: string | null;
}
export interface Service {
  id: string; nature: string; ouvrageCode: string | null; prestationCode: string | null; designationFr: string | null; designationAr: string | null;
  descriptionFr: string | null; descriptionAr: string | null; unite: string; zones: string[]; delaiJours: number | null; conditions: string | null;
  validiteJusquau: string | null; photos: string[]; misAJour: string | null; images?: ImagePublique[];
  prixHT?: number; tvaPct?: number; prixTTC?: number; statut?: StatutOffre; signalement?: string | null; ecartRef?: number | null; motifRejet?: string | null;
}
export interface Moi { ok: true; fournisseur: FournisseurPrive; fiches: Fiche[]; peutPublierFiches: boolean; produits: Produit[]; services: Service[]; score: Score }
export interface ProAnnuaire extends FournisseurPublic { nbProduits: number; nbServices: number; nbFiches: number; codesCouverts?: string[] }
export interface FichePro {
  ok: true; fournisseur: FournisseurPublic; produits: Produit[]; services: Service[]; imagesSociete?: ImagePublique[];
  materiauxChiffres: { materiauCode: string; libelle: string; uniteVenteLibelle: string; disponibilite: string; marque: string | null; majLe: string | null }[];
}

/** Image d'une fiche (vue propriétaire) ; publique : url / vignette en /api/catalogue/images/… */
export interface ImagePro {
  id: string; objetType: "PRODUIT" | "SERVICE" | "SOCIETE"; objetId: string; ordre: number; principale: boolean; legendeFr: string | null; legendeAr: string | null;
  statut: "PENDING" | "APPROVED" | "REJECTED"; motifRejet: string | null; largeur: number; hauteur: number; taille: number; url: string; vignette: string;
}
export interface ImagePublique { id: string; url: string; vignette: string; principale: boolean; ordre: number; legende: { fr: string; ar?: string } | null; largeur: number; hauteur: number }
export interface QuotaImages { nb: number; octets: number; maxNb: number; maxOctets: number; parFiche: number }

export class ErreurApi extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) { super(code); }
}
/** Code d'erreur des Pages Functions (null : réseau). */
export const codeErreur = (e: unknown): string | null => (e instanceof ErreurApi ? e.code : null);

async function appel<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(chemin, {
    credentials: "same-origin",
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers || {}) },
  });
  let j: Record<string, unknown> = {};
  try { j = await r.json(); } catch { /* réponse vide */ }
  if (!r.ok || j.ok === false) throw new ErreurApi(r.status, String(j.error || `http_${r.status}`), j);
  return j as T;
}

const post = <T,>(chemin: string, corps: unknown, methode = "POST") => appel<T>(chemin, { method: methode, body: JSON.stringify(corps) });
const id_ = (id: string) => encodeURIComponent(id);

export const apiFournisseurs = {
  inscrire: (corps: Record<string, unknown>) => post<{ ok: true; message: string }>("/api/cercles/inscription", corps),
  demanderCode: (email: string) => post<{ ok: true; envoi: "email" | "admin"; message: string }>("/api/cercles/acces/demande", { email }),
  verifierCode: (email: string, code: string) => post<{ ok: true }>("/api/cercles/acces/verifier", { email, code }),
  deconnexion: () => post<{ ok: true }>("/api/cercles/acces/deconnexion", {}),
  moi: () => appel<Moi>("/api/cercles/espace/moi"),
  majProfil: (corps: Record<string, unknown>) => post<{ ok: true; fournisseur: FournisseurPrive }>("/api/cercles/espace/moi", corps, "PUT"),
  enregistrerFiche: (f: FicheSaisie) => post<{ ok: true; fiche: Fiche }>("/api/cercles/espace/fiches", f),
  importer: (lignes: FicheSaisie[]) =>
    post<{ ok: true; importees: number; erreurs: number; resultats: { ligne: number; ok: boolean; materiauCode?: string; error?: string; signalement?: string | null }[] }>(
      "/api/cercles/espace/fiches/import", { lignes }),
  supprimerFiche: (id: string) => appel<{ ok: true }>(`/api/cercles/espace/fiches/${id_(id)}`, { method: "DELETE" }),
  historique: (id: string) => appel<{ ok: true; historique: { at: string; action: string; prixHT: number; uniteVente: string; prixRefHT: number }[] }>(
    `/api/cercles/espace/fiches/${id_(id)}`),
  deposerDocument: (corps: { type: string; url?: string; note?: string; expireLe?: string }) =>
    post<{ ok: true; documents: DocumentPro[] }>("/api/cercles/espace/documents", corps),
  retirerDocument: (id: string) => appel<{ ok: true; documents: DocumentPro[] }>(`/api/cercles/espace/documents/${id_(id)}`, { method: "DELETE" }),
  enregistrerProduit: (id: string | null, corps: Record<string, unknown>) =>
    post<{ ok: true; produit: Produit }>(id ? `/api/cercles/espace/produits/${id_(id)}` : "/api/cercles/espace/produits", corps, id ? "PUT" : "POST"),
  retirerProduit: (id: string) => appel<{ ok: true }>(`/api/cercles/espace/produits/${id_(id)}`, { method: "DELETE" }),
  enregistrerService: (id: string | null, corps: Record<string, unknown>) =>
    post<{ ok: true; service: Service }>(id ? `/api/cercles/espace/services/${id_(id)}` : "/api/cercles/espace/services", corps, id ? "PUT" : "POST"),
  retirerService: (id: string) => appel<{ ok: true }>(`/api/cercles/espace/services/${id_(id)}`, { method: "DELETE" }),
  annuaire: (params: Record<string, string>) =>
    appel<{ ok: true; total: number; fournisseurs: ProAnnuaire[] }>(`/api/cercles/annuaire?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`),
  fichePro: (slug: string) => appel<FichePro>(`/api/cercles/pro/${id_(slug)}`),
  images: () => appel<{ ok: true; images: ImagePro[]; quota: QuotaImages }>("/api/cercles/espace/images"),
  deposerImage: (corps: { objetType: string; objetId: string; image: string; vignette: string; legendeFr?: string; legendeAr?: string }) =>
    post<{ ok: true; image: ImagePro }>("/api/cercles/espace/images", corps),
  majImage: (id: string, corps: { ordre?: number; legendeFr?: string; legendeAr?: string; principale?: true }) =>
    post<{ ok: true; image: ImagePro }>(`/api/cercles/espace/images/${id_(id)}`, corps, "PATCH"),
  retirerImage: (id: string) => appel<{ ok: true }>(`/api/cercles/espace/images/${id_(id)}`, { method: "DELETE" }),
  contacter: (corps: Record<string, unknown>) => post<{ ok: true; message: string }>("/api/cercles/contact", corps),
};
