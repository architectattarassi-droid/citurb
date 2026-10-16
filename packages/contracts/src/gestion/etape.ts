/**
 * Page d'une étape (lot GP6, demande du fondateur du 16/10/2026) : « l'étape = une page entière ».
 * /cc/dossiers/:id/etapes/:code (admin) et /mon-espace (client).
 *
 * Une étape = un code du catalogue (00_BRIEF… 97_RECEPTION_DEFINITIVE), une pré-étape (PRE_*) ou
 * l'étape « Mise à jour du DEXE » (GP_MAJ_DEXE). Elle se rattache à sa phase P.. du référentiel :
 * documents attendus, normes, paiement de la phase ; à une phase graphique (ESQ/APS/APD/EXE) pour
 * les études ; aux checklists de chantier pour les phases de travaux.
 *
 * Données propres à l'étape (dates prévues, responsable, intervenants) : Dossier.payload.gestion.etapes[code].
 * Matériaux : carnet commun "DossierMateriau" de la session Matériauthèque (etapeCode = code de l'étape).
 */
import { PHASES_FIXES, PHASES_RETIREES } from "../phases.catalog";
import { phaseDuCatalogue, phaseRef } from "./referentiel";
import type { PhasePlan } from "./plans";
import { CODE_MAJ_DEXE } from "./majDexe";

/** Phase graphique des études : galerie des plans, coupes, façades, vues. */
const PHASE_GRAPHIQUE: Record<string, PhasePlan> = {
  "10_ESQUISSE": "ESQ", "12_APS": "APS", "14_APD": "APD", "30_DOSSIER_AUTORISATION": "APD", "40_DOSSIER_EXECUTION": "EXE", "42_VISA_STRUCTURE_CONTROLE": "EXE", [CODE_MAJ_DEXE]: "EXE",
};
const PHASES_CHANTIER = new Set(["P07_PREPARATION_CHANTIER", "P08_GROS_OEUVRE_INFRASTRUCTURE", "P09_GROS_OEUVRE_ELEVATION", "P10_SECOND_OEUVRE_EQUIPEMENTS", "P11_RECEPTION_PROVISOIRE", "P13_GARANTIE_RECEPTION_DEFINITIVE"]);
/** À partir de l'APD, le client peut aussi proposer des matériaux (l'architecte valide). */
const ORDRE_APD = 1400;

export const CODE_ETAPE_RE = /^(P\d\d_[A-Z_]{2,60}|PRE_[A-Z_]{2,30}|\d{2}[A-Z]?_[A-Z0-9_]{2,60}|LOT_[A-Z_]{2,40}|GP_MAJ_DEXE)$/;

export interface InfoEtape {
  code: string; titre: string; phaseRef: string | null; phaseTitre: string | null; phaseTitreAr: string | null;
  phaseGraphique: PhasePlan | null; chantier: boolean; clientProposeMateriaux: boolean;
  acteurs: string[]; validateurs: string[]; objectif: string | null; ordre: number;
}

export function infoEtape(code: string): InfoEtape | null {
  if (!CODE_ETAPE_RE.test(code)) return null;
  // Une phase du référentiel (frise du client) ouvre sa première étape du catalogue.
  if (/^P\d\d_/.test(code)) {
    const c = phaseRef(code)?.correspondances.catalogue?.map((x) => x.replace(/\s*\(.*\)$/, "")).find((x) => PHASES_FIXES.some((f) => f.code === x));
    return c ? infoEtape(c) : null;
  }
  const fixe = PHASES_FIXES.find((p) => p.code === code);
  const retiree = PHASES_RETIREES.find((p) => p.code === code);
  const ref = phaseDuCatalogue(code === CODE_MAJ_DEXE ? "40_DOSSIER_EXECUTION" : code);
  const p = phaseRef(ref);
  if (!fixe && !retiree && !code.startsWith("PRE_") && code !== CODE_MAJ_DEXE && !code.startsWith("LOT_")) return null;
  const ordre = fixe?.order ?? retiree?.order ?? (code === CODE_MAJ_DEXE ? 4100 : code.startsWith("PRE_") ? -1 : 9200);
  return {
    code, titre: fixe?.title ?? retiree?.title ?? code, phaseRef: ref, phaseTitre: p?.libelleFr ?? null, phaseTitreAr: p?.libelleAr ?? null,
    phaseGraphique: PHASE_GRAPHIQUE[code] ?? null, chantier: !!ref && PHASES_CHANTIER.has(ref), clientProposeMateriaux: ordre >= ORDRE_APD,
    acteurs: fixe?.acteurs ?? [], validateurs: fixe?.validateurs ?? [], objectif: fixe?.objectif ?? null, ordre,
  };
}

// ── Données propres à l'étape (payload.gestion.etapes[code]) ────────────

export interface Intervenant { id: string; genre: "prestataire" | "fournisseur"; proId: string; nom: string; role: string; ajouteLe: string; ajoutePar: string; projetMembreId?: string | null }
export interface DonneesEtape {
  datePrevueDebut?: string | null; datePrevueFin?: string | null; responsable?: string | null;
  intervenants?: Intervenant[];
}

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export const donneesEtape = (payload: unknown, code: string): DonneesEtape => objet(objet(objet(objet(payload).gestion).etapes)[code]) as DonneesEtape;
/** Écrit les données d'une étape dans un payload (copie). */
export function avecDonneesEtape(payload: unknown, code: string, d: DonneesEtape): Record<string, unknown> {
  const p = objet(payload), g = objet(p.gestion), e = objet(g.etapes);
  return { ...p, gestion: { ...g, etapes: { ...e, [code]: d } } };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Dates prévues et responsable (texte court, sans coordonnées : vérifié côté serveur). */
export function validerPlanning(v: unknown): { datePrevueDebut: string | null; datePrevueFin: string | null; responsable: string | null } | { erreur: string } {
  const o = objet(v);
  const d = typeof o.datePrevueDebut === "string" && DATE_RE.test(o.datePrevueDebut) ? o.datePrevueDebut : null;
  const f = typeof o.datePrevueFin === "string" && DATE_RE.test(o.datePrevueFin) ? o.datePrevueFin : null;
  if (d && f && f < d) return { erreur: "fin_avant_debut" };
  const r = typeof o.responsable === "string" && o.responsable.trim() ? o.responsable.trim().slice(0, 120) : null;
  return { datePrevueDebut: d, datePrevueFin: f, responsable: r };
}

/** Message de relance prérempli : contexte de l'étape et liste des pièces manquantes du client. */
export function messageRelance(o: { titreEtape: string; titreDossier: string; manquantes: string[]; langue?: "fr" | "ar" }): { sujet: string; texte: string } {
  const liste = o.manquantes.slice(0, 20).map((x) => `- ${x}`).join("\n");
  if (o.langue === "ar") {
    return {
      sujet: `${o.titreDossier} — ${o.titreEtape} : وثائق ناقصة`,
      texte: `مرحباً،\nلمواصلة مرحلة «${o.titreEtape}» من ملفكم، تنقصنا الوثائق التالية:\n${liste || "-"}\nيمكنكم إيداعها مباشرة في فضائكم على CITURBAREA (قسم الوثائق).\nشكراً لكم.`,
    };
  }
  return {
    sujet: `${o.titreDossier} — ${o.titreEtape} : pièces manquantes`,
    texte: `Bonjour,\nPour avancer sur l'étape « ${o.titreEtape} » de votre dossier, il nous manque :\n${liste || "- (aucune pièce manquante)"}\nVous pouvez les déposer directement dans votre espace CITURBAREA (rubrique Documents).\nMerci.`,
  };
}

/** Rôle dans l'espace projet d'un pro Cercles selon son métier (null : fournisseur de matériaux, fil de l'étape seulement). */
export function roleProjetDuMetier(metier: string | null | undefined): string | null {
  switch (metier) {
    case "ENTREPRISE_GENERALE": case "ENTREPRISE_GO": case "ENTREPRISE_SECOND_OEUVRE": case "ARTISAN_QUALIFIE": return "ENTREPRISE";
    case "BET_STRUCTURE": case "BET_VRD": return "BET_STRUCTURE";
    case "BET_FLUIDES": return "BET_FLUIDES";
    case "LABORATOIRE": return "LABORATOIRE";
    case "TOPOGRAPHE": case "GEOMETRE": return "TOPOGRAPHE";
    case "CONTROLE_TECHNIQUE": return "BUREAU_CONTROLE";
    default: return null;
  }
}
