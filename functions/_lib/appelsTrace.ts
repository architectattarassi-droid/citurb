/**
 * Trace des appels vidéo — logique pure (testée).
 *
 * 1. Trace SANS vidéo, toujours : entrées en salle (par participant, à
 *    chaque jeton délivré), arrivées / départs et fin de salle quand le
 *    webhook JaaS est configuré, durée réelle, consentements ; compte rendu
 *    écrit (facultatif) rédigé par un participant et VALIDÉ par les autres.
 * 2. Enregistrement VIDÉO, seulement si TOUS les participants y ont
 *    consenti explicitement (loi 09-08 : information, finalité, durée de
 *    conservation, droit d'accès) ; consentement retirable à tout moment —
 *    il redevient alors interdit. La salle ne propose le bouton
 *    d'enregistrement qu'à cette condition, et chaque participant peut
 *    l'arrêter. Fichier récupéré par webhook (RECORDING_UPLOADED, lien valable
 *    24 h) et déposé dans le dépôt commun (contexte « appel ») si R2 est actif.
 */
import { masquerCoordonnees, detecterCoordonnees, type TypeCoordonnee } from "./coordonnees";
import type { Demande } from "./appels";

/** Finalité et durée de conservation présentées avant le consentement (loi 09-08). */
export const CONSERVATION_ENREGISTREMENT_MOIS = 12;
export const FINALITE_ENREGISTREMENT = "garder une trace fidèle des décisions prises pendant l'appel (projet, chantier, devis)";

export type Consentement = { accepte: boolean; le: string };
export type EvenementSalle = { le: string; type: string; participantId: string | null; detail?: string };
export type CompteRendu = {
  auteurId: string; texte: string; masque: boolean; le: string;
  statut: "PROPOSE" | "VALIDE" | "CONTESTE";
  avis: Record<string, { accord: boolean; remarque: string | null; le: string }>;
};
export type TraceAppel = {
  /** Jetons de salle délivrés : qui est entré, quand. */
  entrees: { participantId: string; le: string }[];
  /** Événements JaaS (webhook) : arrivées, départs, fin de salle, enregistrement. */
  evenements: EvenementSalle[];
  /** Webhooks déjà traités (idempotencyKey), bornés. */
  vus: string[];
  consentements: Record<string, Consentement>;
  enregistrement: { statut: "AUCUN" | "EN_COURS" | "TERMINE" | "CONSERVE" | "NON_CONSERVE"; documentId: string | null; dureeS: number | null; motif: string | null };
  compteRendu: CompteRendu | null;
};

export const traceVide = (): TraceAppel => ({ entrees: [], evenements: [], vus: [], consentements: {}, enregistrement: { statut: "AUCUN", documentId: null, dureeS: null, motif: null }, compteRendu: null });
export const trace = (d: Demande): TraceAppel => (d.trace ??= traceVide());

type Erreur = { ok: false; status: number; erreur: string };
const ko = (status: number, erreur: string): Erreur => ({ ok: false, status, erreur });

// ── Consentement à l'enregistrement ─────────────────────────────────────

/** Tous les participants ont-ils accepté l'enregistrement (et aucun ne l'a retiré) ? */
export function enregistrementAutorise(d: Demande): boolean {
  const c = d.trace?.consentements ?? {};
  return d.participants.length > 1 && d.participants.every((p) => c[p.id]?.accepte === true);
}

/** Donner ou retirer son consentement — possible tant que l'appel n'est pas clos. */
export function consentir(d: Demande, participantId: string, accepte: boolean, maintenant: number): { ok: true } | Erreur {
  if (!d.participants.some((p) => p.id === participantId)) return ko(403, "non_participant");
  if (!["EN_ATTENTE", "CONFIRMEE"].includes(d.statut)) return ko(409, "demande_close");
  trace(d).consentements[participantId] = { accepte, le: new Date(maintenant).toISOString() };
  return { ok: true };
}

// ── Entrées en salle et événements JaaS ─────────────────────────────────

export function noterEntree(d: Demande, participantId: string, maintenant: number) {
  const t = trace(d);
  t.entrees = [...t.entrees, { participantId, le: new Date(maintenant).toISOString() }].slice(-100);
}

/** Événement du webhook JaaS (idempotent). Les identifiants JaaS des participants sont nos identifiants de participant. */
export function noterEvenement(d: Demande, cle: string, type: string, le: number, participantId: string | null, detail?: string): boolean {
  const t = trace(d);
  if (t.vus.includes(cle)) return false;
  t.vus = [...t.vus, cle].slice(-200);
  const pid = participantId && d.participants.some((p) => p.id === participantId) ? participantId : null;
  t.evenements = [...t.evenements, { le: new Date(le).toISOString(), type, participantId: pid, ...(detail ? { detail } : {}) }].slice(-300);
  if (type === "RECORDING_STARTED") t.enregistrement = { ...t.enregistrement, statut: "EN_COURS" };
  if (type === "RECORDING_ENDED") t.enregistrement = { ...t.enregistrement, statut: "TERMINE" };
  return true;
}

/** Durée réelle : de la première entrée (ou arrivée) à la fin de salle (ou dernier départ). */
export function dureeReelle(t: TraceAppel): { debut: string | null; fin: string | null; minutes: number | null } {
  const arrivees = [...t.entrees.map((e) => e.le), ...t.evenements.filter((e) => e.type === "PARTICIPANT_JOINED" || e.type === "ROOM_CREATED").map((e) => e.le)].sort();
  const fins = t.evenements.filter((e) => e.type === "ROOM_DESTROYED" || e.type === "PARTICIPANT_LEFT").map((e) => e.le).sort();
  const debut = arrivees[0] ?? null;
  const fin = fins[fins.length - 1] ?? null;
  return { debut, fin, minutes: debut && fin && fin > debut ? Math.round((Date.parse(fin) - Date.parse(debut)) / 60_000) : null };
}

// ── Compte rendu validé par les autres participants ─────────────────────

const MAX_CR = 8000;
const appelEntame = (d: Demande, maintenant: number) =>
  (d.statut === "CONFIRMEE" || d.statut === "TERMINEE") && !!d.creneauRetenu && maintenant >= Date.parse(d.creneauRetenu) - 10 * 60_000;

/** Proposer (ou remplacer) le compte rendu : remet les avis à zéro. Texte masqué (aucune coordonnée). */
export function proposerCompteRendu(d: Demande, auteurId: string, brut: unknown, maintenant: number): { ok: true; types: TypeCoordonnee[] } | Erreur {
  if (!d.participants.some((p) => p.id === auteurId)) return ko(403, "non_participant");
  if (!appelEntame(d, maintenant)) return ko(409, "appel_pas_encore_tenu");
  const texte = typeof brut === "string" ? brut.replace(/\u0000/g, "").trim().slice(0, MAX_CR) : "";
  if (texte.length < 10) return ko(400, "compte_rendu_trop_court");
  const types = detecterCoordonnees(texte);
  const masque = masquerCoordonnees(texte);
  trace(d).compteRendu = { auteurId, texte: masque, masque: masque !== texte, le: new Date(maintenant).toISOString(), statut: "PROPOSE", avis: {} };
  return { ok: true, types };
}

/** Avis d'un autre participant : d'accord (VALIDE quand tous le sont) ou non (CONTESTE, avec remarque). */
export function donnerAvis(d: Demande, participantId: string, accord: boolean, remarque: unknown, maintenant: number): { ok: true } | Erreur {
  const cr = d.trace?.compteRendu;
  if (!cr) return ko(404, "pas_de_compte_rendu");
  if (!d.participants.some((p) => p.id === participantId)) return ko(403, "non_participant");
  if (participantId === cr.auteurId) return ko(409, "auteur_du_compte_rendu");
  const r = typeof remarque === "string" ? masquerCoordonnees(remarque.trim().slice(0, 1000)) || null : null;
  if (!accord && !r) return ko(400, "remarque_requise");
  cr.avis[participantId] = { accord, remarque: r, le: new Date(maintenant).toISOString() };
  const autres = d.participants.filter((p) => p.id !== cr.auteurId);
  cr.statut = Object.values(cr.avis).some((a) => !a.accord) ? "CONTESTE" : autres.every((p) => cr.avis[p.id]?.accord) ? "VALIDE" : "PROPOSE";
  return { ok: true };
}

/** Vue de la trace pour un participant ou le cabinet (noms seulement, aucune coordonnée). */
export function vueTrace(d: Demande) {
  const t = d.trace ?? traceVide();
  const nom = (id: string | null) => (id ? d.participants.find((p) => p.id === id)?.nom ?? "—" : null);
  const duree = dureeReelle(t);
  return {
    consentements: d.participants.map((p) => ({ participantId: p.id, nom: p.nom, accepte: t.consentements[p.id]?.accepte ?? null, le: t.consentements[p.id]?.le ?? null })),
    enregistrementAutorise: enregistrementAutorise(d),
    enregistrement: t.enregistrement,
    finalite: FINALITE_ENREGISTREMENT,
    conservationMois: CONSERVATION_ENREGISTREMENT_MOIS,
    entrees: t.entrees.map((e) => ({ nom: nom(e.participantId), le: e.le })),
    evenements: t.evenements.map((e) => ({ type: e.type, nom: nom(e.participantId), le: e.le })),
    duree,
    compteRendu: t.compteRendu ? { ...t.compteRendu, auteur: nom(t.compteRendu.auteurId), avis: Object.entries(t.compteRendu.avis).map(([pid, a]) => ({ participantId: pid, nom: nom(pid), ...a })) } : null,
  };
}
