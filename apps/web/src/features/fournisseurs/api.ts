/**
 * Client des Pages Functions Cercles fournisseurs (même origine, cookie
 * frn_session HttpOnly posé par /api/cercles/acces/verifier).
 */

export interface FournisseurPublic {
  slug: string; raisonSociale: string; metier: string; metierLibelle: string; ville: string; region: string | null;
  zonesLivraison: string[]; categories: string[]; logoUrl: string | null; description: string | null; verifie: boolean; membreDepuis: string | null;
}
export interface FournisseurPrive extends FournisseurPublic {
  id: string; statut: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"; contactNom: string | null; telephone: string; email: string;
  ice: string | null; siteWeb: string | null; motifRejet: string | null;
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

export class ErreurApi extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) { super(code); }
}

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

export const apiFournisseurs = {
  inscrire: (corps: Record<string, unknown>) => post<{ ok: true; message: string }>("/api/cercles/inscription", corps),
  demanderCode: (email: string) => post<{ ok: true; envoi: "email" | "admin"; message: string }>("/api/cercles/acces/demande", { email }),
  verifierCode: (email: string, code: string) => post<{ ok: true }>("/api/cercles/acces/verifier", { email, code }),
  deconnexion: () => post<{ ok: true }>("/api/cercles/acces/deconnexion", {}),
  moi: () => appel<{ ok: true; fournisseur: FournisseurPrive; fiches: Fiche[]; peutPublierFiches: boolean }>("/api/cercles/espace/moi"),
  majProfil: (corps: Record<string, unknown>) => post<{ ok: true; fournisseur: FournisseurPrive }>("/api/cercles/espace/moi", corps, "PUT"),
  enregistrerFiche: (f: FicheSaisie) => post<{ ok: true; fiche: Fiche }>("/api/cercles/espace/fiches", f),
  importer: (lignes: FicheSaisie[]) =>
    post<{ ok: true; importees: number; erreurs: number; resultats: { ligne: number; ok: boolean; materiauCode?: string; error?: string; signalement?: string | null }[] }>(
      "/api/cercles/espace/fiches/import", { lignes }),
  supprimerFiche: (id: string) => appel<{ ok: true }>(`/api/cercles/espace/fiches/${encodeURIComponent(id)}`, { method: "DELETE" }),
  historique: (id: string) => appel<{ ok: true; historique: { at: string; action: string; prixHT: number; uniteVente: string; prixRefHT: number }[] }>(
    `/api/cercles/espace/fiches/${encodeURIComponent(id)}`),
};

/** Messages lisibles pour les codes d'erreur des fonctions. */
export const MESSAGES_ERREUR: Record<string, string> = {
  metier_invalid: "Choisissez votre métier.",
  raison_sociale_invalid: "Indiquez la raison sociale (2 caractères minimum).",
  ville_invalid: "Indiquez votre ville.",
  phone_invalid: "Numéro de téléphone invalide (ex. 06 12 34 56 78).",
  email_invalid: "Adresse e-mail invalide.",
  ice_invalid: "L'ICE compte 15 chiffres.",
  conditions_required: "Merci d'accepter les conditions de mise en relation.",
  logo_invalid: "Le logo doit être une adresse https://…",
  too_many_requests: "Trop de tentatives. Réessayez dans quelques minutes.",
  code_invalid: "Code incorrect.",
  code_expired: "Code expiré ou trop d'essais : demandez un nouveau code.",
  unauthenticated: "Session expirée : reconnectez-vous.",
  materiau_inconnu: "Matériau inconnu du catalogue.",
  unite_invalide: "Unité de vente non prévue pour ce matériau.",
  prix_invalide: "Prix HT invalide.",
  tva_invalide: "TVA : 0, 7, 10, 14 ou 20 %.",
  quantite_min_invalide: "Quantité minimale invalide.",
  degressif_invalide: "Prix dégressifs : quantités croissantes, prix décroissants et inférieurs au prix de base.",
  livraison_invalide: "Frais ou délai de livraison invalide.",
  disponibilite_invalide: "Disponibilité invalide.",
  validite_invalide: "Date de validité invalide (aujourd'hui à 13 mois).",
  metier_sans_fiches: "Les fiches de prix matériaux sont réservées aux fournisseurs, entreprises et artisans.",
  doublon: "Matériau en double dans le fichier.",
  storage_unavailable: "Service momentanément indisponible. Réessayez plus tard.",
  not_installed: "Le service fournisseurs est en cours d'ouverture. Réessayez bientôt.",
  access_not_configured: "Le service fournisseurs est en cours d'ouverture. Réessayez bientôt.",
};
export const messageErreur = (e: unknown): string =>
  e instanceof ErreurApi ? MESSAGES_ERREUR[e.code] || `Erreur (${e.code}).` : "Connexion impossible. Vérifiez votre réseau.";
