/**
 * Métré paramétrique : quelques entrées simples → quantités par ouvrage.
 * Base commune villa / maison R+1-R+2 / immeuble R+N / mixte : seuls les
 * défauts (mitoyenneté, terrain, hauteur, ascenseur, logements) changent.
 * Chaque ligne porte sa formule et les hypothèses utilisées (hypotheses.ts).
 */
import type { Standing } from "../../command-center/modules/dossiers/costRangesMA";
import { HYPOTHESES } from "./hypotheses";
import { OUVRAGES } from "./ouvrages";

export type TypeBatiment = "VILLA" | "MAISON" | "IMMEUBLE" | "MIXTE";
export type NatureSol = "ROCHER" | "BON" | "MOYEN" | "ARGILE_REMBLAI";
export const LOTS_FINITION = ["RSO", "RMU", "PEI", "FPL", "ALU", "BOI", "MET", "PLO", "ELE", "FAC"] as const;
export type LotFinition = (typeof LOTS_FINITION)[number];
export const STANDINGS: Standing[] = ["ULTRA_ECO", "ECONOMIQUE", "STANDARD", "STANDING", "PREMIUM"];

export type ProjetInput = {
  type: TypeBatiment;
  ville?: string;
  /** Surface de plancher hors sous-sol (m²). */
  surfacePlancher: number;
  /** Niveaux hors sol, RDC compris (R+1 = 2). */
  niveaux: number;
  emprise?: number;
  surfaceTerrain?: number;
  hauteurSousPlafond?: number;
  /** Sous-sol : profondeur de terre à soutenir (m) et surface (défaut : emprise). */
  sousSol?: { profondeur: number; surface?: number } | null;
  nappe?: boolean;
  sol?: NatureSol;
  /** Pente moyenne du terrain (%). */
  pente?: number;
  /** Nombre de côtés mitoyens (0 à 3). */
  mitoyennete?: number;
  standing: Standing;
  finitions?: Partial<Record<LotFinition, Standing>>;
  chambres?: number;
  sallesDeBain?: number;
  logements?: number;
  /** Toit-terrasse accessible (carrelé, garde-corps). */
  terrasseAccessible?: boolean;
  /** Balcons et terrasses extérieures carrelées (m²). */
  terrasses?: number;
  /** Clôture (ml) ; non renseigné = calcul automatique. */
  cloture?: number | null;
  portail?: boolean;
  piscine?: number;
  ascenseur?: boolean | null;
  climatisation?: boolean | null;
  chauffeEauSolaire?: boolean | null;
  photovoltaiqueKwc?: number;
  cuisineMl?: number;
  /** Écrasements des hypothèses (id → valeur). */
  hypotheses?: Record<string, number>;
  /** Quantités saisies sur plans (id de ligne → quantité) : niveau de précision 3. */
  quantites?: Record<string, number>;
  /** Étapes renseignées par l'utilisateur (sinon : valeurs par défaut). */
  etapes?: { terrain?: boolean; finitions?: boolean };
};

export type Tag = "sous_sol" | "soutenement" | "sol" | "pente" | "option";
export type Etape = "projet" | "terrain" | "finitions";

export type LigneMetre = {
  id: string;
  ouvrage: string;
  qte: number;
  formule: string;
  etape: Etape;
  tags: Tag[];
  hypotheses: string[];
};

export type Geometrie = {
  emprise: number;
  surfaceTerrain: number;
  surfaceSousSol: number;
  surfaceTotale: number;
  perimetre: number;
  hauteurEtage: number;
  mursExterieurs: number;
  baies: number;
  logements: number;
  chambres: number;
  sallesDeBain: number;
  sol: NatureSol;
  fondation: "SEMELLES_ISOLEES" | "SEMELLES_FILANTES" | "RADIER";
  ascenseur: boolean;
  climatisation: boolean;
  chauffeEauSolaire: boolean;
  cloture: number;
};

/** Choix d'ouvrages et de ratios par lot de finition et par standing. */
export const GAMMES: Record<Standing, {
  sol: string; mur: string; peinture: string; fpBA13: number; fpStaff: number;
  alu: string; aluLuxePart: number; volets: number; porteEntree: string; porte: string;
  gardeCorps: string; sdb: string; evier: string; ptLum: string; prise: string; densiteElec: number;
  facade: string; facadePierre: number; baies: number; isolation: string | null; plancher: string; cfa: boolean;
  climDefaut: boolean; split12: string; gainable: boolean; solaireDefaut: boolean;
}> = {
  ULTRA_ECO: { sol: "RSO.01", mur: "RMU.01", peinture: "PEI.01", fpBA13: 0, fpStaff: 0, alu: "ALU.01", aluLuxePart: 0, volets: 0, porteEntree: "ALU.06", porte: "BOI.01", gardeCorps: "MET.01", sdb: "PLO.02", evier: "PLO.06", ptLum: "ELE.01", prise: "ELE.02", densiteElec: 0.85, facade: "FAC.02", facadePierre: 0, baies: 0.13, isolation: null, plancher: "STR.03", cfa: false, climDefaut: false, split12: "CVC.01", gainable: false, solaireDefaut: false },
  ECONOMIQUE: { sol: "RSO.02", mur: "RMU.01", peinture: "PEI.02", fpBA13: 0.3, fpStaff: 0, alu: "ALU.02", aluLuxePart: 0, volets: 0.3, porteEntree: "ALU.06", porte: "BOI.02", gardeCorps: "MET.02", sdb: "PLO.03", evier: "PLO.06", ptLum: "ELE.01", prise: "ELE.02", densiteElec: 1, facade: "FAC.02", facadePierre: 0, baies: 0.15, isolation: "ETA.05", plancher: "STR.03", cfa: true, climDefaut: false, split12: "CVC.01", gainable: false, solaireDefaut: false },
  STANDARD: { sol: "RSO.03", mur: "RMU.02", peinture: "PEI.02", fpBA13: 0.6, fpStaff: 0, alu: "ALU.03", aluLuxePart: 0, volets: 0.6, porteEntree: "BOI.05", porte: "BOI.03", gardeCorps: "MET.03", sdb: "PLO.04", evier: "PLO.07", ptLum: "ELE.03", prise: "ELE.04", densiteElec: 1.15, facade: "FAC.03", facadePierre: 0.1, baies: 0.17, isolation: "ETA.04", plancher: "STR.03", cfa: true, climDefaut: true, split12: "CVC.01", gainable: false, solaireDefaut: true },
  STANDING: { sol: "RSO.04", mur: "RMU.02", peinture: "PEI.03", fpBA13: 0.6, fpStaff: 0.4, alu: "ALU.03", aluLuxePart: 0.3, volets: 0.8, porteEntree: "BOI.05", porte: "BOI.04", gardeCorps: "MET.03", sdb: "PLO.05", evier: "PLO.07", ptLum: "ELE.03", prise: "ELE.04", densiteElec: 1.35, facade: "FAC.03", facadePierre: 0.25, baies: 0.2, isolation: "ETA.04", plancher: "STR.04", cfa: true, climDefaut: true, split12: "CVC.03", gainable: false, solaireDefaut: true },
  PREMIUM: { sol: "RSO.05", mur: "RMU.03", peinture: "PEI.03", fpBA13: 0.3, fpStaff: 0.7, alu: "ALU.03", aluLuxePart: 0.7, volets: 0.9, porteEntree: "BOI.05", porte: "BOI.04", gardeCorps: "MET.04", sdb: "PLO.05", evier: "PLO.07", ptLum: "ELE.03", prise: "ELE.04", densiteElec: 1.6, facade: "FAC.03", facadePierre: 0.5, baies: 0.24, isolation: "ETA.04", plancher: "STR.04", cfa: true, climDefaut: true, split12: "CVC.03", gainable: true, solaireDefaut: true },
};

const DEFAUTS_TYPE: Record<TypeBatiment, { mitoyennete: number; terrainSurEmprise: number; hsp: number; baiesFacteur: number; cloture: boolean }> = {
  VILLA: { mitoyennete: 0, terrainSurEmprise: 3, hsp: 3.0, baiesFacteur: 1, cloture: true },
  MAISON: { mitoyennete: 2, terrainSurEmprise: 1, hsp: 2.8, baiesFacteur: 0.85, cloture: false },
  IMMEUBLE: { mitoyennete: 2, terrainSurEmprise: 1, hsp: 2.8, baiesFacteur: 0.85, cloture: false },
  MIXTE: { mitoyennete: 2, terrainSurEmprise: 1, hsp: 2.9, baiesFacteur: 0.9, cloture: false },
};

const arr = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const fmt = (n: number) => arr(n).toLocaleString("fr-FR");

export function metre(input: ProjetInput): { lignes: LigneMetre[]; geometrie: Geometrie; hypotheses: Record<string, number> } {
  const used: Record<string, number> = {};
  const h = (id: string): number => {
    const v = input.hypotheses?.[id] ?? HYPOTHESES[id]?.valeur;
    if (v === undefined) throw new Error(`Hypothèse inconnue : ${id}`);
    used[id] = v;
    return v;
  };
  const lignes: LigneMetre[] = [];
  const add = (id: string, ouvrage: string, qte: number, formule: string, etape: Etape, hyps: string[] = [], tags: Tag[] = []) => {
    if (!(qte > 0)) return;
    // Ouvrages dénombrables : arrondi à l'unité supérieure.
    if (OUVRAGES[ouvrage].unite === "u" || OUVRAGES[ouvrage].unite === "ens") qte = Math.ceil(qte - 1e-9);
    lignes.push({ id, ouvrage, qte: arr(qte), formule, etape, tags, hypotheses: hyps });
  };

  const def = DEFAUTS_TYPE[input.type];
  const collectif = input.type === "IMMEUBLE" || input.type === "MIXTE";
  const n = Math.max(1, Math.round(input.niveaux));
  const Sp = Math.max(20, input.surfacePlancher);
  const E = input.emprise && input.emprise > 0 ? input.emprise : Sp / n;
  const T = input.surfaceTerrain && input.surfaceTerrain > 0 ? input.surfaceTerrain : E * def.terrainSurEmprise;
  const mit = Math.min(3, Math.max(0, input.mitoyennete ?? def.mitoyennete));
  // Villas haut standing et luxe : plafonds plus hauts (hypothèse 3,2 m).
  const hsp = input.hauteurSousPlafond ?? (input.type === "VILLA" && (input.standing === "STANDING" || input.standing === "PREMIUM") ? 3.2 : def.hsp);
  const sol: NatureSol = input.sol ?? "BON";
  const pente = Math.max(0, input.pente ?? 0);
  const g = (lot: LotFinition) => GAMMES[input.finitions?.[lot] ?? input.standing];
  const G = GAMMES[input.standing];

  const kP = h("geo.coefPerimetre");
  const P = kP * Math.sqrt(E);
  const hEt = hsp + h("geo.epaisseurPlancher");
  const fLibre = (4 - mit) / 4;
  const baies = g("ALU").baies * def.baiesFacteur * Sp;
  const mursBruts = P * hEt * n;
  const mursExt = Math.max(0, mursBruts - baies);

  const logements = collectif ? Math.max(1, input.logements ?? Math.round((Sp * 0.85) / 90)) : 1;
  const chambres = Math.max(1, input.chambres ?? (collectif ? logements * 2 : Math.min(8, Math.max(2, Math.round(Sp / 50)))));
  const sdb = Math.max(1, input.sallesDeBain ?? (collectif ? logements : Math.max(1, Math.round(chambres * 0.75))));

  // ── Sous-sol ─────────────────────────────────────────────────────────
  const ss = input.sousSol && input.sousSol.profondeur > 0 ? input.sousSol : null;
  const Sss = ss ? (ss.surface && ss.surface > 0 ? ss.surface : E) : 0;
  const Hss = ss ? ss.profondeur : 0;
  const Pss = ss ? kP * Math.sqrt(Sss) : 0;
  const Stot = Sp + Sss;

  // ── Fondation selon le sol ───────────────────────────────────────────
  const radier = sol === "ARGILE_REMBLAI" || (!!ss && !!input.nappe);
  const fondation: Geometrie["fondation"] = radier ? "RADIER" : sol === "MOYEN" ? "SEMELLES_FILANTES" : "SEMELLES_ISOLEES";
  const Efond = ss ? Math.max(E, Sss) : E;
  const surcoutPente = pente >= h("pente.seuil") ? (h("pente.surcoutFondations") * pente) / 100 : 0;
  const tagsSol: Tag[] = sol === "BON" ? [] : ["sol"];

  // ── 01 Terrassements, 02 Fondations ──────────────────────────────────
  const ab = h("ter.abords");
  add("TER.decapage", "TER.01", (Math.sqrt(Efond) + 2 * ab) ** 2, `(√emprise + 2 × ${ab} m)²`, "terrain", ["ter.abords"]);

  let volFond = 0, volLongrines = 0, fouilles = 0, pleineMasse = 0, remblaiFouilles = 0, remblaiAutres = 0, purge = 0;
  if (radier) {
    const ep = h("fon.radierEpaisseur") + 0.05 * Math.max(0, n - 2);
    volFond = Efond * ep * (1 + surcoutPente);
    add("FON.radier", "FON.04", volFond, `${fmt(Efond)} m² × ${fmt(ep)} m${surcoutPente ? " × redans" : ""}`, "terrain", ["fon.radierEpaisseur"], sol === "ARGILE_REMBLAI" ? ["sol"] : ["sous_sol"]);
    add("FON.proprete", "FON.01", Efond, "surface du radier", "terrain", [], tagsSol);
    if (sol === "ARGILE_REMBLAI") {
      purge = Efond * h("fon.purge");
      add("TER.purge", "TER.02", purge, `${fmt(Efond)} m² × purge ${h("fon.purge")} m`, "terrain", ["fon.purge"], ["sol"]);
      add("TER.substitution", "TER.06", purge, "substitution compactée en tout-venant", "terrain", ["fon.purge"], ["sol"]);
    }
    if (!ss) pleineMasse += Efond * ep;
  } else {
    const r = h(`fon.ratio.${sol}`);
    volFond = r * Stot * (1 + surcoutPente);
    add("FON.semelles", sol === "MOYEN" ? "FON.03" : "FON.02", volFond, `${r} m³/m² × ${fmt(Stot)} m²${surcoutPente ? ` × (1 + ${fmt(surcoutPente)} redans)` : ""}`, "terrain", [`fon.ratio.${sol}`], tagsSol);
    volLongrines = h("fon.longrines") * Efond;
    add("FON.longrines", "FON.05", volLongrines, `${h("fon.longrines")} m³/m² × emprise`, "terrain", ["fon.longrines"]);
    add("FON.proprete", "FON.01", volFond / h("fon.hauteurSemelle") + volLongrines / 0.4, "volume des semelles ÷ hauteur + longrines", "terrain", ["fon.hauteurSemelle"], tagsSol);
    fouilles = (volFond + volLongrines) * h("fon.surlargeurFouilles");
    add("TER.fouilles", "TER.03", fouilles, `béton de fondation × ${h("fon.surlargeurFouilles")}`, "terrain", ["fon.surlargeurFouilles"], tagsSol);
    if (sol === "ROCHER") add("TER.rocher", "TER.04", fouilles, "fouilles en terrain rocheux", "terrain", [], ["sol"]);
    remblaiFouilles = Math.max(0, fouilles - volFond - volLongrines);
  }
  add("FON.amorces", "FON.06", h("fon.amorces") * Efond, `${h("fon.amorces")} m³/m² × emprise`, "terrain", ["fon.amorces"]);
  if (!radier) {
    const Sdal = ss ? Sss : E;
    add("FON.herisson", "FON.07", Sdal, ss ? "fond du sous-sol" : "emprise du RDC", "terrain");
    add("FON.dallage", "FON.08", Sdal, ss ? "fond du sous-sol" : "emprise du RDC", "terrain");
  }

  if (ss) {
    const sl = h("ss.surlargeur");
    const cote = Math.sqrt(Sss);
    const ext = (cote + 2 * sl) ** 2;
    const vol = ext * Hss;
    pleineMasse += vol;
    add("SS.deblai", "TER.02", vol, `(√${fmt(Sss)} + 2 × ${sl} m)² × ${fmt(Hss)} m`, "terrain", ["ss.surlargeur"], ["sous_sol"]);
    if (sol === "ROCHER") add("SS.rocher", "TER.04", vol, "déblai du sous-sol en terrain rocheux", "terrain", [], ["sous_sol", "sol"]);
    if (mit > 0) add("SS.blindage", "TER.08", mit * cote * Hss, `${mit} côté(s) mitoyen(s) × ${fmt(cote)} m × ${fmt(Hss)} m`, "terrain", [], ["sous_sol", "soutenement"]);
    const hv = Hss + 0.3;
    add("SS.voile", "FON.10", Pss * hv, `périmètre ${fmt(Pss)} m × (${fmt(Hss)} + 0,30) m`, "terrain", ["geo.coefPerimetre"], ["sous_sol", "soutenement"]);
    add("SS.semelleVoile", "FON.03", Pss * h("ss.semelleVoile"), `${fmt(Pss)} ml × ${h("ss.semelleVoile")} m³/ml`, "terrain", ["ss.semelleVoile"], ["sous_sol", "soutenement"]);
    add("SS.drainage", "FON.12", Pss, "périmètre du sous-sol", "terrain", [], ["sous_sol", "soutenement"]);
    add("SS.etancheite", "FON.13", Pss * Hss, "parois enterrées", "terrain", [], ["sous_sol", "soutenement"]);
    const remblaiVoile = Math.max(0, vol - Sss * Hss);
    remblaiAutres += remblaiVoile;
    add("SS.remblai", "TER.07", remblaiVoile, "remblai contre les voiles (surlargeur)", "terrain", [], ["sous_sol"]);
    if (input.nappe) {
      add("SS.cuvelage", "FON.14", Pss * Hss + Sss, "parois + fond", "terrain", [], ["sous_sol", "soutenement"]);
      add("SS.epuisement", "TER.09", h("ss.semainesEpuisement"), "durée du gros œuvre enterré", "terrain", ["ss.semainesEpuisement"], ["sous_sol"]);
    }
    // Aménagement minimal du sous-sol (garage / cave)
    add("SS.chape", "MAC.07", Sss * h("geo.ratioSols"), "sol du sous-sol", "terrain", [], ["sous_sol"]);
    add("SS.carrelage", "RSO.01", Sss * h("geo.ratioSols"), "sol du sous-sol (grès 45×45)", "terrain", [], ["sous_sol"]);
    add("SS.enduit", "MAC.05", Pss * hsp, "face intérieure des voiles", "terrain", [], ["sous_sol"]);
    add("SS.plafond", "MAC.06", Sss, "sous-face du plancher", "terrain", [], ["sous_sol"]);
    add("SS.peinture", "PEI.01", Pss * hsp + Sss, "murs et plafond", "terrain", [], ["sous_sol"]);
    add("SS.points", "ELE.01", Math.ceil(Sss / 20), "1 point / 20 m²", "terrain", [], ["sous_sol"]);
    add("SS.prises", "ELE.02", Math.ceil(Sss / 25), "1 prise / 25 m²", "terrain", [], ["sous_sol"]);
  }

  // ── Pente : plateforme et soutènements extérieurs ───────────────────
  if (pente >= h("pente.seuil")) {
    const A = Math.min(T, E * h("pente.zoneTerrassee"));
    const dA = (pente / 100) * Math.sqrt(A);
    const cut = (A * dA) / 8;
    pleineMasse += cut;
    remblaiAutres += cut;
    add("PENTE.deblai", "TER.02", cut, `plateforme ${fmt(A)} m², dénivelé ${fmt(dA)} m : A × d / 8`, "terrain", ["pente.zoneTerrassee"], ["pente"]);
    add("PENTE.remblai", "TER.07", cut, "remblai de la partie aval (déblai/remblai équilibrés)", "terrain", [], ["pente"]);
    if (dA / 2 > 0.5) add("PENTE.soutenement", "FON.11", Math.sqrt(A) * dA, `mur amont (√A × d/2) + 2 murs latéraux (√A × d/4)`, "terrain", ["pente.zoneTerrassee"], ["pente", "soutenement"]);
    add("PENTE.drainage", "FON.12", Math.sqrt(A), "drain en pied du talus amont", "terrain", [], ["pente"]);
  }

  // Évacuation : tout ce qui n'est pas réemployé, foisonné
  const deblais = fouilles + pleineMasse + purge;
  const reemploi = remblaiFouilles + remblaiAutres;
  add("TER.remblai", "TER.07", remblaiFouilles, "remblai des fouilles en réemploi", "terrain");
  add("TER.evacuation", "TER.05", Math.max(0, deblais - reemploi) * h("ter.foisonnement"), `(déblais ${fmt(deblais)} − réemploi ${fmt(reemploi)}) × ${h("ter.foisonnement")}`, "terrain", ["ter.foisonnement"], ss ? ["sous_sol"] : []);

  // ── 03 Structure ─────────────────────────────────────────────────────
  const planchers = E * n + Sss; // planchers hauts de chaque niveau, + plancher haut du sous-sol
  const partDP = h("geo.partDallePleine");
  // Plancher 20+5 en haut standing et luxe (portées plus grandes) : la structure suit le standing global.
  add("STR.planchers", G.plancher, planchers * (1 - partDP), `planchers ${fmt(planchers)} m² × ${1 - partDP}`, "projet", ["geo.partDallePleine"]);
  add("STR.dallesPleines", "STR.05", planchers * partDP * h("geo.epDallePleine"), `${fmt(planchers)} m² × ${partDP} × ${h("geo.epDallePleine")} m`, "projet", ["geo.partDallePleine", "geo.epDallePleine"]);
  add("STR.poteaux", "STR.01", h("str.poteaux") * Stot * (hsp / 2.9), `${h("str.poteaux")} m³/m² × ${fmt(Stot)} m² × HSP/2,9`, "projet", ["str.poteaux"]);
  add("STR.poutres", "STR.02", h("str.poutres") * Stot, `${h("str.poutres")} m³/m² × ${fmt(Stot)} m²`, "projet", ["str.poutres"]);
  const volees = (n - 1) + (ss ? 1 : 0) + (input.terrasseAccessible ? 1 : 0);
  add("STR.escaliers", "STR.06", volees * h("str.escalier"), `${volees} volée(s) × ${h("str.escalier")} m³`, "projet", ["str.escalier"]);
  if (collectif) add("STR.voiles", "STR.07", (n + (ss ? 1 : 0)) * h("str.voilesImmeuble"), "cage d'escalier / ascenseur", "projet", ["str.voilesImmeuble"]);
  add("STR.acrotere", "STR.08", P, "périmètre de la toiture", "projet", ["geo.coefPerimetre"]);

  // ── 04 Maçonnerie ────────────────────────────────────────────────────
  add("MAC.mursExt", "MAC.01", mursExt, `périmètre ${fmt(P)} m × ${fmt(hEt)} m × ${n} niv. − baies ${fmt(baies)} m²`, "projet", ["geo.coefPerimetre", "geo.epaisseurPlancher"]);
  const cloisons = h("geo.ratioCloisons") * Sp * (hsp / 2.9);
  add("MAC.cloisons", "MAC.03", cloisons, `${h("geo.ratioCloisons")} m²/m² × ${fmt(Sp)} m²`, "projet", ["geo.ratioCloisons"]);
  const faience = sdb * h("geo.faienceSdb") + logements * h("geo.faienceCuisine");
  const enduitsInt = 2 * cloisons + mursExt;
  add("MAC.enduitsInt", "MAC.05", enduitsInt, "2 faces des cloisons + face intérieure des murs", "projet");
  const gFPL = g("FPL");
  const partFP = Math.min(1, gFPL.fpBA13 + gFPL.fpStaff);
  add("MAC.enduitPlafond", "MAC.06", Sp * (1 - partFP), `plafonds sans faux plafond (${Math.round((1 - partFP) * 100)} %)`, "finitions");
  const sols = Sp * h("geo.ratioSols");
  const terrasses = Math.max(0, input.terrasses ?? 0) + (input.terrasseAccessible ? E * 0.85 : 0);
  add("MAC.chape", "MAC.07", sols + terrasses, "sols intérieurs + terrasses carrelées", "projet", ["geo.ratioSols"]);

  // ── 05 Étanchéité ────────────────────────────────────────────────────
  add("ETA.forme", "ETA.01", E, "toiture-terrasse", "projet");
  add("ETA.etancheite", "ETA.02", E + Math.max(0, input.terrasses ?? 0) * 0.5, "toiture + balcons en porte-à-faux (50 %)", "projet");
  if (!input.terrasseAccessible) add("ETA.protection", "ETA.03", E, "toiture non accessible", "projet");
  const iso = G.isolation;
  if (iso) add("ETA.isolation", iso, E, "toiture (RTCM)", "finitions");
  add("ETA.releves", "ETA.06", P, "périmètre des acrotères", "projet");
  add("ETA.sdb", "ETA.07", sdb * h("so.etancheiteSdb"), `${sdb} salle(s) de bain × ${h("so.etancheiteSdb")} m²`, "finitions", ["so.etancheiteSdb"]);

  // ── 07 Façades ───────────────────────────────────────────────────────
  const facade = mursExt * fLibre + P * 0.8;
  const gFAC = g("FAC");
  add("FAC.enduit", "FAC.01", facade * (1 - gFAC.facadePierre), `murs extérieurs × façades libres ${fLibre} + acrotères`, "projet");
  add("FAC.peinture", gFAC.facade, facade * (1 - gFAC.facadePierre), "surface enduite", "finitions");
  add("FAC.pierre", "FAC.04", facade * gFAC.facadePierre, `${Math.round(gFAC.facadePierre * 100)} % de la façade en pierre`, "finitions");

  // ── 08 Menuiseries extérieures ───────────────────────────────────────
  const gALU = g("ALU");
  add("ALU.baies", gALU.alu, baies * (1 - gALU.aluLuxePart), `${gALU.baies} m²/m² × ${fmt(Sp)} m²`, "finitions");
  add("ALU.baiesPremium", "ALU.04", baies * gALU.aluLuxePart, `${Math.round(gALU.aluLuxePart * 100)} % des baies en levant-coulissant`, "finitions");
  add("ALU.volets", "ALU.05", baies * gALU.volets, `${Math.round(gALU.volets * 100)} % des baies`, "finitions");
  const gBOI = g("BOI");
  const pe = gBOI.porteEntree;
  add("ENT.porte", pe, logements, `${logements} porte(s) d'entrée`, "finitions");

  // ── 09 Menuiseries intérieures ───────────────────────────────────────
  const portes = collectif ? logements * 2 + chambres + sdb : chambres + sdb + n + 2;
  add("BOI.portes", gBOI.porte, portes, collectif ? "par logement : chambres + SdB + 2" : "chambres + SdB + niveaux + 2", "finitions");
  if (g("BOI") !== GAMMES.ULTRA_ECO) add("BOI.placards", "BOI.07", chambres * h("so.placards"), `${chambres} chambre(s) × ${h("so.placards")} ml`, "finitions", ["so.placards"]);
  if (input.cuisineMl && input.cuisineMl > 0) add("BOI.cuisine", "BOI.06", input.cuisineMl * logements, "option cuisine équipée", "finitions", [], ["option"]);

  // ── 10 Métallerie ────────────────────────────────────────────────────
  const gc = volees * h("so.gardeCorpsEscalier") + Math.max(0, input.terrasses ?? 0) * h("so.gardeCorpsBalcons") + (input.terrasseAccessible ? P : 0);
  add("MET.gardeCorps", g("MET").gardeCorps, gc, "escaliers + balcons + toit accessible", "finitions", ["so.gardeCorpsEscalier", "so.gardeCorpsBalcons"]);

  // ── 12 Faux plafonds ─────────────────────────────────────────────────
  add("FPL.ba13", "FPL.01", Sp * gFPL.fpBA13, `${Math.round(gFPL.fpBA13 * 100)} % des plafonds`, "finitions");
  add("FPL.staff", "FPL.02", Sp * gFPL.fpStaff, `${Math.round(gFPL.fpStaff * 100)} % des plafonds`, "finitions");

  // ── 13-14 Revêtements ────────────────────────────────────────────────
  const gRSO = g("RSO");
  add("RSO.sols", gRSO.sol, sols, `${h("geo.ratioSols")} × surface de plancher`, "finitions", ["geo.ratioSols"]);
  add("RSO.terrasses", gRSO === GAMMES.ULTRA_ECO ? "RSO.01" : "RSO.02", terrasses, "balcons et terrasses (grès antidérapant)", "finitions");
  add("RSO.plinthes", "RSO.06", sols * h("geo.plinthes"), `${h("geo.plinthes")} ml/m² de sol`, "finitions", ["geo.plinthes"]);
  add("RMU.faience", g("RMU").mur, faience, `${sdb} SdB × ${h("geo.faienceSdb")} m² + ${logements} cuisine(s) × ${h("geo.faienceCuisine")} m²`, "finitions", ["geo.faienceSdb", "geo.faienceCuisine"]);

  // ── 15 Peinture ──────────────────────────────────────────────────────
  add("PEI.murs", g("PEI").peinture, Math.max(0, enduitsInt - faience) + Sp, "murs enduits − faïence + plafonds", "finitions");

  // ── 16 Plomberie ─────────────────────────────────────────────────────
  const gPLO = g("PLO");
  add("PLO.points", "PLO.01", sdb * 3 + logements * 2 + 1, "3 par SdB + 2 par cuisine + 1 extérieur", "finitions");
  add("PLO.sdb", gPLO.sdb, sdb, `${sdb} salle(s) de bain`, "finitions");
  add("PLO.evier", gPLO.evier, logements, "1 par cuisine", "finitions");
  const wcInvites = collectif ? 0 : 1;
  add("PLO.wcInvites", "PLO.09", wcInvites, "WC invités au RDC", "finitions");
  add("PLO.collecteurs", "PLO.10", h("so.collecteurs") * (sdb + logements + wcInvites), `${h("so.collecteurs")} ml × (SdB + cuisines + WC)`, "finitions", ["so.collecteurs"]);
  const solaire = input.chauffeEauSolaire ?? G.solaireDefaut;
  if (!solaire) add("PLO.chauffeEau", "PLO.08", Math.max(logements, Math.ceil(sdb / 2)), "1 pour 2 SdB", "finitions");
  else add("ENR.solaire", "ENR.01", Math.max(logements, Math.ceil(sdb / 3)), "1 chauffe-eau solaire 200 L pour 3 SdB", "finitions");

  // ── 17-18 Électricité, courants faibles ──────────────────────────────
  const gELE = g("ELE");
  add("ELE.points", gELE.ptLum, Sp * h("so.pointsLumineux") * gELE.densiteElec, `${h("so.pointsLumineux")}/m² × densité ${gELE.densiteElec}`, "finitions", ["so.pointsLumineux"]);
  add("ELE.prises", gELE.prise, Sp * h("so.prises") * gELE.densiteElec, `${h("so.prises")}/m² × densité ${gELE.densiteElec}`, "finitions", ["so.prises"]);
  const clim = input.climatisation ?? G.climDefaut;
  const gainables = clim && G.gainable ? Math.max(logements, Math.ceil(Sp / 60)) : 0;
  const splits12 = clim && !gainables ? chambres : 0;
  const splits24 = clim && !gainables ? logements : 0;
  add("ELE.specialises", "ELE.05", logements * h("so.circuitsSpecialises") + splits12 + splits24 + gainables, "circuits dédiés (+ 1 par appareil de clim)", "finitions", ["so.circuitsSpecialises"]);
  add("ELE.tableau", "ELE.06", logements, "1 tableau par logement", "finitions");
  add("ELE.terre", "ELE.07", 1, "1 par bâtiment", "finitions");
  if (collectif || G.cfa) add("CFA.vdi", "CFA.01", logements, "1 par logement", "finitions");
  if (input.standing === "STANDING" || input.standing === "PREMIUM") add("CFA.securite", "CFA.02", 1, "alarme et vidéosurveillance", "finitions");
  if (input.standing === "PREMIUM") add("CFA.domotique", "CFA.03", logements, "domotique", "finitions");
  if (collectif) {
    const pc = n * h("so.partiesCommunes");
    add("PC.sols", "RSO.04", pc, `${n} niveaux × ${h("so.partiesCommunes")} m² (hall, paliers en marbre local)`, "finitions", ["so.partiesCommunes"]);
    add("PC.peinture", "PEI.02", pc * 2.5, "murs et plafonds des parties communes", "finitions");
    add("PC.eclairage", "ELE.01", n * 3, "3 points par niveau", "finitions");
  }

  // ── 19-21 Équipements ────────────────────────────────────────────────
  if (clim) {
    add("CVC.chambres", G.split12, splits12, "1 split 12 000 BTU par chambre", "finitions");
    add("CVC.sejour", "CVC.02", splits24, "1 split 24 000 BTU par séjour", "finitions");
    add("CVC.gainable", "CVC.04", gainables, "1 gainable pour 60 m²", "finitions");
  }
  const niveauxDesservis = n + (ss ? 1 : 0);
  const asc = input.ascenseur ?? (collectif && n >= 5);
  if (asc) {
    if (collectif) {
      add("ASC.appareil", "ASC.02", 1, "ascenseur 480 kg, 4 niveaux", "finitions");
      add("ASC.niveaux", "ASC.03", Math.max(0, niveauxDesservis - 4), "niveaux au-delà de 4", "finitions");
    } else {
      add("ASC.appareil", "ASC.01", 1, "élévateur 2 niveaux", "finitions", [], ["option"]);
      add("ASC.niveaux", "ASC.03", Math.max(0, niveauxDesservis - 2), "niveaux au-delà de 2", "finitions", [], ["option"]);
    }
    add("ASC.gc", "ASC.04", 1, "gaine et fosse", "finitions", [], collectif ? [] : ["option"]);
  }
  if (input.photovoltaiqueKwc && input.photovoltaiqueKwc > 0) add("ENR.pv", "ENR.02", input.photovoltaiqueKwc, "puissance choisie", "finitions", [], ["option"]);

  // ── 22-23 Réseaux et extérieurs ──────────────────────────────────────
  add("VRD.reseau", "VRD.01", Math.sqrt(T) + h("vrd.longueurReseau"), `√terrain + ${h("vrd.longueurReseau")} ml`, "terrain", ["vrd.longueurReseau"]);
  add("VRD.regards", "VRD.02", h("vrd.regards") + (collectif ? logements / 4 : 0), "regards de visite et de branchement", "terrain", ["vrd.regards"]);
  const clotureAuto = def.cloture ? Math.max(0, 4 * Math.sqrt(T) * ((4 - mit) / 4) - 4) : 0;
  const cloture = input.cloture ?? clotureAuto;
  add("EXT.cloture", "EXT.01", cloture, input.cloture != null ? "linéaire saisi" : "4 × √terrain × côtés non mitoyens − portail", "terrain", [], ["option"]);
  if (input.portail ?? def.cloture) add("EXT.portail", "EXT.02", 1, "portail + portillon", "terrain", [], ["option"]);
  if (input.piscine && input.piscine > 0) {
    add("PISC.deblai", "TER.02", input.piscine * 1.7, "plan d'eau × 1,5 m + surlargeur", "finitions", [], ["option"]);
    add("PISC.evacuation", "TER.05", input.piscine * 1.7 * 1.25, "déblais foisonnés", "finitions", [], ["option"]);
    add("PISC.bassin", "EXT.03", input.piscine, "surface du plan d'eau", "finitions", [], ["option"]);
    add("PISC.equipement", "EXT.04", 1, "filtration", "finitions", [], ["option"]);
  }

  // Quantités saisies sur plans (niveau 3)
  for (const l of lignes) {
    const q = input.quantites?.[l.id];
    if (q !== undefined && q >= 0) { l.qte = q; l.formule = "quantité saisie sur plans"; }
  }

  return {
    lignes,
    hypotheses: used,
    geometrie: {
      emprise: arr(E), surfaceTerrain: arr(T), surfaceSousSol: arr(Sss), surfaceTotale: arr(Stot), perimetre: arr(P), hauteurEtage: arr(hEt),
      mursExterieurs: arr(mursExt), baies: arr(baies), logements, chambres, sallesDeBain: sdb, sol, fondation,
      ascenseur: !!asc, climatisation: !!clim, chauffeEauSolaire: !!solaire, cloture: arr(cloture),
    },
  };
}

