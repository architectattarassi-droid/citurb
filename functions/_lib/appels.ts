/**
 * Appels vidéo SUR DEMANDE — logique pure (aucun accès réseau ni base).
 *
 * Principe fondateur : une demande ne déclenche JAMAIS un appel. La salle
 * n'existe (nom tiré au sort) et un jeton JaaS n'est délivré qu'une fois la
 * demande CONFIRMÉE, c'est-à-dire quand le demandeur ET chaque invité ont
 * accepté un MÊME créneau ; ensuite seulement dans la fenêtre
 * [début − 10 min, début + 2 h], et seulement à un participant.
 *
 * Machine à états (statut global) :
 *   EN_ATTENTE ──(tous d'accord sur un créneau)──▶ CONFIRMEE ──(fin + 2 h)──▶ TERMINEE
 *        │  └──(un invité refuse)──▶ REFUSEE
 *        ├──(annulation, par n'importe quel participant)──▶ ANNULEE  (aussi depuis CONFIRMEE)
 *        └──(plus aucun créneau possible / délai dépassé)──▶ EXPIREE
 * Statut par participant : EN_ATTENTE | ACCEPTE | REFUSE | CONTRE_PROPOSITION.
 *
 * Tout est à l'heure UTC en base ; l'affichage est fait à l'heure du Maroc
 * (Africa/Casablanca) et à l'heure locale du lecteur (diaspora).
 * Contrat d'intégration : docs/architecture/contrat-appels-video.md.
 */
import { nouvelleSalle, type Contexte as ContexteSalle } from "./visio";

export const CONTEXTES_APPEL = ["dossier", "chantier", "reunion", "cercles", "fournisseur", "rdv"] as const;
export type ContexteAppel = (typeof CONTEXTES_APPEL)[number];
export const TYPES_PARTICIPANT = ["client", "pro", "fournisseur", "admin"] as const;
export type TypeParticipant = (typeof TYPES_PARTICIPANT)[number];
export const STATUTS_PARTICIPANT = ["EN_ATTENTE", "ACCEPTE", "REFUSE", "CONTRE_PROPOSITION"] as const;
export type StatutParticipant = (typeof STATUTS_PARTICIPANT)[number];
export const STATUTS_DEMANDE = ["EN_ATTENTE", "CONFIRMEE", "REFUSEE", "ANNULEE", "EXPIREE", "TERMINEE"] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];
export type Langue = "fr" | "ar";

// ── Réglages (hypothèses documentées, faciles à changer) ────────────────
export const MAX_CRENEAUX_PROPOSES = 3;
export const MAX_CRENEAUX_TOTAL = 9;
export const MAX_INVITES = 5;
export const DUREES = [15, 30, 45, 60, 90] as const;
/** Un créneau doit commencer au plus tôt maintenant − 5 min (« tout de suite »), au plus tard dans 30 jours. */
export const TOLERANCE_PASSE_MS = 5 * 60_000;
export const HORIZON_MS = 30 * 24 * 3600_000;
/** « Dès que possible » : la demande reste ouverte 72 h. */
export const DELAI_DES_QUE_POSSIBLE_MS = 72 * 3600_000;
/** Salle joignable de 10 min avant à 2 h après le début. */
export const OUVERTURE_MS = 10 * 60_000;
export const FERMETURE_MS = 2 * 3600_000;
/** Lien personnel « à usage limité » : nombre maximal de jetons JaaS délivrés par participant et par appel. */
export const MAX_JETONS_VISIO = 20;
/** Rappel envoyé quand l'appel commence dans moins de 60 min. */
export const RAPPEL_AVANT_MS = 60 * 60_000;

/** Débit (anti-harcèlement). */
export const DEBIT = {
  parDemandeur24h: 5,
  parDemandeurAdmin24h: 60,
  parPaire7j: 3,
  recuesParDestinataire24h: 20,
  recuesCabinet24h: 200,
} as const;

export const CLE_CABINET = "admin:cabinet";

// ── Types ───────────────────────────────────────────────────────────────

export type Participant = {
  id: string;
  role: "DEMANDEUR" | "INVITE";
  type: TypeParticipant;
  /** Identité stable : admin:cabinet, frn:<id>, usr:<id>, membre:<id>, rdv:<id>, vis:<empreinte>. */
  cle: string;
  nom: string;
  /** Coordonnées : visibles du seul back-office, jamais renvoyées aux autres participants. */
  email: string | null;
  telephone: string | null;
  langue: Langue;
  statut: StatutParticipant;
  /** Créneaux (ISO UTC) que ce participant accepte. */
  creneaux: string[];
  /** Demandeur « dès que possible » : accepte tout créneau proposé par les invités dans les 72 h. */
  toutCreneau: boolean;
  /** Sel de dérivation du lien personnel (le lien lui-même n'est jamais stocké). */
  sel: string;
  jetonHash: string;
  jetonsVisio: number;
  reponduLe: string | null;
};

export type Evenement = { le: string; par: string; action: string; detail?: string };

export type Demande = {
  id: string;
  contexte: ContexteAppel;
  objetId: string;
  sujet: string | null;
  demandeurCle: string;
  statut: StatutDemande;
  creneaux: string[];
  desQuePossible: boolean;
  dureeMin: number;
  message: string | null;
  audioSeul: boolean;
  creneauRetenu: string | null;
  salle: string | null;
  expireLe: string;
  rappelEnvoye: boolean;
  historique: Evenement[];
  participants: Participant[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Erreur = { ok: false; status: number; erreur: string; extra?: Record<string, unknown> };
const ko = (status: number, erreur: string, extra?: Record<string, unknown>): Erreur => ({ ok: false, status, erreur, ...(extra ? { extra } : {}) });

// ── Nettoyage ───────────────────────────────────────────────────────────

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
export const clip = (v: unknown, n: number): string =>
  typeof v === "string" ? Array.from(v.replace(CONTROLE, "").replace(SURROGATE_ISOLE, "�").trim()).slice(0, n).join("") : "";

const MASQUE = "[coordonnées masquées]";
const MOTIFS_COORDONNEES: RegExp[] = [
  /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi, // e-mails
  /\b(?:https?:\/\/|www\.)\S+/gi, // liens
  /\b(?:wa\.me|t\.me|chat\.whatsapp\.com|signal\.me)\/\S*/gi, // messageries
  /\b[a-z0-9-]+\.(?:com|ma|fr|net|org|io|me|co)\b(?:\/\S*)?/gi, // domaines nus
  /(?:\+|00)[1-9](?:[\s.\-()]*\d){7,13}/g, // numéros internationaux
  /\b0[5-7](?:[\s.\-]*\d){8}\b/g, // numéros marocains (les montants et dates restent lisibles)
];

/**
 * Anti-désintermédiation : la demande passe par la plateforme, pas
 * d'échange de coordonnées. E-mails, numéros, liens et pseudos de messagerie
 * sont remplacés avant enregistrement.
 */
export function masquerCoordonnees(texte: string): { texte: string; masque: boolean } {
  let t = texte, masque = false;
  for (const m of MOTIFS_COORDONNEES) t = t.replace(m, () => { masque = true; return MASQUE; });
  return { texte: t, masque };
}

export const OBJET_RE = /^[A-Za-z0-9:_.\-]{1,120}$/;
export const ID_DEMANDE_RE = /^apl_[a-z0-9]{10,40}$/;
export const ID_PARTICIPANT_RE = /^app_[a-z0-9]{6,40}$/;
export const JETON_APPEL_RE = /^[A-Za-z0-9_-]{43}$/;

const aleatoire = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
export const nouvelIdDemande = () => `apl_${Date.now().toString(36)}${aleatoire(10)}`;
export const nouvelIdParticipant = () => `app_${aleatoire(12)}`;
export const nouveauSel = () => aleatoire(24);

// ── Créneaux ────────────────────────────────────────────────────────────

/** Normalise un créneau (ISO UTC à la minute) ; null s'il est illisible, passé ou trop lointain. */
export function normaliserCreneau(v: unknown, maintenant: number): string | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  const m = Math.floor(t / 60_000) * 60_000;
  if (m < maintenant - TOLERANCE_PASSE_MS || m > maintenant + HORIZON_MS) return null;
  return new Date(m).toISOString();
}

function lireCreneaux(v: unknown, maintenant: number, min: number, max: number): string[] | Erreur {
  if (!Array.isArray(v)) return ko(400, "creneaux_invalides");
  const l: string[] = [];
  for (const x of v) {
    const c = normaliserCreneau(x, maintenant);
    if (!c) return ko(400, "creneau_invalide");
    if (!l.includes(c)) l.push(c);
  }
  if (l.length < min || l.length > max) return ko(400, "creneaux_invalides");
  return l.sort();
}

/** Expiration : quand plus aucun créneau proposé n'est atteignable (plafond 30 jours après la création). */
export function calculerExpiration(d: Pick<Demande, "creneaux" | "desQuePossible" | "createdAt">): string {
  const cree = Date.parse(d.createdAt);
  const dernier = d.creneaux.length ? Math.max(...d.creneaux.map((c) => Date.parse(c))) : cree;
  const fin = d.desQuePossible ? Math.max(cree + DELAI_DES_QUE_POSSIBLE_MS, dernier) : dernier;
  return new Date(Math.min(fin + TOLERANCE_PASSE_MS, cree + HORIZON_MS)).toISOString();
}

// ── Création ────────────────────────────────────────────────────────────

export type DescripteurInvite =
  | { type: "admin" }
  | { type: "pro"; slug?: string; id?: string }
  | { type: "client"; dossierId: string }
  | { type: "membre"; id: string }
  | { type: "rdv"; id: string };

export type EntreeCreation = {
  contexte: ContexteAppel;
  objetId: string;
  sujet: string | null;
  invites: DescripteurInvite[];
  creneaux: string[];
  desQuePossible: boolean;
  dureeMin: number;
  message: string | null;
  messageMasque: boolean;
  audioSeul: boolean;
};

const ID_LIBRE = /^[A-Za-z0-9_.\-]{1,80}$/;

function lireInvite(v: unknown): DescripteurInvite | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const id = (k: string) => (typeof o[k] === "string" && ID_LIBRE.test(o[k] as string) ? (o[k] as string) : null);
  switch (o.type) {
    case "admin": return { type: "admin" };
    case "pro": case "fournisseur": {
      const slug = id("slug"), pid = id("id");
      return slug || pid ? { type: "pro", ...(slug ? { slug } : {}), ...(pid ? { id: pid } : {}) } : null;
    }
    case "client": { const x = id("dossierId"); return x ? { type: "client", dossierId: x } : null; }
    case "membre": { const x = id("id"); return x ? { type: "membre", id: x } : null; }
    case "rdv": { const x = id("id"); return x ? { type: "rdv", id: x } : null; }
    default: return null;
  }
}

/** Validation stricte du corps d'une nouvelle demande. */
export function validerCreation(b: unknown, maintenant: number): EntreeCreation | Erreur {
  if (!b || typeof b !== "object" || Array.isArray(b)) return ko(400, "payload_invalid");
  const o = b as Record<string, unknown>;
  if (!(CONTEXTES_APPEL as readonly string[]).includes(String(o.contexte))) return ko(400, "contexte_invalide");
  const objetId = typeof o.objetId === "string" ? o.objetId.trim() : "";
  if (!OBJET_RE.test(objetId)) return ko(400, "objet_invalide");
  if (!Array.isArray(o.invites) || !o.invites.length || o.invites.length > MAX_INVITES) return ko(400, "invites_invalides");
  const invites: DescripteurInvite[] = [];
  for (const x of o.invites) {
    const i = lireInvite(x);
    if (!i) return ko(400, "invites_invalides");
    if (invites.some((y) => JSON.stringify(y) === JSON.stringify(i))) continue;
    invites.push(i);
  }
  const desQuePossible = o.desQuePossible === true;
  let creneaux: string[] = [];
  if (!desQuePossible) {
    const c = lireCreneaux(o.creneaux, maintenant, 1, MAX_CRENEAUX_PROPOSES);
    if (!Array.isArray(c)) return c;
    creneaux = c;
  }
  const dureeMin = o.dureeMin === undefined ? 30 : Number(o.dureeMin);
  if (!(DUREES as readonly number[]).includes(dureeMin)) return ko(400, "duree_invalide");
  const brut = clip(o.message, 1000);
  const { texte, masque } = masquerCoordonnees(brut);
  const sujet = masquerCoordonnees(clip(o.sujet, 120)).texte || null;
  return { contexte: o.contexte as ContexteAppel, objetId, sujet, invites, creneaux, desQuePossible, dureeMin, message: texte || null, messageMasque: masque, audioSeul: o.audioSeul === true };
}

/** Qui demande : back-office, pro connecté (Cercles), membre d'un projet (chantier), visiteur / client sans session. */
export type GenreActeur = "admin" | "pro" | "membre" | "public";

const PERMIS: Record<GenreActeur, { contextes: readonly ContexteAppel[]; invites: readonly DescripteurInvite["type"][]; max: number }> = {
  // Le cabinet peut inviter tout le monde, sauf lui-même.
  admin: { contextes: CONTEXTES_APPEL, invites: ["pro", "client", "membre", "rdv"], max: MAX_INVITES },
  // Un pro : le cabinet ou un autre pro (Cercles). Jamais un client directement (anti-désintermédiation).
  pro: { contextes: ["cercles", "fournisseur", "reunion"], invites: ["admin", "pro"], max: MAX_INVITES },
  // Un membre de projet : le cabinet ou les autres membres de SON projet.
  membre: { contextes: ["chantier", "reunion"], invites: ["admin", "membre"], max: MAX_INVITES },
  // Un visiteur : un pro de l'annuaire (par son slug public) et/ou le cabinet.
  public: { contextes: ["cercles", "fournisseur", "reunion"], invites: ["admin", "pro"], max: 2 },
};

/** Qui peut inviter qui, dans quel contexte (vérifié AVANT toute résolution en base). */
export function autoriserCreation(genre: GenreActeur, e: Pick<EntreeCreation, "contexte" | "invites">): { ok: true } | Erreur {
  const r = PERMIS[genre];
  if (!r.contextes.includes(e.contexte)) return ko(403, "contexte_interdit");
  if (e.invites.length > r.max) return ko(400, "invites_invalides");
  for (const i of e.invites) {
    if (!r.invites.includes(i.type)) return ko(403, "invite_interdit");
    // Hors back-office, un pro n'est désigné que par son identifiant PUBLIC (slug).
    if (i.type === "pro" && genre !== "admin" && !i.slug) return ko(403, "invite_interdit");
  }
  return { ok: true };
}

export type Identite = { type: TypeParticipant; cle: string; nom: string; email: string | null; telephone: string | null; langue: Langue };

/** Construit une demande EN_ATTENTE : aucune salle, le demandeur accepte ses propres créneaux. */
export function nouvelleDemande(
  e: EntreeCreation,
  demandeur: Identite & { id: string; sel: string; jetonHash: string },
  invites: (Identite & { id: string; sel: string; jetonHash: string })[],
  id: string,
  maintenant: number,
): Demande {
  const le = new Date(maintenant).toISOString();
  const base = (x: Identite & { id: string; sel: string; jetonHash: string }) => ({
    id: x.id, type: x.type, cle: x.cle, nom: x.nom, email: x.email, telephone: x.telephone, langue: x.langue,
    sel: x.sel, jetonHash: x.jetonHash, jetonsVisio: 0,
  });
  const d: Demande = {
    id, contexte: e.contexte, objetId: e.objetId, sujet: e.sujet, demandeurCle: demandeur.cle,
    statut: "EN_ATTENTE", creneaux: e.creneaux, desQuePossible: e.desQuePossible, dureeMin: e.dureeMin,
    message: e.message, audioSeul: e.audioSeul, creneauRetenu: null, salle: null, expireLe: le, rappelEnvoye: false,
    historique: [{ le, par: demandeur.id, action: "demande", detail: e.desQuePossible ? "des_que_possible" : e.creneaux.join(",") }],
    participants: [
      { ...base(demandeur), role: "DEMANDEUR", statut: "ACCEPTE", creneaux: [...e.creneaux], toutCreneau: e.desQuePossible, reponduLe: le },
      ...invites.map((x) => ({ ...base(x), role: "INVITE" as const, statut: "EN_ATTENTE" as const, creneaux: [], toutCreneau: false, reponduLe: null })),
    ],
    version: 1, createdAt: le, updatedAt: le,
  };
  d.expireLe = calculerExpiration(d);
  return d;
}

// ── Statut effectif (expiration et fin calculées à la lecture) ──────────

export function statutEffectif(d: Pick<Demande, "statut" | "expireLe" | "creneauRetenu">, maintenant: number): StatutDemande {
  if (d.statut === "EN_ATTENTE" && maintenant > Date.parse(d.expireLe)) return "EXPIREE";
  if (d.statut === "CONFIRMEE" && d.creneauRetenu && maintenant > Date.parse(d.creneauRetenu) + FERMETURE_MS) return "TERMINEE";
  return d.statut;
}

/** Applique l'expiration / la fin si elles sont dues ; true si la demande a changé. */
export function actualiser(d: Demande, maintenant: number): boolean {
  const s = statutEffectif(d, maintenant);
  if (s === d.statut) return false;
  d.statut = s;
  d.historique.push({ le: new Date(maintenant).toISOString(), par: "systeme", action: s === "EXPIREE" ? "expiree" : "terminee" });
  d.updatedAt = new Date(maintenant).toISOString();
  return true;
}

// ── Consentement ────────────────────────────────────────────────────────

/** Le participant accepte-t-il ce créneau ? (« dès que possible » : seulement dans les 72 h.) */
function accepte(p: Participant, c: string, d: Demande): boolean {
  if (p.statut === "REFUSE" || p.statut === "EN_ATTENTE") return false;
  if (p.creneaux.includes(c)) return true;
  return p.toutCreneau && Date.parse(c) <= Date.parse(d.createdAt) + DELAI_DES_QUE_POSSIBLE_MS;
}

/**
 * Premier créneau encore atteignable accepté par TOUS les participants
 * (demandeur compris), ou null. C'est la seule porte vers CONFIRMEE.
 */
export function creneauCommun(d: Demande, maintenant: number): string | null {
  const possibles = d.creneaux.filter((c) => Date.parse(c) >= maintenant - TOLERANCE_PASSE_MS).sort();
  return possibles.find((c) => d.participants.every((p) => accepte(p, c, d))) ?? null;
}

export type Action =
  | { type: "accepter"; creneaux: string[] }
  | { type: "contre"; creneaux: string[] }
  | { type: "refuser" }
  | { type: "annuler" };

export function lireAction(b: unknown, maintenant: number): Action | Erreur {
  if (!b || typeof b !== "object" || Array.isArray(b)) return ko(400, "payload_invalid");
  const o = b as Record<string, unknown>;
  if (o.action === "refuser" || o.action === "annuler") return { type: o.action };
  if (o.action === "accepter") {
    const c = lireCreneaux(o.creneaux, maintenant, 1, MAX_CRENEAUX_TOTAL);
    return Array.isArray(c) ? { type: "accepter", creneaux: c } : c;
  }
  if (o.action === "contre") {
    const c = lireCreneaux(o.creneaux, maintenant, 1, MAX_CRENEAUX_PROPOSES);
    return Array.isArray(c) ? { type: "contre", creneaux: c } : c;
  }
  return ko(400, "action_invalide");
}

export type Resultat = { ok: true; demande: Demande; evenement: "acceptee" | "contre" | "refusee" | "annulee" | "confirmee" };

/**
 * Seule fonction qui fait évoluer une demande. La salle n'est tirée au sort
 * QUE dans la transition vers CONFIRMEE.
 */
export function appliquer(d0: Demande, participantId: string, a: Action, maintenant: number): Resultat | Erreur {
  const d: Demande = structuredClone(d0);
  actualiser(d, maintenant);
  const p = d.participants.find((x) => x.id === participantId);
  if (!p) return ko(403, "interdit");
  const le = new Date(maintenant).toISOString();
  const tracer = (action: string, detail?: string) => d.historique.push({ le, par: p.id, action, ...(detail ? { detail } : {}) });

  if (a.type === "annuler" || (a.type === "refuser" && (p.role === "DEMANDEUR" || d.statut === "CONFIRMEE"))) {
    if (d.statut !== "EN_ATTENTE" && d.statut !== "CONFIRMEE") return ko(409, "demande_close", { statut: d.statut });
    d.statut = "ANNULEE";
    tracer("annulee");
    d.updatedAt = le;
    return { ok: true, demande: d, evenement: "annulee" };
  }
  if (d.statut !== "EN_ATTENTE") return ko(409, "demande_close", { statut: d.statut });

  if (a.type === "refuser") {
    p.statut = "REFUSE";
    p.reponduLe = le;
    d.statut = "REFUSEE";
    tracer("refusee");
    d.updatedAt = le;
    return { ok: true, demande: d, evenement: "refusee" };
  }

  if (a.type === "accepter") {
    if (a.creneaux.some((c) => !d.creneaux.includes(c))) return ko(400, "creneau_non_propose");
    if (a.creneaux.some((c) => Date.parse(c) < maintenant - TOLERANCE_PASSE_MS)) return ko(400, "creneau_passe");
    p.creneaux = [...new Set([...p.creneaux, ...a.creneaux])].sort();
    p.statut = "ACCEPTE";
    p.reponduLe = le;
    tracer("acceptee", a.creneaux.join(","));
  } else {
    const nouveaux = a.creneaux.filter((c) => !d.creneaux.includes(c));
    if (d.creneaux.length + nouveaux.length > MAX_CRENEAUX_TOTAL) return ko(400, "trop_de_creneaux");
    d.creneaux = [...d.creneaux, ...nouveaux].sort();
    p.creneaux = [...new Set([...p.creneaux, ...a.creneaux])].sort();
    p.statut = "CONTRE_PROPOSITION";
    p.reponduLe = le;
    tracer("contre", a.creneaux.join(","));
    d.expireLe = calculerExpiration(d);
  }
  d.updatedAt = le;

  const c = creneauCommun(d, maintenant);
  if (!c) return { ok: true, demande: d, evenement: a.type === "accepter" ? "acceptee" : "contre" };
  d.statut = "CONFIRMEE";
  d.creneauRetenu = c;
  for (const x of d.participants) x.statut = "ACCEPTE";
  d.salle = nouvelleSalle(contexteSalle(d.contexte));
  d.historique.push({ le, par: "systeme", action: "confirmee", detail: c });
  return { ok: true, demande: d, evenement: "confirmee" };
}

/** Préfixe du nom de salle (visio.ts). */
export const contexteSalle = (c: ContexteAppel): ContexteSalle => c;

// ── Accès à la salle ────────────────────────────────────────────────────

export type Fenetre = { ouverture: string; fermeture: string };
export const fenetre = (debutIso: string): Fenetre => ({
  ouverture: new Date(Date.parse(debutIso) - OUVERTURE_MS).toISOString(),
  fermeture: new Date(Date.parse(debutIso) + FERMETURE_MS).toISOString(),
});

/**
 * Un jeton JaaS peut-il être délivré à ce participant maintenant ?
 * Refus si : pas participant, demande non CONFIRMEE, salle absente, hors
 * fenêtre, ou plafond de jetons atteint.
 */
export function controlerAccesSalle(d: Demande, participantId: string | null, maintenant: number): { ok: true; participant: Participant } | Erreur {
  const p = participantId ? d.participants.find((x) => x.id === participantId) : undefined;
  if (!p) return ko(403, "interdit");
  const s = statutEffectif(d, maintenant);
  if (s === "TERMINEE") return ko(403, "termine");
  if (s !== "CONFIRMEE" || !d.salle || !d.creneauRetenu) return ko(409, "appel_non_confirme", { statut: s });
  const f = fenetre(d.creneauRetenu);
  if (maintenant < Date.parse(f.ouverture)) return ko(403, "trop_tot", { ouverture: f.ouverture });
  if (maintenant > Date.parse(f.fermeture)) return ko(403, "termine");
  if (p.jetonsVisio >= MAX_JETONS_VISIO) return ko(429, "limite_atteinte");
  return { ok: true, participant: p };
}

/** Modérateur : le cabinet s'il participe, sinon le demandeur. */
export const estModerateur = (d: Demande, p: Participant) =>
  d.participants.some((x) => x.cle === CLE_CABINET) ? p.cle === CLE_CABINET : p.role === "DEMANDEUR";

// ── Débit et blocage ────────────────────────────────────────────────────

export type Compteurs = { demandeur24h: number; paires7j: number[]; paireEnAttente: boolean[]; recues24h: number[]; bloque: boolean[] };

/** Limites anti-harcèlement (compteurs lus en base). Index des tableaux = index des invités. */
export function verifierDebit(demandeurCle: string, invitesCles: string[], k: Compteurs): { ok: true } | Erreur {
  const admin = demandeurCle === CLE_CABINET;
  if (k.demandeur24h >= (admin ? DEBIT.parDemandeurAdmin24h : DEBIT.parDemandeur24h)) return ko(429, "trop_de_demandes");
  for (let i = 0; i < invitesCles.length; i++) {
    // Réponse volontairement neutre : ne révèle pas au demandeur qu'il est bloqué.
    if (k.bloque[i]) return ko(403, "destinataire_indisponible");
    if (admin) continue;
    if (k.paireEnAttente[i]) return ko(409, "demande_deja_en_attente");
    if (k.paires7j[i] >= DEBIT.parPaire7j) return ko(429, "trop_de_demandes_destinataire");
    const max = invitesCles[i] === CLE_CABINET ? DEBIT.recuesCabinet24h : DEBIT.recuesParDestinataire24h;
    if (k.recues24h[i] >= max) return ko(429, "destinataire_sature");
  }
  return { ok: true };
}

// ── Vues ────────────────────────────────────────────────────────────────

const peutRepondre = (d: Demande, p: Participant, s: StatutDemande) => s === "EN_ATTENTE" && p.statut !== "REFUSE";

/**
 * Ce que voit un participant : jamais les coordonnées des autres, jamais
 * de jeton, de sel ni de nom de salle.
 */
export function vueParticipant(d: Demande, participantId: string, maintenant: number) {
  const p = d.participants.find((x) => x.id === participantId)!;
  const s = statutEffectif(d, maintenant);
  const f = d.creneauRetenu ? fenetre(d.creneauRetenu) : null;
  const ouvert = s === "CONFIRMEE" && !!f && maintenant >= Date.parse(f.ouverture) && maintenant <= Date.parse(f.fermeture);
  return {
    id: d.id,
    contexte: d.contexte,
    objetId: d.objetId,
    sujet: d.sujet,
    statut: s,
    creneaux: d.creneaux,
    desQuePossible: d.desQuePossible,
    dureeMin: d.dureeMin,
    message: d.message,
    audioSeul: d.audioSeul,
    creneauRetenu: d.creneauRetenu,
    fenetre: f,
    expireLe: d.expireLe,
    createdAt: d.createdAt,
    moi: { id: p.id, role: p.role, type: p.type, nom: p.nom, statut: p.statut, creneaux: p.creneaux, langue: p.langue },
    participants: d.participants.map((x) => ({ id: x.id, role: x.role, type: x.type, nom: x.nom, statut: x.statut, creneaux: x.creneaux, toutCreneau: x.toutCreneau, moi: x.id === p.id })),
    historique: d.historique.map((h) => ({ le: h.le, action: h.action, par: d.participants.find((x) => x.id === h.par)?.nom ?? (h.par === "systeme" ? "CITURBAREA" : "—") })),
    peut: {
      accepter: peutRepondre(d, p, s) && d.creneaux.some((c) => Date.parse(c) >= maintenant - TOLERANCE_PASSE_MS && !p.creneaux.includes(c)),
      contreProposer: peutRepondre(d, p, s),
      refuser: s === "EN_ATTENTE" && p.role === "INVITE" && p.statut !== "REFUSE",
      annuler: s === "EN_ATTENTE" || s === "CONFIRMEE",
      bloquer: p.role === "INVITE",
      rejoindre: ouvert,
    },
  };
}

/** Vue back-office : tout sauf les secrets (sel, empreinte du lien). */
export function vueAdmin(d: Demande, maintenant: number) {
  const cabinet = d.participants.find((x) => x.cle === CLE_CABINET);
  return {
    ...(cabinet ? vueParticipant(d, cabinet.id, maintenant) : { ...vueParticipant(d, d.participants[0].id, maintenant), moi: null }),
    cabinetParticipe: !!cabinet,
    participants: d.participants.map((x) => ({
      id: x.id, role: x.role, type: x.type, cle: x.cle, nom: x.nom, email: x.email, telephone: x.telephone, langue: x.langue,
      statut: x.statut, creneaux: x.creneaux, toutCreneau: x.toutCreneau, reponduLe: x.reponduLe, jetonsVisio: x.jetonsVisio, moi: x.cle === CLE_CABINET,
    })),
    historique: d.historique,
  };
}

/** Ligne de liste (espace pro, back-office). */
export function resume(d: Demande, cle: string | null, maintenant: number) {
  const p = cle ? d.participants.find((x) => x.cle === cle) : undefined;
  const autres = d.participants.filter((x) => x.cle !== cle).map((x) => x.nom);
  return {
    id: d.id, contexte: d.contexte, objetId: d.objetId, sujet: d.sujet, statut: statutEffectif(d, maintenant),
    creneaux: d.creneaux, desQuePossible: d.desQuePossible, creneauRetenu: d.creneauRetenu, dureeMin: d.dureeMin,
    avec: autres, monStatut: p?.statut ?? null, monRole: p?.role ?? null, createdAt: d.createdAt, updatedAt: d.updatedAt,
    aRepondre: !!p && statutEffectif(d, maintenant) === "EN_ATTENTE" && p.statut === "EN_ATTENTE",
  };
}
