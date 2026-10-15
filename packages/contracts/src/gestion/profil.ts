/**
 * Profil du projet et conditions d'application (lot GP1) : quels documents,
 * jalons et phases s'appliquent à CE dossier.
 *
 * Décisions du fondateur (15/10/2026) appliquées ici :
 *   - bureau de contrôle obligatoire au-delà de 5 MDH de budget de travaux ;
 *   - TRC et décennale obligatoires au-delà de 3 étages ou 800 m² (décret
 *     2-18-577, qui remplace le 2-13-424 abrogé) ;
 * Les conditions du JSON sont des phrases : chacune est traduite ici en règle.
 * Une phrase inconnue (référentiel enrichi depuis) donne « À_CONFIRMER » :
 * la pièce s'affiche, l'admin la confirme ou la met « sans objet ».
 */
import { REF, type JalonRef, type TypeProjetRef } from "./referentiel";

export interface ProfilProjet {
  type: TypeProjetRef | null;
  /** Budget de travaux en millions de dirhams. */
  budgetMDH?: number | null;
  etagesHorsSol?: number | null;
  sousSols?: number | null;
  surfacePlancherM2?: number | null;
  ascenseur?: boolean | null; piscine?: boolean | null; erp?: boolean | null; climatisation?: boolean | null;
  gaz?: boolean | null; solaire?: boolean | null; demolition?: boolean | null; lotissementAutorise?: boolean | null;
  terrainNonImmatricule?: boolean | null; indivision?: boolean | null; credit?: boolean | null; copropriete?: boolean | null;
  mitoyennete?: boolean | null;
  /** Codes de documents « selon les événements » (avance, cautions, carence…) activés par l'admin. */
  activer?: string[];
}

export type Applicabilite = "EXIGE" | "A_CONFIRMER" | "NON";

export const SEUIL_BUREAU_CONTROLE_MDH = REF.decisionsFondateur?.bureauControle?.seuilMDH ?? 5;
export const SEUIL_ASSURANCE_ETAGES = 3;
export const SEUIL_ASSURANCE_M2 = 800;

const grand = (p: ProfilProjet) => p.type === "IMMEUBLE" || p.type === "EQUIPEMENT";

/** Bureau de contrôle : oui (> 5 MDH), non (budget connu ≤ 5 MDH), null (budget inconnu). */
export function bureauControleObligatoire(p: ProfilProjet): boolean | null {
  if (p.budgetMDH == null || !Number.isFinite(p.budgetMDH)) return null;
  return p.budgetMDH > SEUIL_BUREAU_CONTROLE_MDH;
}

/** TRC et décennale : plus de 3 étages ou plus de 800 m², ou bâtiment non résidentiel (équipement). */
export function assurancesObligatoires(p: ProfilProjet): boolean | null {
  if (p.type === "EQUIPEMENT") return true;
  const e = p.etagesHorsSol, s = p.surfacePlancherM2;
  if ((e != null && e > SEUIL_ASSURANCE_ETAGES) || (s != null && s > SEUIL_ASSURANCE_M2)) return true;
  if (e == null || s == null) return null;
  return false;
}

const oui = (v: boolean | null | undefined): Applicabilite => (v == null ? "A_CONFIRMER" : v ? "EXIGE" : "NON");
/** Condition remplie si `fort` ; sinon « recommandé » → à confirmer par l'admin. */
const ouConfirmer = (fort: boolean): Applicabilite => (fort ? "EXIGE" : "A_CONFIRMER");
const evenement: Applicabilite = "NON";

type Regle = (p: ProfilProjet) => Applicabilite;
const REGLES: Array<[RegExp, Regle]> = [
  [/^Terrain non immatricul/i, (p) => oui(p.terrainNonImmatricule)],
  [/^Indivision$/i, (p) => oui(p.indivision)],
  [/lotissement autoris/i, (p) => oui(p.lotissementAutorise)],
  [/^Indispensable avec sous-sol/i, (p) => ((p.sousSols ?? 0) > 0 || grand(p) ? "EXIGE" : "A_CONFIRMER")],
  [/^Immeuble, équipement, villa avec équipements/i, (p) => ouConfirmer(grand(p))],
  [/au-delà de 5 MDH|Bureau de contrôle mandaté/i, (p) => oui(bureauControleObligatoire(p))],
  [/^Établissement recevant du public, habitat collectif/i, (p) => (grand(p) || p.erp ? "EXIGE" : p.erp == null && p.type == null ? "A_CONFIRMER" : "NON")],
  [/^Immeuble, équipement$/i, (p) => (p.type == null ? "A_CONFIRMER" : grand(p) ? "EXIGE" : "NON")],
  [/^Construction existante à démolir/i, (p) => oui(p.demolition)],
  [/^Grand projet, ERP, immeuble/i, (p) => (grand(p) || p.erp ? "EXIGE" : p.type == null ? "A_CONFIRMER" : "NON")],
  [/^Climatisation prévue, immeuble/i, (p) => (grand(p) || p.climatisation ? "EXIGE" : p.climatisation == null ? "A_CONFIRMER" : "NON")],
  [/plus de 3 étages|Mêmes seuils que la TRC|mêmes seuils que la TRC/i, (p) => oui(assurancesObligatoires(p))],
  [/^Crédit$/i, (p) => oui(p.credit)],
  [/^Mitoyenneté, sous-sol, immeuble/i, (p) => (p.mitoyennete || (p.sousSols ?? 0) > 0 || p.type === "IMMEUBLE" ? "EXIGE" : "A_CONFIRMER")],
  [/^Immeuble, équipement, chantier à plusieurs/i, (p) => ouConfirmer(grand(p))],
  [/^Immeuble, terrain en pente/i, (p) => ouConfirmer(p.type === "IMMEUBLE")],
  [/^Climatisation$/i, (p) => oui(p.climatisation)],
  [/^Installation gaz$/i, (p) => oui(p.gaz)],
  [/^Ascenseur$/i, (p) => oui(p.ascenseur)],
  [/^Immeuble, ERP$/i, (p) => (grand(p) || p.erp ? "EXIGE" : p.type == null ? "A_CONFIRMER" : "NON")],
  [/^Piscine$/i, (p) => oui(p.piscine)],
  [/^Solaire$/i, (p) => oui(p.solaire)],
  [/^Immeuble en copropriété/i, (p) => oui(p.copropriete ?? (p.type === "IMMEUBLE" ? true : p.type ? false : null))],
  // Pièces liées à un événement du chantier : absentes tant que l'admin ne les active pas.
  [/^(Si prévue au marché|Avance prévue|Cautions remises|Retenue pratiquée|Carence de l'entreprise|Désordre grave|Avis avec réserves)$/i, () => evenement],
  // Pièces qui dépendent de la commune, du distributeur ou du chantier : l'admin tranche.
  [/^Selon |^Remblai |^Fourniture par |^Quand l'architecte/i, () => "A_CONFIRMER"],
];

/** Une condition du référentiel (phrase) appliquée au profil. */
export function evaluerCondition(texte: string | null | undefined, p: ProfilProjet): Applicabilite {
  if (!texte) return "EXIGE";
  for (const [re, f] of REGLES) if (re.test(texte.trim())) return f(p);
  return "A_CONFIRMER";
}
/** La phrase est-elle connue (traduite en règle) ? Sert au test de couverture du référentiel. */
export const conditionConnue = (texte: string) => REGLES.some(([re]) => re.test(texte.trim()));

/** Applicabilité d'un document : obligatoire, facultatif (« NON » sauf activation) ou conditionnel. */
export function applicabiliteDocument(d: { code: string; obligatoire: true | false | "CONDITIONNEL"; condition?: string }, p: ProfilProjet): Applicabilite {
  if (p.activer?.includes(d.code)) return "EXIGE";
  if (d.obligatoire === true) return "EXIGE";
  if (d.obligatoire === false) return "NON";
  return evaluerCondition(d.condition, p);
}

/** Le jalon s'applique-t-il au projet ? (conditions structurées du JSON) */
export function jalonApplicable(j: Pick<JalonRef, "conditions">, p: ProfilProjet): boolean {
  const c = j.conditions;
  if (!c) return true;
  if (c.sousSol != null && ((p.sousSols ?? 0) > 0) !== c.sousSol) return false;
  if (c.types && p.type && !c.types.includes(p.type)) return false;
  return true;
}

// ── Profil depuis un dossier ────────────────────────────────────────────

const nombre = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const bool = (v: unknown): boolean | null => (v === true || v === false ? v : null);
const CHAMPS_BOOL = ["ascenseur", "piscine", "erp", "climatisation", "gaz", "solaire", "demolition", "lotissementAutorise",
  "terrainNonImmatricule", "indivision", "credit", "copropriete", "mitoyennete"] as const;

/** Lit et borne un profil saisi (formulaire admin) ; les champs inconnus sont ignorés. */
export function validerProfil(v: unknown, type: TypeProjetRef | null): ProfilProjet {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const types = ["VILLA", "IMMEUBLE", "EQUIPEMENT", "LOTISSEMENT", "RENOVATION_EXTENSION"];
  const p: ProfilProjet = { type: types.includes(String(o.type)) ? (o.type as TypeProjetRef) : type };
  const b = nombre(o.budgetMDH); if (b != null && b < 10_000) p.budgetMDH = Math.round(b * 1000) / 1000;
  const e = nombre(o.etagesHorsSol); if (e != null && e <= 80) p.etagesHorsSol = Math.floor(e);
  const s = nombre(o.sousSols); if (s != null && s <= 8) p.sousSols = Math.floor(s);
  const m = nombre(o.surfacePlancherM2); if (m != null && m < 1_000_000) p.surfacePlancherM2 = Math.round(m);
  for (const k of CHAMPS_BOOL) { const x = bool(o[k]); if (x != null) p[k] = x; }
  if (Array.isArray(o.activer)) p.activer = [...new Set(o.activer.filter((x): x is string => typeof x === "string" && /^[A-Z0-9_]{2,80}$/.test(x)))].slice(0, 100);
  return p;
}

/**
 * Profil d'un dossier : colonnes du Dossier (budget en dirhams, surfaces, niveaux),
 * complétées puis corrigées par le profil saisi par l'admin (payload.gestion.profil).
 */
export function profilDuDossier(d: Record<string, unknown>, type: TypeProjetRef | null): ProfilProjet {
  const payload = (d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>;
  const gestion = (payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>;
  const saisi = validerProfil(gestion.profil, null);
  const budgetDh = nombre(d.budgetEstime);
  const base: ProfilProjet = {
    type,
    budgetMDH: budgetDh != null ? budgetDh / 1_000_000 : null,
    etagesHorsSol: nombre(d.nbEtagesHorsSol),
    sousSols: nombre(d.nbSousSols),
    surfacePlancherM2: nombre(d.surfacePlancher),
  };
  const out: ProfilProjet = { ...base };
  for (const [k, v] of Object.entries(saisi)) if (v != null) (out as unknown as Record<string, unknown>)[k] = v;
  if (!out.type) out.type = type;
  return out;
}
