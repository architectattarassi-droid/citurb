/**
 * DQE lot par lot = quantités du métré × prix d'ouvrage régionalisés, puis
 * installation de chantier, aléas, TVA, honoraires, taxes et frais annexes,
 * avec le niveau de précision et l'impact chiffré du sous-sol, du sol et de
 * la pente.
 */
import { INTERVENANTS_DEFAULT } from "../../command-center/modules/dossiers/costRangesMA";
import { coefRegional } from "../prix/grille2026";
import { HYPOTHESES } from "./hypotheses";
import { LOTS, LOT_PAR_CODE, type CodeLot, type Lot } from "./lots";
import { metre, type Geometrie, type LigneMetre, type ProjetInput } from "./metre";
import { OUVRAGES } from "./ouvrages";
import { prixOuvrage, type PrixOuvrage } from "./prix";
import { COEF_K, K_PRIVE, TVA, coefsRegionaux, type SourceRef } from "./referentiel";

export type Origine = "ratio" | "parametrique" | "saisie";

/** Incertitude sur les quantités selon la méthode (demi-largeur relative). */
export const INCERTITUDE_QTE: Record<Origine, number> = { ratio: 0.175, parametrique: 0.09, saisie: 0.04 };
export const NIVEAUX_PRECISION = [
  { niveau: 1 as const, libelle: "Estimation par ratios", plage: "±15 à 20 %" },
  { niveau: 2 as const, libelle: "Métré paramétrique", plage: "±8 à 10 %" },
  { niveau: 3 as const, libelle: "Quantités saisies sur plans", plage: "±3 à 5 %" },
];

export type LigneDQE = LigneMetre & {
  lot: CodeLot;
  libelle: string;
  unite: string;
  pu: number;
  puMin: number;
  puMax: number;
  montant: number;
  montantMin: number;
  montantMax: number;
  origine: Origine;
  prix: PrixOuvrage;
};

export type LotDQE = { lot: Lot; lignes: LigneDQE[]; total: number; min: number; max: number; part: number };

export type LigneFrais = { code: string; libelle: string; base?: string; montant: number; min?: number; max?: number; source?: SourceRef | string };

export type OptionsChiffrage = {
  /** Taux d'honoraires (code intervenant → taux, ex. 0.05). */
  honoraires?: Record<string, number>;
  /** Calcul des variantes (sans sous-sol, bon sol, terrain plat) : coûteux, désactivable. */
  impacts?: boolean;
};

export type Impact = { cle: "sous_sol" | "sol" | "pente"; libelle: string; montantHT: number; dontSoutenement: number; detail: string };

export type Resultat = {
  input: ProjetInput;
  geometrie: Geometrie;
  region: { ville: string; coef: number; mat: number; mo: number };
  k: number;
  lots: LotDQE[];
  lignes: LigneDQE[];
  /** Somme des lots hors installation de chantier. */
  ouvragesHT: number;
  installationHT: number;
  travauxHT: number;
  aleasHT: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  coutM2HT: number;
  coutM2HorsSolHT: number;
  /** Bâtiment seul (hors extérieurs, VRD et options) : base des contrôles avec la grille. */
  batimentHT: number;
  partGrosOeuvre: number;
  honoraires: { lignes: (LigneFrais & { taux: number })[]; totalHT: number; tva: number; totalTTC: number };
  taxes: { lignes: LigneFrais[]; total: number };
  fraisAnnexes: { lignes: LigneFrais[]; total: number };
  budgetTTC: number;
  precision: { niveau: 1 | 2 | 3; libelle: string; qte: number; prix: number; global: number };
  fourchette: { min: number; max: number };
  impacts: Impact[];
  hypotheses: Record<string, number>;
};

const r0 = (n: number) => Math.round(n);

function origineLigne(l: LigneMetre, input: ProjetInput): Origine {
  if (input.quantites && input.quantites[l.id] !== undefined) return "saisie";
  const fait = l.etape === "finitions" ? input.etapes?.finitions : input.etapes?.terrain;
  return fait ? "parametrique" : "ratio";
}

const COLLECTIF = (input: ProjetInput) => input.type === "IMMEUBLE" || input.type === "MIXTE";

/** Taxes et frais d'autorisation (mêmes barèmes que PermitTaxesPanel, plafonds légaux de la loi 47-06). */
export function taxesAutorisation(surfaceCouverte: number, collectif: boolean, facadeMl: number, dureeMois: number): LigneFrais[] {
  const taux = collectif ? 20 : 30;
  const trimestres = Math.max(1, Math.ceil(dureeMois / 3));
  return [
    { code: "TAXE_CONSTRUCTION", libelle: `Taxe sur les opérations de construction (${taux} DH/m² couvert, plafond légal)`, base: `${r0(surfaceCouverte)} m²`, montant: r0(surfaceCouverte * taux),
      source: { fichier: "marche-prive-main-oeuvre", ids: [collectif ? "fa-taxe-construction-coll" : "fa-taxe-construction-indiv"], fiabilite: "A", date: "2011-07", note: "Loi 47-06 ; taux fixé par arrêté communal ; modifications de la loi 14-25 (2025) à vérifier" } },
    { code: "AGENCE_URBAINE", libelle: "Participation agence urbaine (3,6 DH/m²)", base: `${r0(surfaceCouverte)} m²`, montant: r0(surfaceCouverte * 3.6), source: "PermitTaxesPanel (barème indicatif)" },
    { code: "ODP", libelle: "Occupation du domaine public (20 DH/m²/trimestre, façade × 3 m)", base: `${r0(facadeMl)} ml × ${trimestres} trim.`, montant: r0(facadeMl * 3 * trimestres * 20),
      source: { fichier: "marche-prive-main-oeuvre", ids: ["fa-occupation-dp"], fiabilite: "A", date: "2011-07", note: "Plafond 40 DH/m²/trimestre ; 20 retenu (PermitTaxesPanel)" } },
    ...(collectif ? [] : [{ code: "POMPIERS", libelle: "Protection civile (avis sapeurs-pompiers)", montant: 1000, source: "PermitTaxesPanel (forfait villa)" }]),
  ];
}

export function chiffrer(input: ProjetInput, options: OptionsChiffrage = {}): Resultat {
  const { lignes: lm, geometrie, hypotheses } = metre(input);
  const coef = coefRegional(input.ville);
  const reg = coefsRegionaux(coef);
  const region = { mat: reg.mat, mo: reg.mo };
  const h = (id: string) => input.hypotheses?.[id] ?? HYPOTHESES[id].valeur;

  const lignes: LigneDQE[] = lm.map((l) => {
    const p = prixOuvrage(l.ouvrage, region);
    const o = OUVRAGES[l.ouvrage];
    return {
      ...l, lot: o.lot, libelle: o.libelle, unite: o.unite,
      pu: p.pu, puMin: p.min, puMax: p.max,
      montant: l.qte * p.pu, montantMin: l.qte * p.min, montantMax: l.qte * p.max,
      origine: origineLigne(l, input), prix: p,
    };
  });

  const ouvragesHT = lignes.reduce((s, l) => s + l.montant, 0);
  const tauxIns = h("frais.installation");
  const installationHT = ouvragesHT * tauxIns;
  const travauxHT = ouvragesHT + installationHT;

  const lots: LotDQE[] = LOTS.map((lot) => {
    const ls = lignes.filter((l) => l.lot === lot.code);
    let total = ls.reduce((s, l) => s + l.montant, 0);
    let min = ls.reduce((s, l) => s + l.montantMin, 0);
    let max = ls.reduce((s, l) => s + l.montantMax, 0);
    if (lot.code === "INS") { total = installationHT; min = installationHT * 0.75; max = installationHT * 1.5; }
    return { lot, lignes: ls, total, min, max, part: travauxHT ? total / travauxHT : 0 };
  }).filter((l) => l.total > 0);

  const aleasHT = travauxHT * h("frais.aleas");
  const totalHT = travauxHT + aleasHT;
  const tva = totalHT * TVA.taux;
  const totalTTC = totalHT + tva;

  // Bâtiment seul : hors extérieurs, réseaux et options (base de la grille costRangesMA).
  const horsBatiment = lignes.filter((l) => l.lot === "EXT" || l.lot === "VRD" || l.tags.includes("option")).reduce((s, l) => s + l.montant, 0);
  const batimentHT = (ouvragesHT - horsBatiment) * (1 + tauxIns);
  // Gros œuvre : lots INS à ETA, hors cloisons, enduits intérieurs et chapes (second œuvre).
  const go = lignes.filter((l) => !l.tags.includes("option") && (OUVRAGES[l.ouvrage].famille ?? LOT_PAR_CODE[l.lot].famille) === "GROS_OEUVRE").reduce((s, l) => s + l.montant, 0) * (1 + tauxIns);
  const partGrosOeuvre = batimentHT ? go / batimentHT : 0;

  // Honoraires (taux costRangesMA, bureau de contrôle par défaut en collectif seulement).
  const collectif = COLLECTIF(input);
  const hon = INTERVENANTS_DEFAULT.map((i) => {
    const taux = options.honoraires?.[i.code] ?? (i.code === "CTRL" && !collectif ? 0 : i.rate);
    return { code: i.code, libelle: i.label, taux, montant: r0(taux * travauxHT), base: "% des travaux HT", source: "costRangesMA (INTERVENANTS_DEFAULT)" };
  }).filter((x) => x.taux > 0);
  const honHT = hon.reduce((s, x) => s + x.montant, 0);

  const dureeMois = collectif ? 18 + 2 * input.niveaux : 12;
  const taxes = taxesAutorisation(geometrie.surfaceTotale, collectif, Math.sqrt(geometrie.emprise), dureeMois);
  const taxesTotal = taxes.reduce((s, t) => s + t.montant, 0);
  const racc = collectif
    ? { min: 30000, ref: 65000, max: 100000, ids: ["fa-francobat-raccord"] }
    : { min: 5000, ref: 12500, max: 20000, ids: ["fa-lesmre-raccord"] };
  const fraisAnnexes: LigneFrais[] = [
    { code: "RACCORDEMENTS", libelle: "Raccordements eau, électricité, assainissement (devis du distributeur)", montant: racc.ref, min: racc.min, max: racc.max,
      source: { fichier: "marche-prive-main-oeuvre", ids: racc.ids, fiabilite: "C", date: "2026-03/06", note: "Aucune grille Lydec, Redal, Amendis ou ONEE publiée" } },
  ];
  const fraisTotal = fraisAnnexes.reduce((s, f) => s + f.montant, 0);

  // Précision : quantités (méthode) et prix (fourchettes des intrants).
  const qte = ouvragesHT ? lignes.reduce((s, l) => s + INCERTITUDE_QTE[l.origine] * l.montant, 0) / ouvragesHT : 0;
  const quad = Math.sqrt(lignes.reduce((s, l) => s + ((l.montantMax - l.montantMin) / 2) ** 2, 0));
  const prix = ouvragesHT ? quad / ouvragesHT + (COEF_K.max - COEF_K.min) / 2 / K_PRIVE : 0;
  const global = Math.sqrt(qte ** 2 + prix ** 2);
  const niveau: 1 | 2 | 3 = qte <= 0.05 ? 3 : qte <= 0.1 ? 2 : 1;

  const res: Resultat = {
    input, geometrie, hypotheses,
    region: { ville: input.ville ?? "", coef, mat: reg.mat, mo: reg.mo },
    k: K_PRIVE,
    lots, lignes,
    ouvragesHT, installationHT, travauxHT, aleasHT, totalHT, tva, totalTTC,
    coutM2HT: travauxHT / geometrie.surfaceTotale,
    coutM2HorsSolHT: travauxHT / input.surfacePlancher,
    batimentHT, partGrosOeuvre,
    honoraires: { lignes: hon, totalHT: honHT, tva: honHT * TVA.taux, totalTTC: honHT * (1 + TVA.taux) },
    taxes: { lignes: taxes, total: taxesTotal },
    fraisAnnexes: { lignes: fraisAnnexes, total: fraisTotal },
    budgetTTC: totalTTC + honHT * (1 + TVA.taux) + taxesTotal + fraisTotal,
    precision: { niveau, libelle: NIVEAUX_PRECISION[niveau - 1].libelle, qte, prix, global },
    fourchette: { min: totalHT * (1 - global), max: totalHT * (1 + global) },
    impacts: [],
  };
  if (options.impacts !== false) res.impacts = calculerImpacts(input, res);
  return res;
}

const somme = (r: Resultat, f: (l: LigneDQE) => boolean) => r.lignes.filter(f).reduce((s, l) => s + l.montant, 0) * (1 + (r.input.hypotheses?.["frais.installation"] ?? HYPOTHESES["frais.installation"].valeur));

/** Surcoûts du sous-sol, du sol et de la pente, par différence avec un cas de référence. */
export function calculerImpacts(input: ProjetInput, res: Resultat): Impact[] {
  const out: Impact[] = [];
  const sans = (patch: Partial<ProjetInput>) => chiffrer({ ...input, ...patch, quantites: undefined }, { impacts: false });
  if (input.sousSol && input.sousSol.profondeur > 0) {
    const ref = sans({ sousSol: null, nappe: false });
    out.push({
      cle: "sous_sol", libelle: "Sous-sol",
      montantHT: res.travauxHT - ref.travauxHT,
      dontSoutenement: somme(res, (l) => l.tags.includes("sous_sol") && l.tags.includes("soutenement")),
      detail: `${r0(res.geometrie.surfaceSousSol)} m² sur ${input.sousSol.profondeur} m de profondeur${input.nappe ? ", avec nappe (cuvelage, épuisement)" : ""}`,
    });
  }
  if (input.sol && input.sol !== "BON") {
    const ref = sans({ sol: "BON" });
    out.push({ cle: "sol", libelle: "Nature du sol", montantHT: res.travauxHT - ref.travauxHT, dontSoutenement: 0, detail: `fondation : ${res.geometrie.fondation.toLowerCase().replace("_", " ")}` });
  }
  if ((input.pente ?? 0) > 0) {
    const ref = sans({ pente: 0 });
    const delta = res.travauxHT - ref.travauxHT;
    if (delta > 0) out.push({ cle: "pente", libelle: "Pente du terrain", montantHT: delta, dontSoutenement: somme(res, (l) => l.tags.includes("pente") && l.tags.includes("soutenement")), detail: `pente ${input.pente} %` });
  }
  return out;
}

/** Comparaison des 5 standings pour le même projet (finitions par lot réinitialisées). */
export function comparerStandings(input: ProjetInput) {
  return (["ULTRA_ECO", "ECONOMIQUE", "STANDARD", "STANDING", "PREMIUM"] as const).map((s) => {
    const r = chiffrer({ ...input, standing: s, finitions: undefined }, { impacts: false });
    return { standing: s, travauxHT: r.travauxHT, coutM2HT: r.coutM2HT, totalTTC: r.totalTTC };
  });
}

