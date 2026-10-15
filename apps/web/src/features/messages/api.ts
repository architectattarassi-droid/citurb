/**
 * Messagerie — client des Pages Functions. Portes d'entrée :
 *   lien   /api/messages/lien/<jeton>          (lien personnel d'un fil)
 *   boite  /api/messages/boite/<jeton signé>   (tous les fils d'un visiteur / client sans compte)
 *   admin  /api/cc/messages                    (back-office, modération)
 *   pro    /api/cercles/espace/messages        (cookie de l'espace pro)
 *   client /api/client/messages                (cookie de l'espace client, lot 3a)
 * Premier message d'un visiteur : POST /api/messages.
 */
import type { DemandeVue, Resultat } from "../appels/api";

export type EspaceMsg = { type: "lien"; jeton: string } | { type: "admin" } | { type: "pro" } | { type: "client" };
export type PorteMsg = "public" | "admin" | "pro" | "client";

export type MessageVue = {
  id: string; type: "TEXTE" | "APPEL" | "SYSTEME"; auteur: string; moi: boolean; texte: string; masque: boolean; modere: boolean; createdAt: string;
  meta: { appelId?: string; evenement?: string; par?: string | null; statut?: string; creneau?: string | null; dureeMin?: number; participants?: string[] } & Record<string, unknown>;
};
export type ConversationVue = {
  id: string; contexte: string; objetId: string; sujet: string | null; statut: string; createdAt: string; dernierMessageLe: string;
  moi: { id: string; nom: string; type: string; langue: "fr" | "ar" } | null;
  participants: { id: string; type: string; nom: string; moi: boolean; luJusqua: string | null; cle?: string; email?: string | null; telephone?: string | null }[];
  signalements?: { le: string; par: string; motif: string }[];
};
export type FilVue = {
  conversation: ConversationVue; messages: MessageVue[];
  appels: { id: string; vue?: DemandeVue; jetonAppel?: string }[];
  peut: { ecrire: boolean; appeler: boolean; bloquer: boolean; signaler: boolean; moderer: boolean };
};
export type ResumeFil = {
  id: string; contexte: string; objetId: string; sujet: string | null; statut: string; dernierMessageLe: string; avec: string[]; apercu: string; nonLus: number;
  jeton?: string; participe?: boolean; signale?: boolean;
};
export type CreationFil = { conversation: ConversationVue | null; conversationId?: string; messageMasque?: boolean; jeton?: string; lien?: string; boite?: string; lienBoite?: string };

async function appeler<T>(url: string, methode: "GET" | "POST" = "GET", corps?: unknown): Promise<Resultat<T>> {
  try {
    const r = await fetch(url, {
      method: methode, credentials: "include", cache: "no-store",
      headers: corps === undefined ? undefined : { "content-type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    if (r.ok && j?.ok) return { ok: true, data: j as T };
    return { ok: false, status: r.status, error: String(j?.error || (r.status === 404 ? "not_found" : "defaut")) };
  } catch {
    return { ok: false, status: 0, error: "reseau" };
  }
}

const enc = encodeURIComponent;
function chemin(e: EspaceMsg, id: string, action?: "messages" | "appel" | "signaler" | "bloquer" | "moderer"): string {
  const suite = action ? `/${action}` : "";
  switch (e.type) {
    case "lien": return `/api/messages/lien/${enc(e.jeton)}${suite}`;
    case "admin": return `/api/cc/messages/${enc(id)}${suite}`;
    case "pro": return `/api/cercles/espace/messages/${enc(id)}${suite}`;
    case "client": return `/api/client/messages/${enc(id)}${suite}`;
  }
}

export const apiMessages = {
  creer(porte: PorteMsg, corps: Record<string, unknown>) {
    const url = porte === "admin" ? "/api/cc/messages" : porte === "pro" ? "/api/cercles/espace/messages" : porte === "client" ? "/api/client/messages" : "/api/messages";
    return appeler<CreationFil>(url, "POST", corps);
  },
  boite(e: { type: "admin"; statut?: string } | { type: "pro" } | { type: "client" } | { type: "boite"; jeton: string }) {
    const url = e.type === "admin" ? `/api/cc/messages${e.statut ? `?statut=${enc(e.statut)}` : ""}` : e.type === "pro" ? "/api/cercles/espace/messages" : e.type === "client" ? "/api/client/messages" : `/api/messages/boite/${enc(e.jeton)}`;
    return appeler<{ conversations: ResumeFil[] }>(url);
  },
  lire: (e: EspaceMsg, id = "") => appeler<FilVue>(chemin(e, id)),
  ecrire: (e: EspaceMsg, id: string, texte: string) => appeler<{ message: MessageVue; messageMasque: boolean }>(chemin(e, id, "messages"), "POST", { texte }),
  appel: (e: EspaceMsg, id: string, corps: Record<string, unknown>) => appeler<{ appelId: string; jetonAppel: string }>(chemin(e, id, "appel"), "POST", corps),
  signaler: (e: EspaceMsg, id: string, motif: string) => appeler<{ signale: boolean }>(chemin(e, id, "signaler"), "POST", { motif }),
  bloquer: (e: EspaceMsg, id: string) => appeler<{ bloque: boolean }>(chemin(e, id, "bloquer"), "POST", {}),
  moderer: (id: string, corps: { messageId: string; modere: boolean } | { statut: "OUVERTE" | "FERMEE" }) => appeler<Record<string, unknown>>(chemin({ type: "admin" }, id, "moderer"), "POST", corps),
};
