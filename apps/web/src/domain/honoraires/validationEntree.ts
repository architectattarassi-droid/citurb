/**
 * Relecture stricte d'une saisie de devis reçue du navigateur (serveur) :
 * énumérations fermées, décimaux relus par Dec, textes bornés. Les montants
 * ne sont jamais lus : le serveur les recalcule (devisComplet.ts).
 */
import { Dec } from "./decimal";
import type { EntreeDevisComplet } from "./devisComplet";
import type { Fondations, Metre, Niveau, ReglesMetre } from "./metre";
import type { CodeNiveau, GrilleTarifaire, ModalitePaiement, Presentation, TypeDevis, UsageNiveau } from "./types";

const TYPES: TypeDevis[] = ["MISSION_COMPLETE", "MISSION_PARTIELLE", "COMPLEMENTAIRE"];
const PRESENTATIONS: Presentation[] = ["DETAILLEE", "PACKS"];
const MODALITES: ModalitePaiement[] = ["AVANCE_TOTALE", "50_50", "PAR_TRANCHES", "PAR_VISITE"];
const CODES_NIVEAU: CodeNiveau[] = ["SOUS_SOL", "RDC", "ETAGE", "TERRASSE", "MEZZANINE"];
const USAGES: UsageNiveau[] = ["HABITATION", "COMMERCIAL", "PARKING", "TECHNIQUE"];
const CARACTERES = ["OBLIGATOIRE", "FACULTATIVE", "RECOMMANDEE", "SUR_DEMANDE"] as const;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const texte = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const un = <T,>(v: unknown, permis: readonly T[]): T | null => (permis.includes(v as T) ? (v as T) : null);

function decimal(v: unknown, champ: string, erreurs: string[], opts: { requis?: boolean; positif?: boolean } = {}): string | undefined {
  if (v == null || v === "") { if (opts.requis) erreurs.push(`${champ} requis`); return undefined; }
  if (typeof v !== "string" && typeof v !== "number") { erreurs.push(`${champ} invalide`); return undefined; }
  try {
    const d = Dec.de(v);
    if (opts.positif !== false && d.estNegatif()) { erreurs.push(`${champ} négatif`); return undefined; }
    if (d.cmp("1000000000") > 0) { erreurs.push(`${champ} hors limites`); return undefined; }
    return d.toString();
  } catch { erreurs.push(`${champ} invalide`); return undefined; }
}

export function validerEntreeDevis(b: unknown, grille: GrilleTarifaire): { ok: true; entree: EntreeDevisComplet } | { ok: false; erreurs: string[] } {
  const e = obj(b), erreurs: string[] = [];
  const type = un(e.type, TYPES), presentation = un(e.presentation, PRESENTATIONS), modalitesPaiement = un(e.modalitesPaiement, MODALITES);
  if (!type) erreurs.push("Type de devis invalide");
  if (!presentation) erreurs.push("Présentation invalide");
  if (!modalitesPaiement) erreurs.push("Modalités de paiement invalides");
  const validiteJours = Number.isInteger(e.validiteJours) && (e.validiteJours as number) >= 1 && (e.validiteJours as number) <= 365 ? (e.validiteJours as number) : 30;

  let metre: Metre | undefined;
  if (e.metre != null) {
    const m = obj(e.metre);
    const niveaux: Niveau[] = [];
    for (const n of Array.isArray(m.niveaux) ? m.niveaux.slice(0, 40) : []) {
      const x = obj(n);
      const code = un(x.code, CODES_NIVEAU);
      if (!code || !Number.isInteger(x.rang)) { erreurs.push("Niveau invalide"); continue; }
      const surface = decimal(x.surface, "Surface de niveau", erreurs);
      niveaux.push({ code, rang: x.rang as number, usage: un(x.usage, USAGES) ?? undefined, ...(surface != null ? { surface, surfaceSource: "SAISIE" as const } : {}) });
    }
    const r = obj(m.regles), regles: ReglesMetre = {};
    if (r.sousSol) {
      const s = obj(r.sousSol);
      const emprise = un(s.emprise, ["TOTALE", "REDUITE"] as const), statut = un(s.statut, ["TRANCHE", "HYPOTHESE"] as const);
      if (emprise && statut && typeof s.courDeduite === "boolean") regles.sousSol = { emprise, courDeduite: s.courDeduite, statut };
    }
    if (r.courRdc) {
      const c = obj(r.courRdc);
      const statut = un(c.statut, ["TRANCHE", "HYPOTHESE"] as const);
      if (statut && typeof c.deduite === "boolean") regles.courRdc = { deduite: c.deduite, statut };
    }
    metre = {
      superficieTerrain: decimal(m.superficieTerrain, "Superficie du terrain", erreurs, { requis: true }) ?? "0",
      deductionEmprise: decimal(m.deductionEmprise, "Déduction d'emprise", erreurs),
      surfaceCour: decimal(m.surfaceCour, "Surface de cour", erreurs),
      encorbellementProfondeur: decimal(m.encorbellementProfondeur, "Profondeur d'encorbellement", erreurs),
      empriseEtageAvecEncorbellement: decimal(m.empriseEtageAvecEncorbellement, "Emprise d'étage", erreurs),
      niveaux, regles,
    };
  }

  let fondations: Fondations | undefined;
  if (e.fondations != null) {
    const f = obj(e.fondations), statut = un(f.statut, ["TRANCHE", "HYPOTHESE"] as const) ?? undefined;
    if (f.incluses === true) fondations = { incluses: true, statut };
    else if (f.incluses === false) fondations = { incluses: false, pu: decimal(f.pu, "Prix des fondations", erreurs, { requis: true }) ?? "0", statut };
  }

  const vus = new Set<string>();
  const lignes: EntreeDevisComplet["lignes"] = [];
  for (const l of Array.isArray(e.lignes) ? e.lignes.slice(0, 60) : []) {
    const x = obj(l), code = texte(x.code, 40);
    if (!grille.prestations.some((p) => p.code === code)) { erreurs.push(`Prestation inconnue : ${code || "?"}`); continue; }
    if (vus.has(code)) continue;
    vus.add(code);
    lignes.push({
      code,
      quantite: decimal(x.quantite, `Quantité (${code})`, erreurs),
      prix: decimal(x.prix, `Prix (${code})`, erreurs),
      caractere: un(x.caractere, CARACTERES) ?? undefined,
    });
  }
  if (!lignes.length) erreurs.push("Choisir au moins une prestation");

  const liste = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => texte(x, max)).filter(Boolean) : []);
  if (erreurs.length) return { ok: false, erreurs };
  return {
    ok: true,
    entree: {
      type: type as TypeDevis, presentation: presentation as Presentation, modalitesPaiement: modalitesPaiement as ModalitePaiement, validiteJours,
      objet: texte(e.objet, 300) || undefined,
      metre, puElevation: decimal(e.puElevation, "PU d'élévation", []), fondations,
      tauxHonoraires: decimal(e.tauxHonoraires, "Taux d'honoraires", []),
      lignes, exclusions: liste(e.exclusions, 20, 200), hypothesesLibres: liste(e.hypothesesLibres, 10, 300),
      pourRemplissageManuel: e.pourRemplissageManuel === true,
    },
  };
}
