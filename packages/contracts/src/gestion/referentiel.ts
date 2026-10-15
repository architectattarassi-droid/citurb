/**
 * Référentiel unique de gestion de projet (lot GP1) — lu directement depuis
 * docs/gestion-projet/referentiel-phases.json (enrichi par la session principale :
 * toute mise à jour du JSON est prise en compte sans toucher au code).
 *
 * Utilisé par : fiche dossier /cc/dossiers/:id (functions/_lib/ficheDossier.ts),
 * vue client (vueDossierClient.ts), espace projet (projetsApi.ts), documents et
 * normes par phase (GP2), PV de chantier (GP3), échéances (GP4), frise (GP5).
 *
 * Colonne vertébrale : 15 phases P00…P14. Les 49 codes du catalogue
 * (packages/contracts/src/phases.catalog.ts) et les autres vocabulaires
 * (types de projet, rôles, lots, phases des matériaux) y sont rattachés ici.
 * Fichier sans dépendance d'exécution : utilisable par les Pages Functions et le navigateur.
 */
import brut from "../../../../docs/gestion-projet/referentiel-phases.json";

// ── Types (forme du JSON) ───────────────────────────────────────────────

export type Obligatoire = true | false | "CONDITIONNEL";
export interface DocRef {
  code: string; libelleFr: string; libelleAr?: string; obligatoire: Obligatoire;
  producteur?: string; validateur?: string; format?: string; detail?: string; condition?: string;
}
export interface JalonRef {
  code: string; libelleFr: string; libelleAr?: string; objectif?: string; pointArret: boolean; deblocableParAdmin?: boolean;
  validateurs?: string[]; delaiTypique?: string; noteBlocage?: string; documents?: DocRef[]; checklistsChantier?: string[];
  conditions?: { sousSol?: boolean; types?: string[] }; repeteParNiveau?: boolean;
}
export interface DocAttenduRef { code: string; source: string; jalon?: string; lot?: string; obligatoire: Obligatoire; conditionsJalon?: unknown }
export interface PhaseRef {
  code: string; ordre: number; libelleFr: string; libelleAr: string; famille: string; objectif: string;
  declencheur?: string; critereSortie?: string;
  duree: { villa?: [number, number]; immeuble?: [number, number]; note?: string };
  textes: string[]; lots: string[]; missions: string[];
  correspondances: { catalogue?: string[]; materiaux?: string[]; chiffrage?: string };
  jalons: JalonRef[]; documentsAttendus: DocAttenduRef[]; checklistsChantier: string[];
}
export interface PointControleRef {
  code: string; libelleFr: string; libelleAr?: string; critere: string; norme?: string; methode: string; controleur: string;
  pointArret: boolean; preuves?: string[]; tolerance?: string;
}
export interface ChecklistRef {
  code: string; libelleFr: string; libelleAr?: string; phase: string; lot?: string; jalon?: string; signataires: string[];
  points: PointControleRef[]; pointArret: boolean; repeteParNiveau?: boolean;
  modelePV?: { entete?: string[]; constat?: string; reserves?: string; decision?: string[]; signatures?: string[]; mentions?: string[] };
}
export interface NormeRef {
  code: string; reference: string; objet: string; portee: string; statut: string; phases: string[]; lots: string[];
  exigences: { moment: string; texte: string; verifie: boolean }[];
}
export interface LivrableRef {
  code: string; phase: string; lot: string; libelleFr: string; libelleAr?: string; type?: string; echelle?: string;
  contenuMinimal?: string[]; producteur?: string; validateur?: string; obligatoire: Obligatoire; condition?: string;
}
export interface DureeTypeRef {
  type: string; libelle: string; budgetIndicatifMDH?: [number, number]; bureauControle?: string;
  etapes: { code: string; libelle: string; categorie: string; min: number; max: number; varie?: string }[];
  totalMois: [number, number]; cheminCritique?: string; unite?: string;
}
type Brut = {
  version: string; majLe: string;
  statutsDocument: { code: string; libelleFr: string; libelleAr: string }[];
  typesProjet: { code: string; libelleFr: string; libelleAr: string }[];
  acteurs: { code: string; libelleFr: string; libelleAr: string; roleEspaceProjet: string | null; acteurCatalogue: string | null }[];
  lots: { code: string; libelleFr: string; libelleAr: string; correspondances: Record<string, string> }[];
  lotsLivrables?: { code: string; libelleFr: string; libelleAr: string }[];
  phasesLivrables?: { code: string; libelleFr: string; libelleAr: string; phaseRef: string }[];
  livrables?: LivrableRef[];
  textes: { code: string; reference: string; intitule: string; statut: string }[];
  phases: PhaseRef[];
  branches?: { type: string; libelleFr: string; libelleAr: string; jalons: JalonRef[] }[];
  normes?: NormeRef[];
  checklistsChantier?: ChecklistRef[];
  dureesParType?: DureeTypeRef[];
  decisionsFondateur?: { bureauControle?: { seuilMDH?: number } };
};

export const REF = brut as unknown as Brut;
export const VERSION_REFERENTIEL = `${REF.version} (${REF.majLe})`;

export const PHASES_REF: readonly PhaseRef[] = [...REF.phases].sort((a, b) => a.ordre - b.ordre);
const PAR_CODE = new Map(PHASES_REF.map((p) => [p.code, p]));
export const phaseRef = (code: string | null | undefined) => (code ? PAR_CODE.get(code) ?? null : null);

/** Tous les jalons des 15 phases (sans les branches), avec leur phase. */
export const JALONS_REF: readonly (JalonRef & { phase: string })[] = PHASES_REF.flatMap((p) => p.jalons.map((j) => ({ ...j, phase: p.code })));
const JALON_PAR_CODE = new Map(JALONS_REF.map((j) => [j.code, j]));
export const jalonRef = (code: string) => JALON_PAR_CODE.get(code) ?? null;

export const CHECKLISTS_REF: readonly ChecklistRef[] = REF.checklistsChantier ?? [];
export const checklistRef = (code: string) => CHECKLISTS_REF.find((c) => c.code === code) ?? null;
export const NORMES_REF: readonly NormeRef[] = REF.normes ?? [];
export const LIVRABLES_REF: readonly LivrableRef[] = REF.livrables ?? [];

/** Libellés FR/AR d'un acteur du référentiel (rôle). */
export function libelleActeur(code: string | null | undefined): { fr: string; ar: string } {
  const a = REF.acteurs.find((x) => x.code === code);
  return a ? { fr: a.libelleFr, ar: a.libelleAr } : { fr: code || "—", ar: code || "—" };
}
export function libelleLot(code: string | null | undefined): { fr: string; ar: string } {
  if (!code) return { fr: "Général", ar: "عام" };
  const l = (REF.lotsLivrables ?? []).find((x) => x.code === code) ?? REF.lots.find((x) => x.code === code);
  return l ? { fr: l.libelleFr, ar: l.libelleAr } : { fr: code, ar: code };
}
export function texteRef(code: string) { return REF.textes.find((t) => t.code === code) ?? null; }

// ── Correspondances : catalogue (49 codes) → phase P.. ─────────────────

const CATALOGUE_VERS_PHASE = new Map<string, string>();
for (const p of PHASES_REF) for (const c of p.correspondances.catalogue ?? []) CATALOGUE_VERS_PHASE.set(c.replace(/\s*\(.*\)$/, ""), p.code);
/**
 * Codes absents du JSON ou à replacer : la branche lotissement (28, 29, 29B-D)
 * précède le permis de construire (30 en dépend dans le catalogue) ; les étapes
 * pré-dossier (premier contact → paiement) appartiennent à P00.
 */
const COMPLEMENTS: Record<string, string> = {
  "28_DOSSIER_LOTISSEMENT": "P04_AUTORISATION",
  "29_AUTORISATION_LOTIR": "P04_AUTORISATION",
  "29B_TRAVAUX_EQUIPEMENT_LOTISSEMENT": "P04_AUTORISATION",
  "29C_RECEPTION_EQUIPEMENTS_LOTISSEMENT": "P04_AUTORISATION",
  "29D_BORNAGE_TITRES": "P04_AUTORISATION",
  "91_TESTS_RESEAUX": "P10_SECOND_OEUVRE_EQUIPEMENTS",
};
for (const [c, p] of Object.entries(COMPLEMENTS)) CATALOGUE_VERS_PHASE.set(c, p);

/** Phase P.. d'un code du catalogue, d'une pré-étape (PRE_*) ou d'un jalon d'espace projet (« 84_FONDATIONS.FON.03 »). */
export function phaseDuCatalogue(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code.startsWith("PRE_")) return "P00_IDEE_PROGRAMME";
  if (/^P\d\d_/.test(code)) return PAR_CODE.has(code) ? code : null;
  if (/^J\d\d_/.test(code)) return jalonRef(code)?.phase ?? null;
  const base = code.split(".")[0];
  if (CATALOGUE_VERS_PHASE.has(base)) return CATALOGUE_VERS_PHASE.get(base)!;
  if (base.startsWith("85_SOUS_SOL")) return "P08_GROS_OEUVRE_INFRASTRUCTURE";
  if (base.startsWith("86_PLANCHER")) return "P09_GROS_OEUVRE_ELEVATION";
  if (base.startsWith("91_TESTS")) return "P10_SECOND_OEUVRE_EQUIPEMENTS";
  if (base.startsWith("LOT_")) return "P10_SECOND_OEUVRE_EQUIPEMENTS";
  if (base === "36_AFFICHAGE_RECOURS") return "P07_PREPARATION_CHANTIER";
  return null;
}
export const ordrePhase = (code: string | null | undefined) => phaseRef(code)?.ordre ?? -1;

/** Phase P.. d'une phase de réalisation des matériaux (apps/web/src/domain/materiaux/phases.ts). */
export function phaseDesMateriaux(code: string): string | null {
  for (const p of PHASES_REF) if ((p.correspondances.materiaux ?? []).includes(code)) return p.code;
  return null;
}

/** Lot du référentiel depuis un code de chiffrage (INS, FON…) ou de CPS (LOT_02_…). */
export function lotDepuis(code: string): string | null {
  const c = code.trim().toUpperCase();
  for (const l of REF.lots) {
    const v = l.correspondances || {};
    const liste = (s?: string) => (s || "").split(/[+/]/).map((x) => x.trim().split(" ")[0].toUpperCase()).filter(Boolean);
    if (liste(v.chiffrage).includes(c) || liste(v.cps).includes(c) || liste(v.catalogueOuReferentiel).includes(c)) return l.code;
  }
  return null;
}

// ── Types de projet ─────────────────────────────────────────────────────

export type TypeProjetRef = "VILLA" | "IMMEUBLE" | "EQUIPEMENT" | "LOTISSEMENT" | "RENOVATION_EXTENSION";
export const TYPES_PROJET_REF = REF.typesProjet;
const TYPES: Record<string, TypeProjetRef> = {
  // Dossier (typologie)
  MAISON_INDIVIDUELLE: "VILLA", VILLA: "VILLA", IMMEUBLE: "IMMEUBLE", LOCAL_COMMERCIAL: "EQUIPEMENT", AMENAGEMENT_INTERIEUR: "RENOVATION_EXTENSION",
  // Espace projet
  MAISON: "VILLA", MIXTE: "IMMEUBLE", ERP: "EQUIPEMENT", LOTISSEMENT: "LOTISSEMENT",
  // CPS
  VILLA_R1_HS: "VILLA", IMMEUBLE_COLLECTIF_R_PLUS_N: "IMMEUBLE",
  // Référentiel
  EQUIPEMENT: "EQUIPEMENT", RENOVATION_EXTENSION: "RENOVATION_EXTENSION", RENOVATION: "RENOVATION_EXTENSION", EXTENSION: "RENOVATION_EXTENSION",
};
export function typeProjetDepuis(v: string | null | undefined): TypeProjetRef | null {
  return v ? TYPES[v.trim().toUpperCase()] ?? null : null;
}

// ── Rôles : alias entre espace projet, catalogue et référentiel ─────────

const ALIAS_ROLES: Record<string, string> = {
  COORDINATEUR_SPS: "COORDONNATEUR_SPS", ENTREPRISE: "ENTREPRISE_GO", CLIENT: "MAITRE_OUVRAGE", CNOA: "ORDRE_ARCHITECTES",
  CITURBAREA_OPS: "ADMIN_CITURBAREA", ADMIN: "ADMIN_CITURBAREA", ADMINISTRATION: "COMMUNE",
};
/** Rôle du référentiel depuis un rôle de l'espace projet ou un acteur du catalogue. */
export const roleRef = (r: string) => ALIAS_ROLES[r] ?? r;
/** Rôles de l'espace projet qui tiennent un rôle du référentiel (ENTREPRISE couvre ENTREPRISE_GO et ENTREPRISE_LOT). */
export function rolesEspaceProjet(codeRef: string): string[] {
  const a = REF.acteurs.find((x) => x.code === codeRef);
  const r = new Set<string>();
  if (a?.roleEspaceProjet) r.add(a.roleEspaceProjet);
  if (codeRef === "ENTREPRISE_LOT" || codeRef === "ENTREPRISE_GO") r.add("ENTREPRISE");
  if (codeRef === "COORDONNATEUR_SPS") r.add("COORDINATEUR_SPS");
  return [...r];
}

// ── Durées ──────────────────────────────────────────────────────────────

export const DUREES_PAR_TYPE: readonly DureeTypeRef[] = REF.dureesParType ?? [];
/** Durée type (en mois) choisie d'après le profil : une seule source pour tout le logiciel. */
export function dureeType(p: { type?: TypeProjetRef | null; sousSols?: number | null; etagesHorsSol?: number | null }): DureeTypeRef | null {
  const t = p.type ?? "VILLA", ss = p.sousSols ?? 0, et = p.etagesHorsSol ?? 1;
  const code =
    t === "VILLA" ? (ss > 0 ? "VILLA_AVEC_SOUS_SOL" : "VILLA_R1_SANS_SOUS_SOL")
    : t === "IMMEUBLE" ? (et >= 5 || ss > 1 ? "IMMEUBLE_R5_R8_SOUS_SOLS" : "IMMEUBLE_R2_R4")
    : t === "EQUIPEMENT" ? "EQUIPEMENT_PUBLIC"
    : t === "LOTISSEMENT" ? "LOTISSEMENT_PETIT"
    : "EXTENSION";
  return DUREES_PAR_TYPE.find((d) => d.type === code) ?? null;
}
/** Durée d'une phase en semaines [min, max] selon le type (villa par défaut). */
export function dureePhase(phase: PhaseRef, type: TypeProjetRef | null | undefined): [number, number] | null {
  const grand = type === "IMMEUBLE" || type === "EQUIPEMENT" || type === "LOTISSEMENT";
  return (grand ? phase.duree.immeuble : phase.duree.villa) ?? phase.duree.villa ?? null;
}
/** Durée de chantier de référence (mois) : moyenne des bornes des phases P07 à P11. */
export function dureeChantierMois(type: TypeProjetRef | null | undefined): number {
  let min = 0, max = 0;
  for (const p of PHASES_REF.filter((x) => x.ordre >= 7 && x.ordre <= 11)) {
    const d = dureePhase(p, type);
    if (d) { min += d[0]; max += d[1]; }
  }
  return Math.round(((min + max) / 2) / 4.33);
}
