/**
 * Appels vidéo sur demande — client des Pages Functions.
 * Quatre portes d'entrée, une même interface :
 *   lien   /api/appels/lien/<jeton>        (lien personnel, sans mot de passe)
 *   admin  /api/cc/appels                  (back-office)
 *   pro    /api/cercles/espace/appels      (cookie de l'espace pro)
 *   membre /api/projets/appels             (cookie de l'espace projet)
 *   client /api/client/appels              (cookie de l'espace client, lot 3a)
 * Création par un visiteur sans compte : POST /api/appels.
 */
import type { ConfigVisio } from "../visio/SalleVisio";

export type Contexte = "dossier" | "chantier" | "reunion" | "cercles" | "fournisseur" | "rdv";
export type Invite =
  | { type: "admin" }
  | { type: "pro"; slug?: string; id?: string }
  | { type: "client"; dossierId: string }
  | { type: "membre"; id: string }
  | { type: "rdv"; id: string };

export type Espace = { type: "lien"; jeton: string } | { type: "admin" } | { type: "pro" } | { type: "membre" } | { type: "client" };
export type PorteCreation = "public" | "admin" | "pro" | "membre" | "client";

export type ParticipantVue = {
  id: string; role: "DEMANDEUR" | "INVITE"; type: string; nom: string; statut: string; creneaux: string[]; toutCreneau: boolean; moi: boolean;
  cle?: string; email?: string | null; telephone?: string | null; reponduLe?: string | null; jetonsVisio?: number;
};
export type TraceVue = {
  consentements: { participantId: string; nom: string; accepte: boolean | null; le: string | null }[];
  enregistrementAutorise: boolean;
  enregistrement: { statut: "AUCUN" | "EN_COURS" | "TERMINE" | "CONSERVE" | "NON_CONSERVE"; documentId: string | null; dureeS: number | null; motif: string | null };
  finalite: string; conservationMois: number;
  entrees: { nom: string | null; le: string }[];
  evenements: { type: string; nom: string | null; le: string }[];
  duree: { debut: string | null; fin: string | null; minutes: number | null };
  compteRendu: null | { auteurId: string; auteur: string | null; texte: string; masque: boolean; le: string; statut: "PROPOSE" | "VALIDE" | "CONTESTE";
    avis: { participantId: string; nom: string | null; accord: boolean; remarque: string | null; le: string }[] };
};
export type DemandeVue = {
  id: string; contexte: Contexte; objetId: string; sujet: string | null; statut: string; creneaux: string[]; desQuePossible: boolean;
  dureeMin: number; message: string | null; audioSeul: boolean; creneauRetenu: string | null; fenetre: { ouverture: string; fermeture: string } | null;
  expireLe: string; createdAt: string;
  moi: { id: string; role: string; statut: string; creneaux: string[]; langue: "fr" | "ar" } | null;
  participants: ParticipantVue[];
  historique: { le: string; action: string; par: string; detail?: string }[];
  peut: { accepter: boolean; contreProposer: boolean; refuser: boolean; annuler: boolean; bloquer: boolean; rejoindre: boolean };
  /** Trace : consentements à l'enregistrement, entrées, événements, durée, compte rendu (functions/_lib/appelsTrace.ts). */
  trace?: TraceVue;
  cabinetParticipe?: boolean;
};
export type ResumeAppel = {
  id: string; contexte: Contexte; objetId: string; sujet: string | null; statut: string; creneaux: string[]; desQuePossible: boolean;
  creneauRetenu: string | null; dureeMin: number; avec: string[]; monStatut: string | null; monRole: string | null; aRepondre: boolean;
  createdAt: string; updatedAt: string; cabinetParticipe?: boolean;
};

export type Resultat<T> = { ok: true; data: T } | { ok: false; status: number; error: string; extra?: Record<string, unknown> };

async function appeler<T>(url: string, methode: "GET" | "POST" = "GET", corps?: unknown): Promise<Resultat<T>> {
  try {
    const r = await fetch(url, {
      method: methode, credentials: "include", cache: "no-store",
      headers: corps === undefined ? undefined : { "content-type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    if (r.ok && j?.ok) return { ok: true, data: j as T };
    return { ok: false, status: r.status, error: String(j?.error || (r.status === 404 ? "not_found" : "defaut")), extra: j || undefined };
  } catch {
    return { ok: false, status: 0, error: "reseau" };
  }
}

const enc = encodeURIComponent;

/** Chemin d'une demande (et d'une action) selon la porte d'entrée. */
function chemin(e: Espace, id: string, action?: "repondre" | "visio" | "bloquer" | "whatsapp" | "enregistrement" | "compte-rendu" | "avis"): string {
  const suite = action ? `/${action}` : "";
  switch (e.type) {
    case "lien": return `/api/appels/lien/${enc(e.jeton)}${suite}`;
    case "admin": return `/api/cc/appels/${enc(id)}${suite}`;
    case "pro": return `/api/cercles/espace/appels/${enc(id)}${suite}`;
    case "membre": return `/api/projets/appels/${enc(id)}${suite}`;
    case "client": return `/api/client/appels/${enc(id)}${suite}`;
  }
}

export type ReponseCreation = { demande: DemandeVue | null; lien?: string; jeton?: string; messageMasque?: boolean; notifications?: number };

export const apiAppels = {
  creer(porte: PorteCreation, corps: Record<string, unknown>) {
    const url = porte === "admin" ? "/api/cc/appels" : porte === "pro" ? "/api/cercles/espace/appels" : porte === "membre" ? "/api/projets/appels" : porte === "client" ? "/api/client/appels" : "/api/appels";
    return appeler<ReponseCreation>(url, "POST", corps);
  },
  lister(e: Exclude<Espace, { type: "lien" }>, statut?: string) {
    const q = statut ? `?statut=${enc(statut)}` : "";
    const url = e.type === "admin" ? `/api/cc/appels${q}` : e.type === "pro" ? `/api/cercles/espace/appels${q}` : e.type === "client" ? `/api/client/appels${q}` : `/api/projets/appels${q}`;
    return appeler<{ demandes: ResumeAppel[] }>(url);
  },
  lire: (e: Espace, id = "") => appeler<{ demande: DemandeVue; visioIntegree: boolean }>(chemin(e, id)),
  repondre: (e: Espace, id: string, corps: { action: "accepter" | "contre" | "refuser" | "annuler"; creneaux?: string[] }) =>
    appeler<{ demande: DemandeVue; evenement?: string }>(chemin(e, id, "repondre"), "POST", corps),
  visio: (e: Espace, id: string) => appeler<{ config: ConfigVisio; audioSeul: boolean; nom: string; enregistrement?: boolean }>(chemin(e, id, "visio"), "POST", {}),
  enregistrement: (e: Espace, id: string, accepte: boolean) => appeler<{ demande: DemandeVue }>(chemin(e, id, "enregistrement"), "POST", { accepte }),
  compteRendu: (e: Espace, id: string, texte: string) => appeler<{ demande: DemandeVue }>(chemin(e, id, "compte-rendu"), "POST", { texte }),
  avis: (e: Espace, id: string, accord: boolean, remarque?: string) => appeler<{ demande: DemandeVue }>(chemin(e, id, "avis"), "POST", { accord, remarque }),
  bloquer: (e: Espace, id: string) => appeler<{ demande: DemandeVue }>(chemin(e, id, "bloquer"), "POST", {}),
  whatsapp: (id: string, participantId: string) => appeler<{ url: string; avecNumero: boolean }>(chemin({ type: "admin" }, id, "whatsapp"), "POST", { participantId }),
};
