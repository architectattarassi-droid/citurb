/**
 * Carnet des matériaux du projet — règles pures (front et Pages Functions).
 * Contrat : docs/architecture/contrat-carnet-materiaux.md ; table "DossierMateriau".
 *
 *  - Le client (ou maître d'ouvrage) PROPOSE un matériau du catalogue à partir
 *    de l'avant-projet détaillé : phase du dossier (Dossier.phase, codes de
 *    phases.catalog.ts) d'ordre ≥ celui de l'APD ; avant, refus.
 *  - Seul l'architecte maître d'œuvre (back-office) STATUE : EN_ETUDE, VALIDE,
 *    REFUSE (motif obligatoire), VARIANTE_PROPOSEE (autre code du catalogue).
 *  - Le carnet du projet = les lignes VALIDE : seule source pour le CPS, le DQE
 *    et le planning d'achat ; une proposition n'y entre jamais sans validation.
 */
import { PHASES_FIXES } from "../../../../../packages/contracts/src/phases.catalog";
import { LOTS } from "../chiffrage/lots";
import { materiau } from "./catalogue";
import { phasesMateriau, type PhaseReal } from "./phases";
import { prixReference } from "./reference";

export const STATUTS_CARNET = ["PROPOSE", "EN_ETUDE", "VALIDE", "REFUSE", "VARIANTE_PROPOSEE"] as const;
export type StatutCarnet = (typeof STATUTS_CARNET)[number];
export const DECISIONS = ["EN_ETUDE", "VALIDE", "REFUSE", "VARIANTE_PROPOSEE"] as const;
export type Decision = (typeof DECISIONS)[number];

/** Ligne du carnet telle que renvoyée par les routes (aucun champ de coordonnées, aucun auteur côté client). */
export interface LigneCarnet {
  id: string;
  dossierId: string;
  etapeCode: string | null;
  source: "referentiel" | "produit";
  refId: string;
  code: string;
  nom: string;
  categorie: string | null;
  lot: string | null;
  emplacement: string | null;
  unite: string | null;
  quantite: number | null;
  prixIndicatif: number | null;
  note: string | null;
  origine: "CLIENT" | "ARCHITECTE" | "ETAPE";
  proposePar: "CLIENT" | "ARCHITECTE";
  statut: StatutCarnet;
  motif: string | null;
  varianteCode: string | null;
  decideLe: string | null;
  proposeLe: string;
}

// ───────────────────────── phase du dossier ─────────────────────────

/** Phase d'ancrage : l'avant-projet détaillé (seul code de phase cité ici). */
export const PHASE_APD = "14_APD";
const ORDRE = new Map(PHASES_FIXES.map((p) => [p.code, p.order]));
const ORDRE_APD = ORDRE.get(PHASE_APD)!;

/** Le client peut-il proposer ? Phase inconnue ou absente → non. */
export function proposableEnPhase(phase: string | null | undefined): boolean {
  const o = phase ? ORDRE.get(phase) : undefined;
  return o !== undefined && o >= ORDRE_APD;
}

// ───────────────────────── validation des entrées ─────────────────────────

const LOTS_CODES = new Set(LOTS.map((l) => l.code as string));
const texte = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

export interface EntreeProposition {
  code: string;
  source: "referentiel" | "produit";
  refId: string;
  lot: string | null;
  emplacement: string | null;
  quantite: number | null;
  note: string | null;
  etapeCode: string | null;
  /** Calculés côté serveur depuis le catalogue (jamais saisis). */
  nom: string;
  categorie: string;
  unite: string;
  prixIndicatif: number | null;
}

export type Resultat<T> = { ok: true; v: T } | { ok: false; erreur: string };

/** Corps de POST (client ou admin). Le nom, l'unité et le prix viennent du catalogue. */
export function lireProposition(b: unknown): Resultat<EntreeProposition> {
  const o = (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
  const code = texte(o.code, 20).toUpperCase();
  const r = materiau(code);
  if (!r) return { ok: false, erreur: "code_inconnu" };
  const source = o.source === "produit" ? "produit" : "referentiel";
  const refId = source === "produit" ? texte(o.refId, 80) : code;
  if (source === "produit" && !/^[A-Za-z0-9_-]{2,80}$/.test(refId)) return { ok: false, erreur: "produit_invalide" };
  const lot = texte(o.lot, 10).toUpperCase() || null;
  if (lot && !LOTS_CODES.has(lot)) return { ok: false, erreur: "lot_invalide" };
  let quantite: number | null = null;
  if (o.quantite !== undefined && o.quantite !== null && o.quantite !== "") {
    const q = Number(o.quantite);
    if (!Number.isFinite(q) || q < 0 || q > 1e7) return { ok: false, erreur: "quantite_invalide" };
    quantite = Math.round(q * 1000) / 1000;
  }
  const etapeCode = texte(o.etapeCode, 60) || null;
  if (etapeCode && !/^[A-Za-z0-9_.-]{2,60}$/.test(etapeCode)) return { ok: false, erreur: "etape_invalide" };
  return {
    ok: true,
    v: {
      code, source, refId, lot, emplacement: texte(o.emplacement, 120) || null, quantite, note: texte(o.note, 1000) || null, etapeCode,
      nom: r.libelle, categorie: r.categorie, unite: r.uniteRef, prixIndicatif: prixReference(code)?.ref ?? null,
    },
  };
}

export interface EntreeDecision { statut: Decision; motif: string | null; varianteCode: string | null }

/** Corps de PATCH (architecte / back-office seulement). */
export function lireDecision(b: unknown, actuel: { statut: StatutCarnet; code: string }): Resultat<EntreeDecision> {
  const o = (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
  const statut = String(o.statut || "") as Decision;
  if (!(DECISIONS as readonly string[]).includes(statut)) return { ok: false, erreur: "statut_invalide" };
  if (!transitionPermise(actuel.statut, statut)) return { ok: false, erreur: "transition_interdite" };
  const motif = texte(o.motif, 1000) || null;
  if (statut === "REFUSE" && (!motif || motif.length < 3)) return { ok: false, erreur: "motif_obligatoire" };
  let varianteCode: string | null = null;
  if (statut === "VARIANTE_PROPOSEE") {
    varianteCode = texte(o.varianteCode, 20).toUpperCase();
    if (!materiau(varianteCode)) return { ok: false, erreur: "variante_inconnue" };
    if (varianteCode === actuel.code) return { ok: false, erreur: "variante_identique" };
  }
  return { ok: true, v: { statut, motif, varianteCode } };
}

/** Une décision rendue peut être rouverte en étude ; sinon tout statut ouvert peut être tranché. */
export function transitionPermise(de: StatutCarnet, vers: Decision): boolean {
  if (de === vers) return false;
  if (de === "PROPOSE" || de === "EN_ETUDE") return true;
  return vers === "EN_ETUDE";
}

// ───────────────────────── affichage ─────────────────────────

/** Carnet du projet : lignes validées seulement (CPS, DQE, planning d'achat). */
export const carnetValide = (l: LigneCarnet[]) => l.filter((x) => x.statut === "VALIDE");
export const aValider = (l: LigneCarnet[]) => l.filter((x) => x.statut === "PROPOSE" || x.statut === "EN_ETUDE").length;

/** Fourniture estimée (quantité × prix de référence HT) — indicatif, hors pose. */
export function fournitureEstimee(l: Pick<LigneCarnet, "quantite" | "prixIndicatif">): number | null {
  return l.quantite != null && l.prixIndicatif != null ? Math.round(l.quantite * l.prixIndicatif) : null;
}

/** Phases d'achat du matériau (docs/prix/phases-materiaux.md). */
export const phasesAchat = (code: string): PhaseReal[] => phasesMateriau(code)?.realisation || [];
