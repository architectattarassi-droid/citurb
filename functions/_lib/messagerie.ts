/**
 * Messagerie de la plateforme — logique pure (aucun accès réseau ni base).
 *
 * Règle du fondateur (CLAUDE.md, « tout passe par CITURBAREA ») : clients,
 * pros et fournisseurs n'échangent jamais leurs coordonnées. Ils s'écrivent
 * ici, dans un fil rattaché à un contexte (fiche pro, produit, demande de
 * prix, dossier, rendez-vous…), et s'appellent par « Demander un appel
 * vidéo » (functions/_lib/appels.ts) — chaque étape de l'appel apparaît dans
 * le fil comme événement.
 *
 * Mêmes règles d'accès et de qui-écrit-à-qui que les appels
 * (autoriserCreation), même masquage des coordonnées, mêmes blocages.
 * Contrat : docs/architecture/contrat-messagerie.md.
 */
import { detecterCoordonnees, type TypeCoordonnee } from "./coordonnees";
import { clip, masquerCoordonnees, type ContexteAppel, type DescripteurInvite, type Identite, type Langue, type TypeParticipant } from "./appels";

export const STATUTS_CONVERSATION = ["OUVERTE", "FERMEE", "SIGNALEE"] as const;
export type StatutConversation = (typeof STATUTS_CONVERSATION)[number];
export const TYPES_MESSAGE = ["TEXTE", "APPEL", "SYSTEME"] as const;
export type TypeMessage = (typeof TYPES_MESSAGE)[number];

export const MESSAGE_MAX = 4000;
export const ID_CONVERSATION_RE = /^cnv_[a-z0-9]{10,40}$/;
export const ID_MESSAGE_RE = /^msg_[a-z0-9]{10,40}$/;
/** Un participant n'est prévenu par e-mail qu'une fois par quart d'heure et par fil (s'il n'a pas lu entre-temps). */
export const DELAI_NOTIFICATION_MS = 15 * 60_000;

/** Débit (anti-spam) : par auteur et par fil. */
export const DEBIT_MESSAGES = { parAuteur10min: 30, parAuteur24h: 300, nouveauxFils24h: 5, nouveauxFilsAdmin24h: 100 } as const;

export type ParticipantConv = {
  id: string;
  type: TypeParticipant;
  cle: string;
  nom: string;
  /** Réservé au back-office et aux notifications ; jamais renvoyé aux autres participants. */
  email: string | null;
  telephone: string | null;
  langue: Langue;
  /** Comment ré-inviter cette personne (appel vidéo depuis le fil). */
  descripteur: DescripteurInvite | null;
  sel: string;
  jetonHash: string;
  luJusqua: string | null;
  notifieLe: string | null;
};

/**
 * Red flag « tentative de contact direct » (décision du fondateur) : chaque
 * message dont une coordonnée a été masquée compte une tentative pour son
 * auteur — horodatage et TYPE seulement (téléphone, e-mail, lien,
 * messagerie), jamais la coordonnée elle-même. Le cabinet est prévenu dès la
 * première ; à SEUIL_SUSPENSION tentatives sur 7 jours, le fil passe
 * « SIGNALEE » et l'auteur ne peut plus écrire jusqu'à la décision du cabinet.
 */
export type Alerte = { tentatives: string[]; types: TypeCoordonnee[]; suspendu: boolean; leveeLe: string | null };
export const SEUIL_SUSPENSION = 3;
export const FENETRE_ALERTE_MS = 7 * 24 * 3600_000;

export type Conversation = {
  id: string;
  contexte: ContexteAppel;
  objetId: string;
  sujet: string | null;
  statut: StatutConversation;
  /** contexte|objetId|clés triées : un seul fil ouvert par groupe de personnes et par sujet. */
  empreinte: string;
  createurCle: string;
  participants: ParticipantConv[];
  signalements: { le: string; par: string; motif: string }[];
  /** Tentatives de contact direct, par participant (absent sur les fils anciens). */
  alertes?: Record<string, Alerte>;
  dernierMessageLe: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  /** Participant auteur, ou « systeme » (événements d'appel). */
  auteurId: string;
  /** Identité stable de l'auteur (débit, blocage) ; jamais renvoyée dans une vue. */
  auteurCle: string;
  type: TypeMessage;
  texte: string;
  masque: boolean;
  /** APPEL : { appelId, evenement, creneau?, dureeMin? }. Documents (étape 2) : { documents: [{ id, nom }] }. */
  meta: Record<string, unknown>;
  /** Masqué par la modération (texte remplacé à l'affichage). */
  modere: boolean;
  createdAt: string;
};

const aleatoire = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
export const nouvelIdConversation = () => `cnv_${Date.now().toString(36)}${aleatoire(10)}`;
export const nouvelIdMessage = () => `msg_${Date.now().toString(36)}${aleatoire(10)}`;
export const nouvelIdParticipantConv = () => `cpp_${aleatoire(12)}`;

export const empreinteConversation = (contexte: string, objetId: string, cles: string[]) => `${contexte}|${objetId}|${[...cles].sort().join(",")}`;

/** Texte d'un message : borné, coordonnées masquées ; `types` = ce qui a été détecté (jamais la valeur). */
export function preparerTexte(v: unknown): { ok: true; texte: string; masque: boolean; types: TypeCoordonnee[] } | { ok: false; erreur: string } {
  const brut = clip(v, MESSAGE_MAX);
  if (!brut) return { ok: false, erreur: "message_vide" };
  const m = masquerCoordonnees(brut);
  const types = detecterCoordonnees(brut);
  return { ok: true, texte: m.texte, masque: m.masque || types.length > 0, types };
}

/** Tentatives comptées : dans les 7 derniers jours et après la dernière levée par le cabinet. */
export function tentativesActives(a: Alerte | undefined, maintenant: number): number {
  if (!a) return 0;
  return a.tentatives.filter((t) => maintenant - Date.parse(t) <= FENETRE_ALERTE_MS && (!a.leveeLe || t > a.leveeLe)).length;
}

/**
 * Enregistre une tentative (modifie la conversation). Renvoie si c'est la
 * première du participant dans ce fil et s'il vient d'être suspendu.
 */
export function enregistrerTentative(c: Conversation, participantId: string, types: TypeCoordonnee[], maintenant: number): { premiere: boolean; suspendu: boolean; nombre: number } {
  const le = new Date(maintenant).toISOString();
  c.alertes ??= {};
  const premiere = !c.alertes[participantId];
  const a = (c.alertes[participantId] ??= { tentatives: [], types: [], suspendu: false, leveeLe: null });
  a.tentatives = [...a.tentatives, le].slice(-50);
  a.types = [...new Set([...a.types, ...types])];
  const nombre = tentativesActives(a, maintenant);
  let suspendu = false;
  if (!a.suspendu && nombre >= SEUIL_SUSPENSION) {
    a.suspendu = suspendu = true;
    if (c.statut !== "FERMEE") c.statut = "SIGNALEE";
    c.signalements.push({ le, par: "systeme", motif: `Tentatives répétées de contact direct (${a.types.join(", ")}) : écriture suspendue` });
  }
  return { premiere, suspendu, nombre };
}

/** Décision du cabinet : l'auteur peut de nouveau écrire ; le compteur repart de zéro. */
export function leverSuspension(c: Conversation, participantId: string, maintenant: number): boolean {
  const a = c.alertes?.[participantId];
  if (!a) return false;
  a.suspendu = false;
  a.leveeLe = new Date(maintenant).toISOString();
  if (c.statut === "SIGNALEE" && !Object.values(c.alertes!).some((x) => x.suspendu)) c.statut = "OUVERTE";
  return true;
}

export const aDesAlertes = (c: Pick<Conversation, "alertes">) => !!c.alertes && Object.values(c.alertes).some((a) => a.tentatives.length > 0);

export function nouvelleConversation(
  args: { contexte: ContexteAppel; objetId: string; sujet: string | null },
  createur: ParticipantConv,
  autres: ParticipantConv[],
  id: string,
  maintenant: number,
): Conversation {
  const le = new Date(maintenant).toISOString();
  const participants = [{ ...createur, luJusqua: le }, ...autres];
  return {
    id, contexte: args.contexte, objetId: args.objetId, sujet: args.sujet, statut: "OUVERTE",
    empreinte: empreinteConversation(args.contexte, args.objetId, participants.map((p) => p.cle)),
    createurCle: createur.cle, participants, signalements: [], dernierMessageLe: le, version: 1, createdAt: le, updatedAt: le,
  };
}

export const participantDe = (identite: Identite, extra: { id: string; sel: string; jetonHash: string; descripteur: DescripteurInvite | null }): ParticipantConv => ({
  id: extra.id, type: identite.type, cle: identite.cle, nom: identite.nom, email: identite.email, telephone: identite.telephone,
  langue: identite.langue, descripteur: extra.descripteur, sel: extra.sel, jetonHash: extra.jetonHash, luJusqua: null, notifieLe: null,
});

/** Un participant peut-il écrire maintenant ? */
export function peutEcrire(c: Conversation, participantId: string | null): { ok: true } | { ok: false; status: number; erreur: string } {
  if (!participantId || !c.participants.some((p) => p.id === participantId)) return { ok: false, status: 403, erreur: "non_participant" };
  if (c.statut === "FERMEE") return { ok: false, status: 409, erreur: "conversation_fermee" };
  if (c.alertes?.[participantId]?.suspendu) return { ok: false, status: 403, erreur: "ecriture_suspendue" };
  return { ok: true };
}

export function verifierDebitMessages(k: { auteur10min: number; auteur24h: number }): { ok: true } | { ok: false; status: number; erreur: string } {
  if (k.auteur10min >= DEBIT_MESSAGES.parAuteur10min || k.auteur24h >= DEBIT_MESSAGES.parAuteur24h) return { ok: false, status: 429, erreur: "trop_de_messages" };
  return { ok: true };
}

/** Faut-il prévenir ce participant par e-mail ? (pas l'auteur, pas s'il a lu, pas plus d'une fois par quart d'heure). */
export function aPrevenir(p: ParticipantConv, auteurId: string, maintenant: number): boolean {
  if (p.id === auteurId) return false;
  if (p.notifieLe && maintenant - Date.parse(p.notifieLe) < DELAI_NOTIFICATION_MS && (!p.luJusqua || p.luJusqua < p.notifieLe)) return false;
  return true;
}

export const nonLus = (c: Pick<Conversation, "participants">, msgs: Pick<Message, "auteurId" | "createdAt">[], participantId: string) => {
  const p = c.participants.find((x) => x.id === participantId);
  return msgs.filter((m) => m.auteurId !== participantId && (!p?.luJusqua || m.createdAt > p.luJusqua)).length;
};

// ── Vues ────────────────────────────────────────────────────────────────

const TEXTE_MODERE = "[message retiré par la modération]";

export const vueMessage = (m: Message, c: Conversation, moiId: string | null, admin: boolean) => ({
  id: m.id,
  type: m.type,
  auteur: m.auteurId === "systeme" ? "CITURBAREA" : c.participants.find((p) => p.id === m.auteurId)?.nom ?? "—",
  moi: m.auteurId === moiId,
  texte: m.modere && !admin ? TEXTE_MODERE : m.texte,
  masque: m.masque,
  modere: m.modere,
  meta: m.meta,
  createdAt: m.createdAt,
});

/** Vue d'un participant : jamais les coordonnées des autres, ni jeton, ni sel. */
export function vueConversation(c: Conversation, moiId: string | null, admin = false) {
  const moi = c.participants.find((p) => p.id === moiId) ?? null;
  return {
    id: c.id, contexte: c.contexte, objetId: c.objetId, sujet: c.sujet, statut: c.statut, createdAt: c.createdAt, dernierMessageLe: c.dernierMessageLe,
    moi: moi ? { id: moi.id, nom: moi.nom, type: moi.type, langue: moi.langue, suspendu: !!c.alertes?.[moi.id]?.suspendu } : null,
    participants: c.participants.map((p) => ({
      id: p.id, type: p.type, nom: p.nom, moi: p.id === moiId, luJusqua: p.luJusqua,
      ...(admin ? { cle: p.cle, email: p.email, telephone: p.telephone } : {}),
    })),
    ...(admin ? {
      signalements: c.signalements,
      alertes: Object.entries(c.alertes ?? {}).map(([pid, a]) => ({
        participantId: pid, nom: c.participants.find((p) => p.id === pid)?.nom ?? "—", tentatives: a.tentatives.length,
        derniere: a.tentatives[a.tentatives.length - 1] ?? null, types: a.types, suspendu: a.suspendu, leveeLe: a.leveeLe,
      })),
    } : {}),
  };
}

export function resumeConversation(c: Conversation, moiId: string | null, dernier: Message | null, nbNonLus: number) {
  return {
    id: c.id, contexte: c.contexte, objetId: c.objetId, sujet: c.sujet, statut: c.statut, dernierMessageLe: c.dernierMessageLe,
    avec: c.participants.filter((p) => p.id !== moiId).map((p) => p.nom),
    apercu: dernier ? (dernier.modere ? TEXTE_MODERE : dernier.texte.slice(0, 140)) : "",
    nonLus: nbNonLus,
    alertes: Object.values(c.alertes ?? {}).reduce((n, a) => n + a.tentatives.length, 0),
    suspendus: Object.values(c.alertes ?? {}).filter((a) => a.suspendu).length,
  };
}

// ── Lien « boîte de réception » (visiteur / client sans compte) ─────────

const enc = new TextEncoder();
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
async function hmac(secret: string, d: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(d)));
}
export const DUREE_BOITE_S = 180 * 24 * 3600;

/** Lien signé de la boîte d'une identité (« b1.<exp>.<clé>.<hmac> ») : sans stockage, expirant (180 jours). */
export async function jetonBoite(secret: string, cle: string, maintenant = Date.now()): Promise<string> {
  const corps = `b1.${Math.floor(maintenant / 1000) + DUREE_BOITE_S}.${b64url(enc.encode(cle))}`;
  return `${corps}.${b64url(await hmac(secret, `boite|${corps}`))}`;
}

export async function lireJetonBoite(secret: string, jeton: string, maintenant = Date.now()): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "b1" || !/^\d+$/.test(p[1]) || jeton.length > 400) return null;
  let mac: Uint8Array;
  try { mac = deB64url(p[3]); } catch { return null; }
  const attendu = await hmac(secret, `boite|${p[0]}.${p[1]}.${p[2]}`);
  if (attendu.length !== mac.length || attendu.some((b, i) => b !== mac[i])) return null;
  if (Number(p[1]) < Math.floor(maintenant / 1000)) return null;
  try { return new TextDecoder().decode(deB64url(p[2])) || null; } catch { return null; }
}

export const motifSignalement = (v: unknown) => masquerCoordonnees(clip(v, 500)).texte || "sans motif";
