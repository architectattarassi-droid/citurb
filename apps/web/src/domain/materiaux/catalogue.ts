/**
 * Catalogue unique de référence des matériaux CITURBAREA (version CATALOGUE_VERSION).
 *
 * Réconcilie quatre sources (détail : docs/prix/catalogue-materiaux.md) :
 *   - matériauthèque TerriScan (referentiel_cps/terriscan_referentiel/mapping.json,
 *     122 clés → CIT-XX-NNN) : ses codes sont REPRIS tels quels ;
 *   - seed marketplace (apps/api/scripts/seed-referentiel.ts, 197 produits) ;
 *   - catalog.json (apps/api/data/materials/catalog.json, 80 matériaux) ;
 *   - recherche de prix 2026-10 (docs/prix/recherche/materiaux-*.md) : prix B.
 * Les nouveaux codes prolongent la numérotation de chaque préfixe ; nouveaux
 * préfixes : IS (isolation), PE (peinture), MA (marbre/pierre), QU (quincaillerie).
 *
 * Prix : DH HT présumés PAR uniteRef. Fiabilité B = médiane des sources B de la
 * recherche 2026-10 ; C = indicatif (matériauthèque 2026-07, seed, guides).
 * Les fiches fournisseurs (fiabilité A quand ≥ 3 offres) remplacent ces prix
 * via GET /api/prix/materiaux.
 *
 * NE JAMAIS renuméroter un code. Retirer = `actif: false`.
 */
import type { Categorie, MaterialRef, UniteRef, UniteVente } from "./types";

export const CATALOGUE_VERSION = "2026-10.1";

// Lots (nomenclature apps/api/data/cps-templates/lots/*.json)
const TER = "LOT_01_TERRASSEMENT", GO = "LOT_02_GO_BETON", MAC = "LOT_03_MACONNERIE", ETA = "LOT_04_ETANCHEITE",
  ALU = "LOT_07_MENUISERIE_EXT_ALU", BOIS = "LOT_08_MENUISERIE_INT_BOIS", MET = "LOT_09_METALLERIE",
  CLO = "LOT_10_CLOISONS_DOUBLAGES", SOL = "LOT_11_REVETEMENTS_SOLS", MUR = "LOT_12_REVETEMENTS_MURS", PEI = "LOT_13_PEINTURE",
  PLO = "LOT_14_PLOMBERIE_SANITAIRE", ELE = "LOT_15_ELECTRICITE", CLIM = "LOT_16_CLIMATISATION", ECS = "LOT_17_PLOMBERIE_ECS",
  FP = "LOT_18_FAUX_PLAFONDS", STAFF = "LOT_19_STAFF_STUC", VDI = "LOT_20_VDI_COURANTS_FAIBLES", EV = "LOT_21_ESPACES_VERTS",
  VRD = "LOT_26_VRD_VOIRIE";

// Sources des prix
const RGO = "Recherche 2026-10, médiane des sources B (materiaux-gros-oeuvre.md)";
const RSO = "Recherche 2026-10, médiane des sources B (materiaux-second-oeuvre.md)";
const RC = "Recherche 2026-10, indicatif C (guides)";
const MT = "Matériauthèque TerriScan 2026-07, indicatif";
const SEED = "Référentiel marketplace CITURBAREA, indicatif";

// Unités de vente courantes
const v = (code: string, libelle: string, facteur: number, approx = false): UniteVente =>
  approx ? { code, libelle, facteur, approx } : { code, libelle, facteur };
const SAC25 = v("sac25", "Sac 25 kg", 25), SAC50 = v("sac50", "Sac 50 kg", 50), TONNE_KG = v("tonne", "Tonne", 1000);
const COUR100 = v("couronne100", "Couronne 100 m", 100), COUR50 = v("couronne50", "Couronne 50 m", 50);
const BARRE4 = v("barre4", "Barre 4 m", 4), BARRE6 = v("barre6", "Barre 6 m", 6);
const ROUL10 = v("rouleau10", "Rouleau 10 m²", 10);
/** Tonne de granulat → m³ (masse volumique apparente ≈ 1,6 t/m³ pour un sable, 1,5 pour un gravier). */
const TONNE_SABLE = v("tonne", "Tonne (≈ 0,63 m³)", 1 / 1.6, true), TONNE_GRAVIER = v("tonne", "Tonne (≈ 0,67 m³)", 1 / 1.5, true);
/** Peinture vendue au litre : densité ≈ 1,4 kg/L (vinylique / acrylique). */
const LITRE_PEINTURE = v("litre", "Litre (≈ 1,4 kg)", 1.4, true);

/** Barre d'acier HA de 12 m : facteur = 12 × masse linéique (kg/ml). */
const barre12 = (kgParMl: number) => v("barre12", "Barre 12 m", Math.round(12 * kgParMl * 1000) / 1000);

type P = [min: number, ref: number, max: number, fiabilite: "B" | "C", source: string];

function m(
  code: string, libelle: string, categorie: Categorie, famille: string, lots: string[], uniteRef: UniteRef, p: P,
  o: Partial<Omit<MaterialRef, "code" | "libelle" | "categorie" | "famille" | "lots" | "uniteRef" | "prix">> = {},
): MaterialRef {
  return {
    code, libelle, categorie, famille, lots, uniteRef, ventes: o.ventes || [],
    ...(o.parent ? { parent: o.parent } : {}),
    ...(o.masseKg ? { masseKg: o.masseKg } : {}),
    prix: { min: p[0], ref: p[1], max: p[2], fiabilite: p[3], source: p[4] },
    alias: o.alias || {},
    ...(o.motsCles ? { motsCles: o.motsCles } : {}),
  };
}

// Masses linéiques des aciers HA (kg/ml) : π·d²/4 × 7 850 kg/m³.
const HA: [number, number, string[], string[]][] = [
  [6, 0.222, ["Fer à béton HA Fe E500 — Ø6 (barre 12 m)"], ["ACIER_HA_FE500_6"]],
  [8, 0.395, ["Fer à béton HA Fe E500 — Ø8 (barre 12 m)"], ["ACIER_HA_FE500_8"]],
  [10, 0.617, ["Fer à béton HA Fe E500 — Ø10 (barre 12 m)"], ["ACIER_HA_FE500_10"]],
  [12, 0.888, ["Fer à béton HA Fe E500 — Ø12 (barre 12 m)"], ["ACIER_HA_FE500_12"]],
  [14, 1.208, ["Fer à béton HA Fe E500 — Ø14 (barre 12 m)"], ["ACIER_HA_FE500_14"]],
  [16, 1.578, ["Fer à béton HA Fe E500 — Ø16 (barre 12 m)"], ["ACIER_HA_FE500_16"]],
  [20, 2.466, [], ["ACIER_HA_FE500_20"]],
  [25, 3.853, [], []],
];
const prixHA = (d: number): P =>
  d <= 8 ? [8.5, 9.8, 10.5, "B", RGO] : d <= 12 ? [8, 9.6, 10.5, "B", RGO] : d <= 16 ? [8.8, 9.5, 10.5, "B", RGO] : [9.3, 9.4, 9.5, "C", RC];

export const CATALOGUE: MaterialRef[] = [
  // ───────────── GROS ŒUVRE ─────────────
  m("CIT-GO-001", "Acier HA Fe E500 (tous diamètres)", "GROS_OEUVRE", "Aciers d'armature", [GO], "kg", [8, 9.5, 10.5, "B", RGO],
    { ventes: [TONNE_KG], alias: { terriscan: "acier_ha_fe500" }, motsCles: ["fer à béton", "rond à béton", "armature"] }),
  ...HA.map(([d, kgml, seed, cat], i) =>
    m(`CIT-GO-0${21 + i}`, `Acier HA Fe E500 Ø${d}`, "GROS_OEUVRE", "Aciers d'armature", [GO], "kg", prixHA(d),
      { parent: "CIT-GO-001", masseKg: kgml, ventes: [barre12(kgml), TONNE_KG], alias: { seed, catalog: cat }, motsCles: ["fer", `ø${d}`, `diamètre ${d}`] })),
  m("CIT-GO-020", "Treillis soudé (toutes mailles)", "GROS_OEUVRE", "Aciers d'armature", [GO], "m2", [22, 47, 95, "C", MT], { alias: { terriscan: "treillis_soude" } }),
  m("CIT-GO-029", "Treillis soudé ST10", "GROS_OEUVRE", "Aciers d'armature", [GO], "m2", [7.5, 9, 10.5, "C", SEED],
    { parent: "CIT-GO-020", ventes: [v("panneau", "Panneau 2,40 × 6,00 m", 14.4)], alias: { seed: ["Treillis soudé ST10 — panneau"] } }),
  m("CIT-GO-030", "Treillis soudé ST25", "GROS_OEUVRE", "Aciers d'armature", [GO], "m2", [25, 47, 55, "B", RGO],
    { parent: "CIT-GO-020", ventes: [v("panneau", "Panneau 2,40 × 6,00 m", 14.4)], alias: { seed: ["Treillis soudé ST25 — panneau"], catalog: ["TREILLIS_ST25C"] } }),
  m("CIT-GO-031", "Treillis soudé ST50", "GROS_OEUVRE", "Aciers d'armature", [GO], "m2", [55, 71, 95, "B", RGO],
    { parent: "CIT-GO-020", ventes: [v("panneau", "Panneau 2,40 × 6,00 m", 14.4)], alias: { seed: ["Treillis soudé ST50 — panneau"] } }),
  m("CIT-GO-032", "Fil d'attache recuit", "GROS_OEUVRE", "Aciers d'armature", [GO], "kg", [13, 16, 20, "C", SEED],
    { ventes: [v("botte25", "Botte 25 kg", 25)], alias: { seed: ["Fil d'attache recuit"], catalog: ["FIL_RECUIT_18"] } }),

  m("CIT-GO-008", "Ciment CPJ 45", "GROS_OEUVRE", "Liants", [GO, MAC], "kg", [1.3, 1.6, 1.7, "B", RGO],
    { ventes: [SAC50, TONNE_KG], alias: { terriscan: "ciment_cpj45", seed: ["Ciment CPJ 45 — sac 50 kg"], catalog: ["CIMENT_CPJ_45_SAC50"] }, motsCles: ["ciment", "cpj45"] }),
  m("CIT-GO-033", "Ciment CPJ 35", "GROS_OEUVRE", "Liants", [MAC], "kg", [1.3, 1.5, 1.56, "B", RGO],
    { ventes: [SAC50, TONNE_KG], alias: { seed: ["Ciment CPJ 35 — sac 50 kg"] }, motsCles: ["ciment", "cpj35"] }),
  m("CIT-GO-034", "Ciment CPJ 55", "GROS_OEUVRE", "Liants", [GO], "kg", [1.7, 1.8, 2, "B", RGO],
    { ventes: [SAC50, TONNE_KG], alias: { seed: ["Ciment CPJ 55 — sac 50 kg"], catalog: ["CIMENT_CPJ_55_SAC50"] }, motsCles: ["ciment", "cpj55"] }),
  m("CIT-GO-035", "Ciment CPA (vrac)", "GROS_OEUVRE", "Liants", [GO], "kg", [1.6, 1.8, 1.9, "C", RC],
    { ventes: [TONNE_KG], alias: { catalog: ["CIMENT_CPA_45_VRAC"] }, motsCles: ["ciment", "cpa", "vrac"] }),
  m("CIT-GO-036", "Ciment résistant aux sulfates (CRS)", "GROS_OEUVRE", "Liants", [GO], "kg", [1.8, 2, 2.2, "B", RGO],
    { ventes: [SAC50, TONNE_KG], motsCles: ["ciment", "crs", "sulfates"] }),
  m("CIT-GO-037", "Ciment blanc", "GROS_OEUVRE", "Liants", [MAC, MUR], "kg", [3.2, 4.4, 5.2, "B", RGO],
    { ventes: [SAC25, SAC50], alias: { seed: ["Ciment blanc — sac 50 kg"] } }),
  m("CIT-GO-007", "Chaux hydraulique", "GROS_OEUVRE", "Liants", [MAC], "kg", [2.8, 3.3, 3.9, "C", MT],
    { ventes: [SAC25], alias: { terriscan: "chaux", seed: ["Chaux hydraulique NHL — sac"], catalog: ["CHAUX_HYDRAULIQUE_25"] } }),
  m("CIT-GO-014", "Mortier bâtard prêt à l'emploi", "GROS_OEUVRE", "Mortiers", [MAC], "kg", [1.8, 2.3, 2.8, "C", MT],
    { ventes: [SAC25], alias: { terriscan: "mortier_batard" } }),
  m("CIT-GO-015", "Mortier de ciment prêt à l'emploi", "GROS_OEUVRE", "Mortiers", [MAC], "kg", [1.6, 2.1, 2.9, "C", MT],
    { ventes: [SAC25], alias: { terriscan: "mortier_ciment", seed: ["Mortier prêt à l'emploi — sac"] } }),
  m("CIT-GO-038", "Mortier de réparation R4", "GROS_OEUVRE", "Mortiers", [GO], "kg", [4, 6, 9, "C", RC],
    { ventes: [SAC25], alias: { catalog: ["MORTIER_REPARATION"] } }),
  m("CIT-GO-039", "Enduit monocouche de façade", "GROS_OEUVRE", "Enduits", [MAC, MUR], "kg", [2.5, 3.3, 4.5, "C", RC],
    { ventes: [v("sac30", "Sac 30 kg", 30)], alias: { catalog: ["ENDUIT_MONOCOUCHE_30"] } }),

  m("CIT-GO-011", "Sable concassé 0/4 (rendu chantier)", "GROS_OEUVRE", "Granulats", [GO, MAC], "m3", [150, 200, 250, "B", RGO],
    { ventes: [TONNE_SABLE], alias: { terriscan: "granulats", seed: ["Sable de concassage 0/4"], catalog: ["SABLE_CONCASSE_0_5"] }, motsCles: ["sable"] }),
  m("CIT-GO-040", "Sable de mer lavé (rendu)", "GROS_OEUVRE", "Granulats", [MAC], "m3", [120, 195, 300, "B", RGO],
    { ventes: [TONNE_SABLE], alias: { seed: ["Sable de mer lavé"] }, motsCles: ["sable"] }),
  m("CIT-GO-041", "Sable de rivière / oued (rendu)", "GROS_OEUVRE", "Granulats", [GO, MAC], "m3", [180, 255, 350, "B", RGO],
    { ventes: [TONNE_SABLE], alias: { catalog: ["SABLE_RIVIERE_0_5"] }, motsCles: ["sable"] }),
  m("CIT-GO-012", "Gravier 5/15 – 8/15 (rendu)", "GROS_OEUVRE", "Granulats", [GO], "m3", [160, 230, 300, "B", RGO],
    { ventes: [TONNE_GRAVIER], alias: { terriscan: "gravillon", seed: ["Gravier 5/15"], catalog: ["GRAVETTE_5_15"] }, motsCles: ["gravette", "gravillon"] }),
  m("CIT-GO-042", "Gravette 3/8", "GROS_OEUVRE", "Granulats", [GO], "m3", [130, 175, 230, "C", SEED],
    { ventes: [TONNE_GRAVIER], alias: { seed: ["Gravette 3/8"] } }),
  m("CIT-GO-043", "Gravier 15/25 (rendu)", "GROS_OEUVRE", "Granulats", [GO], "m3", [150, 215, 350, "B", RGO],
    { ventes: [TONNE_GRAVIER], alias: { seed: ["Gravier 15/25"], catalog: ["GRAVIER_15_25"] } }),
  m("CIT-GO-019", "Tout-venant 0/40 (rendu)", "GROS_OEUVRE", "Granulats", [TER, GO], "m3", [110, 155, 200, "B", RGO],
    { ventes: [TONNE_GRAVIER], alias: { terriscan: "tout_venant", seed: ["Tout-venant 0/31,5"], catalog: ["TOUT_VENANT_0_40"] } }),
  m("CIT-GO-018", "Grave / remblai d'apport", "GROS_OEUVRE", "Granulats", [TER], "m3", [70, 100, 130, "C", MT],
    { ventes: [TONNE_GRAVIER], alias: { terriscan: "remblai_grave" } }),
  m("CIT-GO-016", "Pierre sèche (hérisson, moellons)", "GROS_OEUVRE", "Pierres", [GO, MAC], "m3", [120, 160, 200, "C", MT],
    { alias: { terriscan: "pierre_seche" } }),

  m("CIT-GO-005", "Béton de propreté / BPE B15", "GROS_OEUVRE", "Bétons", [GO], "m3", [600, 825, 900, "B", RGO],
    { alias: { terriscan: "beton_proprete", catalog: ["BETON_PROPRETE"] }, motsCles: ["bpe", "béton"] }),
  m("CIT-GO-044", "Béton prêt à l'emploi B20 (C20/25)", "GROS_OEUVRE", "Bétons", [GO], "m3", [800, 925, 1000, "B", RGO],
    { alias: { catalog: ["BPE_C20_25"] }, motsCles: ["bpe", "béton"] }),
  m("CIT-GO-004", "Béton prêt à l'emploi B25 (C25/30)", "GROS_OEUVRE", "Bétons", [GO], "m3", [800, 1000, 1150, "B", RGO],
    { alias: { terriscan: "beton_ba_350", seed: ["Béton prêt à l'emploi B25"], catalog: ["BPE_C25_30"] }, motsCles: ["bpe", "béton armé"] }),
  m("CIT-GO-045", "Béton prêt à l'emploi B30 (C30/37)", "GROS_OEUVRE", "Bétons", [GO], "m3", [920, 1150, 1250, "B", RGO],
    { alias: { seed: ["Béton prêt à l'emploi B30"], catalog: ["BPE_C30_37"] }, motsCles: ["bpe", "béton"] }),
  m("CIT-GO-046", "Béton prêt à l'emploi B35 (C35/45)", "GROS_OEUVRE", "Bétons", [GO], "m3", [1150, 1300, 1450, "C", RC],
    { alias: { catalog: ["BPE_C35_45"] }, motsCles: ["bpe", "béton"] }),
  m("CIT-GO-047", "Pompage du béton", "GROS_OEUVRE", "Bétons", [GO], "m3", [150, 200, 250, "B", RGO], { motsCles: ["pompe"] }),

  m("CIT-GO-002", "Agglo creux ciment 10×20×40", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [2.5, 4, 6, "B", RGO],
    { alias: { terriscan: "agglo_10", seed: ["Aggloméré creux 10x20x40"] }, motsCles: ["parpaing", "agglo"] }),
  m("CIT-GO-048", "Agglo creux ciment 15×20×40", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [3, 5.75, 9, "B", RGO],
    { alias: { seed: ["Aggloméré creux 15x20x40"], catalog: ["AGGLO_CIMENT_15"] }, motsCles: ["parpaing", "agglo"] }),
  m("CIT-GO-003", "Agglo creux ciment 20×20×40", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [3.5, 7, 12, "B", RGO],
    { alias: { terriscan: "agglo_20", seed: ["Aggloméré creux 20x20x40"], catalog: ["AGGLO_CIMENT_20"] }, motsCles: ["parpaing", "agglo"] }),
  m("CIT-GO-049", "Agglo plein 20", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [5, 6, 7.2, "C", SEED],
    { alias: { seed: ["Aggloméré plein 20"] } }),
  m("CIT-GO-050", "Agglo creux ciment 25×20×40", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [7, 11, 16, "C", RC]),
  m("CIT-GO-006", "Brique creuse 8 trous", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [0.9, 2, 2.9, "B", RGO],
    { alias: { terriscan: "brique_creuse", seed: ["Brique rouge 8 trous"], catalog: ["BRIQUE_CREUSE_8T", "BRIQUE_CREUSE_7T"] }, motsCles: ["brique"] }),
  m("CIT-GO-051", "Brique creuse 6 trous", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [1.2, 1.5, 2.5, "B", RGO],
    { alias: { seed: ["Brique rouge 6 trous"] }, motsCles: ["brique"] }),
  m("CIT-GO-052", "Brique creuse 12 trous", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [1.1, 2, 3.7, "B", RGO],
    { alias: { seed: ["Brique rouge 12 trous"] }, motsCles: ["brique"] }),
  m("CIT-GO-053", "Brique pleine", "GROS_OEUVRE", "Blocs & briques", [MAC], "u", [0.8, 1.2, 2, "C", RC],
    { alias: { catalog: ["BRIQUE_PLEINE"] }, motsCles: ["brique"] }),

  m("CIT-GO-013", "Hourdis béton 16", "GROS_OEUVRE", "Planchers", [GO], "u", [4.8, 5.8, 10, "B", RGO],
    { alias: { terriscan: "hourdis", seed: ["Hourdis béton 16"], catalog: ["HOURDIS_16"] }, motsCles: ["entrevous"] }),
  m("CIT-GO-054", "Hourdis béton 12", "GROS_OEUVRE", "Planchers", [GO], "u", [4, 5, 7, "B", RGO], { alias: { seed: ["Hourdis béton 12"] } }),
  m("CIT-GO-055", "Hourdis béton 20", "GROS_OEUVRE", "Planchers", [GO], "u", [6, 7.5, 11, "B", RGO], { alias: { seed: ["Hourdis béton 20"] } }),
  m("CIT-GO-056", "Hourdis béton 25", "GROS_OEUVRE", "Planchers", [GO], "u", [8, 9, 13, "C", RC]),
  m("CIT-GO-057", "Hourdis terre cuite 16", "GROS_OEUVRE", "Planchers", [GO], "u", [3.5, 4, 6, "C", RC]),
  m("CIT-GO-017", "Poutrelle béton précontrainte", "GROS_OEUVRE", "Planchers", [GO], "ml", [22, 50, 95, "C", RC],
    { alias: { terriscan: "poutrelle_precontrainte", catalog: ["POUTRELLE_PRECONTRAINTE"] } }),

  m("CIT-GO-009", "Coffrage (fourniture / location au m²)", "GROS_OEUVRE", "Coffrages", [GO], "m2", [60, 100, 140, "C", MT], { alias: { terriscan: "coffrage" } }),
  m("CIT-GO-058", "Contreplaqué de coffrage CTBX 18 mm", "GROS_OEUVRE", "Coffrages", [GO], "m2", [85, 102, 128, "B", RGO],
    { ventes: [v("panneau", "Panneau 2,50 × 1,22 m", 3.05)], alias: { seed: ["Contreplaqué de coffrage 18 mm — panneau"] } }),
  m("CIT-GO-059", "Bois de coffrage (planches)", "GROS_OEUVRE", "Coffrages", [GO], "m2", [65, 78, 92, "C", SEED], { alias: { seed: ["Bois de coffrage rouge"] } }),
  m("CIT-GO-060", "Étai métallique réglable", "GROS_OEUVRE", "Coffrages", [GO], "u", [95, 120, 150, "C", SEED], { alias: { seed: ["Étai métallique réglable"] } }),
  m("CIT-GO-061", "Huile de décoffrage", "GROS_OEUVRE", "Coffrages", [GO], "l", [11, 15, 18, "C", SEED],
    { ventes: [v("bidon5", "Bidon 5 L", 5, true)], alias: { seed: ["Huile de décoffrage — bidon"] } }),
  m("CIT-GO-010", "Film polyane", "GROS_OEUVRE", "Films & accessoires", [GO], "m2", [8, 12, 18, "C", MT], { alias: { terriscan: "film_polyane" } }),

  // ───────────── ÉTANCHÉITÉ ─────────────
  m("CIT-ET-004", "Membrane bitumineuse SBS 4 mm", "ETANCHEITE", "Membranes", [ETA], "m2", [34, 40, 45, "B", RGO],
    { ventes: [ROUL10], alias: { terriscan: "membrane_bitume", seed: ["Membrane bitumineuse 4 mm — rouleau 10 m²"], catalog: ["ETANCH_BICOUCHE_SBS_4"] } }),
  m("CIT-ET-006", "Membrane bitumineuse 3 mm", "ETANCHEITE", "Membranes", [ETA], "m2", [28, 32, 37, "C", SEED],
    { ventes: [ROUL10], alias: { seed: ["Membrane bitumineuse 3 mm — rouleau 10 m²"] } }),
  m("CIT-ET-007", "Membrane autoprotégée ardoisée 4 mm", "ETANCHEITE", "Membranes", [ETA], "m2", [42, 44.5, 55, "B", RGO],
    { ventes: [ROUL10], alias: { seed: ["Membrane auto-protégée ardoisée — rouleau"], catalog: ["ETANCH_AUTOPROTEGEE"] } }),
  m("CIT-ET-005", "Membrane synthétique (EPDM, PVC)", "ETANCHEITE", "Membranes", [ETA], "m2", [50, 90, 135, "C", MT],
    { alias: { terriscan: "membrane_etancheite", seed: ["Membrane EPDM"] } }),
  m("CIT-ET-008", "Système d'étanchéité liquide (résine PU)", "ETANCHEITE", "Membranes", [ETA], "kg", [17, 25, 34, "C", SEED],
    { ventes: [v("seau20", "Seau 20 kg", 20, true)], alias: { seed: ["Système d'étanchéité liquide (SEL)"], catalog: ["ETANCH_LIQUIDE"] } }),
  m("CIT-ET-009", "Primaire d'accrochage bitumineux", "ETANCHEITE", "Primaires & enduits", [ETA], "l", [9, 12, 14.5, "C", SEED],
    { ventes: [v("bidon20", "Bidon 20 L", 20, true)], alias: { seed: ["Primaire d'accrochage bitume — bidon"] } }),
  m("CIT-ET-010", "Enduit hydrofuge de cuvelage", "ETANCHEITE", "Primaires & enduits", [ETA, GO], "kg", [3.2, 4.3, 5.4, "C", SEED],
    { ventes: [SAC25], alias: { seed: ["Enduit hydrofuge de cuvelage — sac"] } }),
  m("CIT-ET-014", "Bitume oxydé", "ETANCHEITE", "Primaires & enduits", [ETA], "kg", [25, 30, 35, "C", RC]),
  m("CIT-ET-011", "Bande d'arase", "ETANCHEITE", "Accessoires", [ETA, MAC], "ml", [8, 12, 17, "C", SEED], { alias: { seed: ["Bande d'arase"] } }),
  m("CIT-ET-012", "Mastic d'étanchéité (cartouche)", "ETANCHEITE", "Accessoires", [ETA], "u", [35, 55, 78, "C", SEED], { alias: { seed: ["Mastic d'étanchéité"] } }),
  m("CIT-ET-013", "Relevé d'étanchéité", "ETANCHEITE", "Accessoires", [ETA], "ml", [22, 30, 42, "C", SEED], { alias: { seed: ["Gaine de relevé d'étanchéité"] } }),
  m("CIT-ET-001", "Drain agricole / géodrain", "ETANCHEITE", "Drainage", [ETA, VRD], "ml", [35, 50, 70, "C", MT], { alias: { terriscan: "drain" } }),
  m("CIT-ET-002", "Forme de pente (béton léger)", "ETANCHEITE", "Formes de pente", [ETA], "m3", [500, 650, 800, "C", MT], { alias: { terriscan: "forme_pente" } }),
  m("CIT-ET-003", "Isolant de toiture-terrasse", "ETANCHEITE", "Isolants", [ETA], "m2", [60, 95, 140, "C", MT], { alias: { terriscan: "isolant_toiture" } }),

  // ───────────── ISOLATION ─────────────
  m("CIT-IS-001", "Polystyrène expansé PSE 40 mm", "ISOLATION", "Thermique", [CLO, ETA], "m2", [22, 28, 35, "C", SEED],
    { alias: { seed: ["Polystyrène expansé PSE 40 mm"], catalog: ["ISOLANT_PSE_40"] } }),
  m("CIT-IS-002", "Polystyrène extrudé XPS 40 mm", "ISOLATION", "Thermique", [CLO, ETA], "m2", [38, 48, 60, "C", SEED], { alias: { seed: ["Polystyrène extrudé XPS 40 mm"] } }),
  m("CIT-IS-003", "Laine de verre 100 mm", "ISOLATION", "Thermique", [CLO, FP], "m2", [42, 55, 68, "C", SEED],
    { alias: { seed: ["Laine de verre 100 mm"], catalog: ["ISOLANT_LAINE_VERRE_100"] } }),
  m("CIT-IS-004", "Laine de roche 100 mm", "ISOLATION", "Thermique", [CLO, FP], "m2", [55, 70, 88, "C", SEED], { alias: { seed: ["Laine de roche 100 mm"] } }),
  m("CIT-IS-005", "Mousse polyuréthane projetée", "ISOLATION", "Thermique", [CLO], "m2", [90, 120, 155, "C", SEED], { alias: { seed: ["Mousse polyuréthane projetée"] } }),
  m("CIT-IS-006", "Panneau acoustique 50 mm", "ISOLATION", "Acoustique", [CLO, FP], "m2", [60, 85, 115, "C", SEED], { alias: { seed: ["Panneau acoustique 50 mm"] } }),
  m("CIT-IS-007", "Sous-couche acoustique de sol", "ISOLATION", "Acoustique", [SOL], "m2", [28, 38, 50, "C", SEED], { alias: { seed: ["Sous-couche acoustique sol"] } }),
  m("CIT-IS-008", "Pare-vapeur", "ISOLATION", "Accessoires", [CLO, ETA], "m2", [6, 9, 13, "C", SEED], { alias: { seed: ["Pare-vapeur"] } }),
  m("CIT-IS-009", "Adhésif d'étanchéité à l'air (rouleau)", "ISOLATION", "Accessoires", [CLO], "u", [45, 65, 88, "C", SEED], { alias: { seed: ["Adhésif d'étanchéité à l'air"] } }),

  // ───────────── VRD ─────────────
  m("CIT-VRD-001", "Bordure béton T2", "VRD", "Éléments béton VRD", [VRD], "ml", [25, 36, 45, "B", RGO],
    { alias: { terriscan: "bordure_beton", seed: ["Bordure de trottoir T2"] }, motsCles: ["bordure"] }),
  m("CIT-VRD-008", "Bordure béton T3", "VRD", "Éléments béton VRD", [VRD], "ml", [42, 55, 65, "B", RGO], { motsCles: ["bordure"] }),
  m("CIT-VRD-002", "Caniveau béton", "VRD", "Éléments béton VRD", [VRD], "ml", [60, 120, 250, "C", MT], { alias: { terriscan: "caniveau_beton", seed: ["Caniveau béton"] } }),
  m("CIT-VRD-003", "Enrobé bitumineux à chaud", "VRD", "Enrobés", [VRD], "t", [540, 900, 1400, "C", MT], { alias: { terriscan: "enrobe" } }),
  m("CIT-VRD-009", "Enrobé à froid", "VRD", "Enrobés", [VRD], "t", [3600, 4900, 6200, "C", SEED],
    { ventes: [v("sac25", "Sac 25 kg", 0.025)], alias: { seed: ["Enrobé à froid — sac"] } }),
  m("CIT-VRD-004", "Grave non traitée (GNT)", "VRD", "Granulats VRD", [VRD], "m3", [90, 120, 150, "C", MT], { ventes: [TONNE_GRAVIER], alias: { terriscan: "gnt" } }),
  m("CIT-VRD-005", "Pavé autobloquant", "VRD", "Pavage", [VRD, EV], "m2", [55, 90, 180, "C", MT], { alias: { terriscan: "pave_autobloquant", seed: ["Pavé autobloquant"] } }),
  m("CIT-VRD-010", "Dalle gazon", "VRD", "Pavage", [VRD, EV], "m2", [70, 100, 135, "C", SEED], { alias: { seed: ["Dalle gazon"] } }),
  m("CIT-VRD-006", "Regard de visite béton", "VRD", "Regards & ouvrages", [VRD], "u", [350, 700, 1550, "C", MT], { alias: { terriscan: "regard_beton", seed: ["Regard de visite béton"] } }),
  m("CIT-VRD-011", "Tampon fonte de voirie", "VRD", "Regards & ouvrages", [VRD], "u", [280, 646, 900, "C", RC], { alias: { seed: ["Tampon fonte voirie"] } }),
  m("CIT-VRD-017", "Regard de visite PVC", "VRD", "Regards & ouvrages", [VRD, PLO], "u", [120, 180, 270, "C", SEED], { alias: { seed: ["Regard de visite PVC"] } }),
  m("CIT-VRD-007", "Tube PVC assainissement Ø200 SN4", "VRD", "Canalisations", [VRD], "ml", [55, 62, 153, "B", RGO],
    { ventes: [BARRE6], alias: { terriscan: "tuyau_pvc_assainissement", seed: ["Tube PVC assainissement Ø200 — barre"] } }),
  m("CIT-VRD-012", "Tube PVC assainissement Ø315", "VRD", "Canalisations", [VRD], "ml", [63, 80, 97, "C", SEED],
    { ventes: [BARRE6], alias: { seed: ["Tube PVC assainissement Ø315 — barre"] } }),
  m("CIT-VRD-013", "Tube PVC assainissement Ø160", "VRD", "Canalisations", [VRD], "ml", [40, 60, 150, "C", RC], { ventes: [BARRE6] }),
  m("CIT-VRD-014", "Grillage simple torsion", "VRD", "Clôture & extérieur", [VRD, EV], "ml", [28, 40, 58, "C", SEED], { alias: { seed: ["Grillage simple torsion"] } }),
  m("CIT-VRD-015", "Gabion (cage métallique)", "VRD", "Clôture & extérieur", [VRD], "u", [180, 280, 400, "C", SEED], { alias: { seed: ["Gabion (cage métallique)"] } }),
  m("CIT-VRD-016", "Géotextile", "VRD", "Clôture & extérieur", [VRD, TER], "m2", [8, 12, 19, "C", SEED], { alias: { seed: ["Géotextile"] } }),

  // ───────────── ÉLECTRICITÉ ─────────────
  m("CIT-EL-001", "Appareillage électrique (générique)", "ELECTRICITE", "Appareillage", [ELE], "u", [35, 60, 120, "C", MT], { alias: { terriscan: "appareillage" } }),
  m("CIT-EL-015", "Prise 2P+T 16 A encastrée", "ELECTRICITE", "Appareillage", [ELE], "u", [18, 35, 110, "C", MT],
    { parent: "CIT-EL-001", alias: { terriscan: "prise_16a", seed: ["Prise de courant 2P+T encastrée"], catalog: ["PRISE_CONFORT_2P_T"] } }),
  m("CIT-EL-019", "Interrupteur simple allumage", "ELECTRICITE", "Appareillage", [ELE], "u", [15, 25, 59, "C", SEED], { parent: "CIT-EL-001", alias: { seed: ["Interrupteur simple"] } }),
  m("CIT-EL-020", "Interrupteur va-et-vient", "ELECTRICITE", "Appareillage", [ELE], "u", [18, 28, 59, "C", SEED], { parent: "CIT-EL-001", alias: { seed: ["Va-et-vient"], catalog: ["INTERR_VV"] } }),
  m("CIT-EL-021", "Prise RJ45", "ELECTRICITE", "Courants faibles", [VDI], "u", [28, 42, 58, "C", SEED], { alias: { seed: ["Prise RJ45"] } }),
  m("CIT-EL-003", "Fil H07V-U 1,5 mm²", "ELECTRICITE", "Câbles", [ELE], "ml", [2.5, 2.74, 7, "B", RSO],
    { ventes: [COUR100], alias: { terriscan: "cable_h07vu_15", catalog: ["CABLE_HO7VK_15"] }, motsCles: ["fil", "câble"] }),
  m("CIT-EL-004", "Fil H07V-U 2,5 mm²", "ELECTRICITE", "Câbles", [ELE], "ml", [1.8, 4.33, 10, "B", RSO],
    { ventes: [COUR100], alias: { terriscan: "cable_h07vu_25", seed: ["Fil H07V-U 2,5 mm² — couronne 100 m"], catalog: ["CABLE_HO7VK_25"] }, motsCles: ["fil", "câble"] }),
  m("CIT-EL-022", "Câble U1000 R2V 3G1,5", "ELECTRICITE", "Câbles", [ELE], "ml", [3.8, 4.3, 4.9, "C", SEED],
    { ventes: [COUR100], alias: { seed: ["Câble U1000 R2V 3G1,5 — couronne 100 m"] } }),
  m("CIT-EL-023", "Câble U1000 R2V 3G2,5", "ELECTRICITE", "Câbles", [ELE], "ml", [5.6, 6.3, 7.1, "C", SEED],
    { ventes: [COUR100], alias: { seed: ["Câble U1000 R2V 3G2,5 — couronne 100 m"] } }),
  m("CIT-EL-007", "Câble U1000 R2V 6 mm²", "ELECTRICITE", "Câbles", [ELE], "ml", [11, 14, 35, "C", MT],
    { ventes: [COUR100], alias: { terriscan: "cable_u1000r2v_6", seed: ["Câble U1000 R2V 3G6 — couronne 100 m"] } }),
  m("CIT-EL-024", "Câble VGV 2×1,5", "ELECTRICITE", "Câbles", [ELE], "ml", [2.6, 3, 3.5, "C", SEED], { ventes: [COUR100], alias: { seed: ["Câble VGV 2x1,5 — couronne 100 m"] } }),
  m("CIT-EL-005", "Câble RJ45 cat. 6", "ELECTRICITE", "Courants faibles", [VDI], "ml", [6, 9, 14, "C", MT],
    { ventes: [v("touret305", "Touret 305 m", 305)], alias: { terriscan: "cable_rj45" } }),
  m("CIT-EL-006", "Câble de terre cuivre nu", "ELECTRICITE", "Mise à la terre", [ELE], "ml", [12, 18, 25, "C", MT], { alias: { terriscan: "cable_terre" } }),
  m("CIT-EL-002", "Barrette de coupure de terre", "ELECTRICITE", "Mise à la terre", [ELE], "u", [60, 100, 150, "C", MT], { alias: { terriscan: "barrette_coupure" } }),
  m("CIT-EL-014", "Piquet de terre", "ELECTRICITE", "Mise à la terre", [ELE], "u", [120, 200, 280, "C", MT], { alias: { terriscan: "piquet_terre" } }),
  m("CIT-EL-008", "Coffret de brassage VDI", "ELECTRICITE", "Courants faibles", [VDI], "u", [600, 1100, 1800, "C", MT], { alias: { terriscan: "coffret_brassage" } }),
  m("CIT-EL-009", "Tableau général basse tension (TGBT)", "ELECTRICITE", "Tableaux", [ELE], "u", [800, 2000, 3500, "C", MT], { alias: { terriscan: "coffret_tgbt" } }),
  m("CIT-EL-025", "Coffret de distribution modulaire (12–42 modules)", "ELECTRICITE", "Tableaux", [ELE], "u", [150, 350, 670, "B", RSO],
    { alias: { seed: ["Coffret électrique 12 modules", "Coffret électrique 24 modules"], catalog: ["TABLEAU_13M"] } }),
  m("CIT-EL-010", "Interrupteur différentiel 30 mA", "ELECTRICITE", "Protection", [ELE], "u", [110, 299, 600, "B", RSO],
    { alias: { terriscan: "differentiel", seed: ["Interrupteur différentiel 30 mA"], catalog: ["INTERR_DIFF_30MA"] } }),
  m("CIT-EL-011", "Disjoncteur modulaire 10–32 A", "ELECTRICITE", "Protection", [ELE], "u", [32, 37, 98, "B", RSO],
    { alias: { terriscan: "disjoncteur", seed: ["Disjoncteur 10 A", "Disjoncteur 16 A", "Disjoncteur 20 A", "Disjoncteur 32 A"], catalog: ["DISJONCTEUR_C20_2P"] } }),
  m("CIT-EL-026", "Parafoudre", "ELECTRICITE", "Protection", [ELE], "u", [280, 380, 490, "C", SEED], { alias: { seed: ["Parafoudre"] } }),
  m("CIT-EL-012", "Gaine ICTA Ø16–20", "ELECTRICITE", "Conduits", [ELE], "ml", [1.5, 3.9, 8, "B", RSO],
    { ventes: [COUR50, COUR100], alias: { terriscan: "fourreau_icta", seed: ["Gaine ICTA Ø20 — rouleau"], catalog: ["GAINE_ICTA_20"] }, motsCles: ["gaine", "fourreau"] }),
  m("CIT-EL-027", "Goulotte 40×40", "ELECTRICITE", "Conduits", [ELE], "ml", [14, 20, 27, "C", SEED], { alias: { seed: ["Goulotte 40x40"] } }),
  m("CIT-EL-013", "Panneau LED 60×60", "ELECTRICITE", "Luminaires", [ELE], "u", [120, 200, 320, "C", MT], { alias: { terriscan: "panneau_led_600" } }),
  m("CIT-EL-028", "Réglette LED 1,2 m", "ELECTRICITE", "Luminaires", [ELE], "u", [75, 110, 165, "C", SEED], { alias: { seed: ["Réglette LED 1,2 m"] } }),
  m("CIT-EL-016", "Projecteur LED", "ELECTRICITE", "Luminaires", [ELE], "u", [95, 250, 600, "C", MT], { alias: { terriscan: "projecteur_led_rail", seed: ["Projecteur LED 50 W"] } }),
  m("CIT-EL-017", "Rail d'éclairage", "ELECTRICITE", "Luminaires", [ELE], "ml", [120, 200, 320, "C", MT], { alias: { terriscan: "rail_eclairage" } }),
  m("CIT-EL-018", "Spot LED encastré", "ELECTRICITE", "Luminaires", [ELE], "u", [25, 60, 180, "C", MT], { alias: { terriscan: "spot_led", seed: ["Spot LED encastré"] } }),
  m("CIT-EL-029", "Ampoule LED E27", "ELECTRICITE", "Luminaires", [ELE], "u", [15, 25, 45, "C", RC], { alias: { catalog: ["POINT_LUMIN_LED_E27"] } }),

  // ───────────── PLOMBERIE & SANITAIRE ─────────────
  m("CIT-PL-008", "Tube PPR PN20 Ø25", "PLOMBERIE", "Canalisations", [PLO], "ml", [15, 18, 45, "B", RSO],
    { ventes: [BARRE4], alias: { terriscan: "tube_ppr", seed: ["Tube PPR Ø25 — barre 4 m"] } }),
  m("CIT-PL-009", "Tube PVC évacuation (Ø40–125)", "PLOMBERIE", "Canalisations", [PLO], "ml", [4.5, 21, 70, "C", MT], { ventes: [BARRE4], alias: { terriscan: "tube_pvc_evacuation" } }),
  m("CIT-PL-011", "Tube PVC évacuation Ø40", "PLOMBERIE", "Canalisations", [PLO], "ml", [4.5, 6, 7.5, "C", SEED],
    { parent: "CIT-PL-009", ventes: [BARRE4], alias: { seed: ["Tube PVC évacuation Ø40 — barre 4 m"] } }),
  m("CIT-PL-012", "Tube PVC évacuation Ø100", "PLOMBERIE", "Canalisations", [PLO], "ml", [17.5, 21, 24.5, "C", SEED],
    { parent: "CIT-PL-009", ventes: [BARRE4], alias: { seed: ["Tube PVC évacuation Ø100 — barre 4 m"], catalog: ["TUBE_PVC_EVAC_100"] } }),
  m("CIT-PL-013", "Tube PVC évacuation Ø125", "PLOMBERIE", "Canalisations", [PLO], "ml", [24, 29, 34, "C", SEED],
    { parent: "CIT-PL-009", ventes: [BARRE4], alias: { seed: ["Tube PVC évacuation Ø125 — barre 4 m"] } }),
  m("CIT-PL-014", "Tube PER Ø12", "PLOMBERIE", "Canalisations", [PLO], "ml", [2.8, 3.2, 3.7, "C", SEED], { ventes: [COUR100], alias: { seed: ["Tube PER Ø12 — couronne 100 m"] } }),
  m("CIT-PL-015", "Tube PER Ø16", "PLOMBERIE", "Canalisations", [PLO], "ml", [4.2, 4.75, 5.3, "C", SEED],
    { ventes: [COUR100], alias: { seed: ["Tube PER Ø16 — couronne 100 m"], catalog: ["TUBE_PER_16"] } }),
  m("CIT-PL-016", "Tube PER Ø20", "PLOMBERIE", "Canalisations", [PLO], "ml", [5.8, 6.5, 7.2, "C", SEED], { ventes: [COUR100], alias: { seed: ["Tube PER Ø20 — couronne 100 m"] } }),
  m("CIT-PL-017", "Tube multicouche Ø16", "PLOMBERIE", "Canalisations", [PLO], "ml", [4.8, 5.5, 9, "C", SEED], { ventes: [COUR100], alias: { seed: ["Tube multicouche Ø16 — couronne"] } }),
  m("CIT-PL-018", "Tube cuivre Ø14", "PLOMBERIE", "Canalisations", [PLO], "ml", [28, 36, 44, "C", SEED], { alias: { seed: ["Tube cuivre Ø14"] } }),
  m("CIT-PL-019", "Raccord PVC Ø100 (coude, té)", "PLOMBERIE", "Canalisations", [PLO], "u", [8, 13, 21, "C", SEED], { alias: { seed: ["Coude PVC Ø100", "Té PVC Ø100"] } }),
  m("CIT-PL-006", "Robinetterie (générique)", "PLOMBERIE", "Robinetterie", [PLO], "u", [180, 450, 1200, "C", MT], { alias: { terriscan: "robinetterie" } }),
  m("CIT-PL-020", "Mitigeur lavabo", "PLOMBERIE", "Robinetterie", [PLO], "u", [180, 300, 430, "C", SEED],
    { parent: "CIT-PL-006", alias: { seed: ["Mitigeur lavabo chromé"], catalog: ["MITIGEUR_LAVABO"] } }),
  m("CIT-PL-021", "Mitigeur de douche", "PLOMBERIE", "Robinetterie", [PLO], "u", [220, 380, 560, "C", SEED],
    { parent: "CIT-PL-006", alias: { seed: ["Mitigeur de douche"], catalog: ["MITIGEUR_DOUCHE"] } }),
  m("CIT-PL-022", "Mitigeur d'évier", "PLOMBERIE", "Robinetterie", [PLO], "u", [250, 420, 620, "C", SEED], { parent: "CIT-PL-006", alias: { seed: ["Mitigeur évier cuisine"] } }),
  m("CIT-PL-023", "Robinet d'arrêt", "PLOMBERIE", "Robinetterie", [PLO], "u", [35, 55, 78, "C", SEED], { alias: { seed: ["Robinet d'arrêt"] } }),
  m("CIT-PL-010", "WC complet à poser", "PLOMBERIE", "Sanitaires", [PLO], "u", [600, 900, 3000, "C", MT],
    { alias: { terriscan: "wc_complet", seed: ["Pack WC complet à poser"], catalog: ["WC_POSE_AU_SOL"] } }),
  m("CIT-PL-024", "WC suspendu avec bâti-support", "PLOMBERIE", "Sanitaires", [PLO], "u", [1400, 1900, 2500, "C", SEED],
    { alias: { seed: ["WC suspendu + bâti support"], catalog: ["WC_SUSPENDU_ROCA"] } }),
  m("CIT-PL-025", "Lavabo céramique", "PLOMBERIE", "Sanitaires", [PLO], "u", [350, 500, 680, "C", SEED],
    { alias: { seed: ["Lavabo céramique sur colonne"], catalog: ["LAVABO_60"] } }),
  m("CIT-PL-026", "Vasque à poser", "PLOMBERIE", "Sanitaires", [PLO], "u", [400, 650, 950, "C", SEED], { alias: { seed: ["Vasque à poser"] } }),
  m("CIT-PL-027", "Receveur de douche", "PLOMBERIE", "Sanitaires", [PLO], "u", [450, 750, 1150, "C", SEED],
    { alias: { seed: ["Receveur de douche"], catalog: ["RECEVEUR_DOUCHE_90"] } }),
  m("CIT-PL-028", "Baignoire acrylique", "PLOMBERIE", "Sanitaires", [PLO], "u", [900, 1500, 2300, "C", SEED],
    { alias: { seed: ["Baignoire acrylique"], catalog: ["BAIGNOIRE_ACRYL_170"] } }),
  m("CIT-PL-004", "Évier inox", "PLOMBERIE", "Sanitaires", [PLO], "u", [380, 750, 4000, "C", MT],
    { alias: { terriscan: "evier_inox", seed: ["Évier inox 1 bac", "Évier inox 2 bacs"] } }),
  m("CIT-PL-005", "Lave-mains", "PLOMBERIE", "Sanitaires", [PLO], "u", [400, 800, 1500, "C", MT], { alias: { terriscan: "lave_mains" } }),
  m("CIT-PL-007", "Siphon de sol inox", "PLOMBERIE", "Évacuation", [PLO], "u", [35, 150, 500, "C", MT], { alias: { terriscan: "siphon_inox", seed: ["Siphon de sol inox"] } }),
  m("CIT-PL-029", "Bonde de douche", "PLOMBERIE", "Évacuation", [PLO], "u", [45, 75, 115, "C", SEED], { alias: { seed: ["Bonde de douche"] } }),
  m("CIT-PL-002", "Caniveau de douche inox", "PLOMBERIE", "Évacuation", [PLO], "ml", [600, 1000, 1600, "C", MT], { alias: { terriscan: "caniveau_inox" } }),
  m("CIT-PL-001", "Calorifuge de tuyauterie", "PLOMBERIE", "Isolation", [PLO, ECS], "ml", [12, 20, 30, "C", MT], { alias: { terriscan: "calorifuge" } }),
  m("CIT-PL-003", "Chauffe-eau électrique (générique)", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [900, 1845, 4500, "B", RSO], { alias: { terriscan: "chauffe_eau" } }),
  m("CIT-PL-030", "Chauffe-eau électrique 50 L", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [1690, 1845, 1999, "B", RSO],
    { parent: "CIT-PL-003", alias: { seed: ["Chauffe-eau électrique 50 L"] } }),
  m("CIT-PL-031", "Chauffe-eau électrique 100 L", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [1300, 1600, 1850, "C", SEED],
    { parent: "CIT-PL-003", alias: { seed: ["Chauffe-eau électrique 100 L"], catalog: ["CHAUFFE_EAU_ELEC_100L"] } }),
  m("CIT-PL-032", "Chauffe-eau électrique 200 L", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [2200, 2700, 3300, "C", SEED],
    { parent: "CIT-PL-003", alias: { seed: ["Chauffe-eau électrique 200 L"] } }),
  m("CIT-PL-033", "Chauffe-eau solaire 200 L", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [4500, 6000, 7800, "C", SEED], { alias: { seed: ["Chauffe-eau solaire 200 L"] } }),
  m("CIT-PL-034", "Chauffe-bain à gaz 10 L", "PLOMBERIE", "Eau chaude sanitaire", [ECS], "u", [800, 1200, 1650, "C", SEED],
    { alias: { seed: ["Chauffe-bain à gaz"], catalog: ["CHAUFFE_EAU_GAZ_10L"] } }),

  // ───────────── CVC ─────────────
  m("CIT-CVC-012", "Climatiseur split 9 000 BTU", "CVC", "Production froid", [CLIM], "u", [2800, 3500, 4300, "C", SEED], { alias: { seed: ["Climatiseur split 9000 BTU"] } }),
  m("CIT-CVC-013", "Climatiseur split 12 000 BTU", "CVC", "Production froid", [CLIM], "u", [3500, 4500, 5600, "C", SEED], { alias: { seed: ["Climatiseur split 12000 BTU"] } }),
  m("CIT-CVC-006", "Climatiseur gainable inverter", "CVC", "Production froid", [CLIM], "u", [9000, 16000, 35000, "C", MT],
    { alias: { terriscan: "gainable_inverter", seed: ["Climatiseur gainable"] } }),
  m("CIT-CVC-008", "Groupe frigorifique (froid positif)", "CVC", "Production froid", [CLIM], "u", [12000, 22000, 40000, "C", MT], { alias: { terriscan: "groupe_frigo_positif" } }),
  m("CIT-CVC-004", "Liaison frigorifique cuivre", "CVC", "Liaisons frigorifiques", [CLIM], "ml", [60, 100, 160, "C", MT], { alias: { terriscan: "cuivre_frigo" } }),
  m("CIT-CVC-001", "Isolant frigorifique (Armaflex)", "CVC", "Isolation frigorifique", [CLIM], "ml", [15, 25, 40, "C", MT], { alias: { terriscan: "armaflex" } }),
  m("CIT-CVC-007", "Gaine galvanisée", "CVC", "Gaines", [CLIM], "ml", [90, 150, 250, "C", MT], { alias: { terriscan: "gaine_galva" } }),
  m("CIT-CVC-005", "Diffuseur / grille aluminium", "CVC", "Diffusion d'air", [CLIM], "u", [120, 250, 450, "C", MT], { alias: { terriscan: "diffuseur_alu" } }),
  m("CIT-CVC-002", "Caisson de traitement d'air neuf", "CVC", "Traitement d'air", [CLIM], "u", [3500, 6000, 9000, "C", MT], { alias: { terriscan: "caisson_air_neuf" } }),
  m("CIT-CVC-003", "Caisson d'extraction", "CVC", "Ventilation", [CLIM], "u", [4000, 7000, 12000, "C", MT], { alias: { terriscan: "caisson_extraction" } }),
  m("CIT-CVC-009", "Panneau isotherme (chambre froide)", "CVC", "Chambre froide", [CLIM], "m2", [350, 500, 700, "C", MT], { alias: { terriscan: "panneau_isotherme" } }),
  m("CIT-CVC-010", "Porte isotherme", "CVC", "Chambre froide", [CLIM], "u", [2500, 4500, 7000, "C", MT], { alias: { terriscan: "porte_isotherme" } }),
  m("CIT-CVC-011", "Support antivibratile", "CVC", "Supports", [CLIM], "u", [80, 150, 300, "C", MT], { alias: { terriscan: "support_antivibratile" } }),
  m("CIT-CVC-014", "Radiateur électrique", "CVC", "Chauffage", [CLIM], "u", [450, 750, 1150, "C", SEED], { alias: { seed: ["Radiateur électrique"] } }),
  m("CIT-CVC-015", "Plancher chauffant (kit)", "CVC", "Chauffage", [CLIM], "m2", [120, 180, 250, "C", SEED], { alias: { seed: ["Plancher chauffant — kit"] } }),
  m("CIT-CVC-016", "Chaudière murale gaz", "CVC", "Chauffage", [CLIM, ECS], "u", [6500, 9000, 12500, "C", SEED], { alias: { seed: ["Chaudière murale gaz"] } }),

  // ───────────── MÉTALLERIE ─────────────
  m("CIT-SM-009", "Profilé acier (IPE, HEA, cornières)", "STRUCTURE_METALLIQUE", "Profilés acier", [MET], "kg", [14, 19, 26, "C", MT], { ventes: [TONNE_KG], alias: { terriscan: "profile_acier" } }),
  m("CIT-SM-011", "Tube acier", "STRUCTURE_METALLIQUE", "Profilés acier", [MET], "ml", [60, 120, 200, "C", MT], { alias: { terriscan: "tube_acier" } }),
  m("CIT-SM-001", "Bac acier collaborant", "STRUCTURE_METALLIQUE", "Planchers collaborants", [MET, GO], "m2", [180, 260, 350, "C", MT], { alias: { terriscan: "bac_collaborant" } }),
  m("CIT-SM-002", "Boulonnerie haute résistance", "STRUCTURE_METALLIQUE", "Boulonnerie", [MET], "kg", [25, 40, 60, "C", MT], { alias: { terriscan: "boulonnerie_hr" } }),
  m("CIT-SM-003", "Cheville chimique", "STRUCTURE_METALLIQUE", "Fixations", [MET], "u", [25, 70, 145, "C", MT], { alias: { terriscan: "cheville_chimique", seed: ["Cheville chimique"] } }),
  m("CIT-SM-004", "Garde-corps acier", "STRUCTURE_METALLIQUE", "Garde-corps", [MET], "ml", [400, 700, 1200, "C", MT], { alias: { terriscan: "garde_corps_acier" } }),
  m("CIT-SM-007", "Platine acier", "STRUCTURE_METALLIQUE", "Platines & assemblages", [MET], "u", [80, 180, 350, "C", MT], { alias: { terriscan: "platine_acier" } }),
  m("CIT-SM-010", "Tôle larmée (marches, paliers)", "STRUCTURE_METALLIQUE", "Tôlerie", [MET], "m2", [250, 400, 600, "C", MT], { alias: { terriscan: "tole_marche" } }),
  m("CIT-SM-006", "Panneau CTBH", "STRUCTURE_METALLIQUE", "Panneaux", [MET], "m2", [120, 190, 280, "C", MT], { alias: { terriscan: "panneau_ctbh" } }),
  m("CIT-SM-008", "Primaire époxy (pot)", "STRUCTURE_METALLIQUE", "Protection & peinture", [MET], "u", [200, 400, 700, "C", MT], { alias: { terriscan: "primaire_epoxy" } }),
  m("CIT-SM-005", "Laque polyuréthane (pot)", "STRUCTURE_METALLIQUE", "Protection & peinture", [MET], "u", [250, 500, 900, "C", MT], { alias: { terriscan: "laque_pu" } }),

  // ───────────── MENUISERIE ALUMINIUM & PVC ─────────────
  m("CIT-AL-004", "Profilé aluminium", "MENUISERIE_ALU", "Profilés alu", [ALU], "ml", [80, 150, 300, "C", MT], { alias: { terriscan: "profile_alu", seed: ["Profilé aluminium coulissant"] } }),
  m("CIT-AL-008", "Fenêtre aluminium coulissante (fournie)", "MENUISERIE_ALU", "Fenêtres", [ALU], "m2", [700, 1000, 1300, "C", RC],
    { ventes: [v("fenetre_150x120", "Fenêtre 1,50 × 1,20 m", 1.8), v("fenetre_80x120", "Fenêtre 0,80 × 1,20 m", 0.96)],
      alias: { seed: ["Fenêtre aluminium 2 vantaux"], catalog: ["MENUIS_ALU_COUL_2V_150_120", "MENUIS_ALU_OUVR_1V_80_120"] } }),
  m("CIT-AL-009", "Fenêtre aluminium RPT double vitrage (fournie)", "MENUISERIE_ALU", "Fenêtres", [ALU], "m2", [1000, 1250, 1500, "C", RC]),
  m("CIT-AL-010", "Porte-fenêtre aluminium", "MENUISERIE_ALU", "Fenêtres", [ALU], "m2", [730, 1000, 1300, "C", SEED],
    { ventes: [v("pf_140x215", "Porte-fenêtre 1,40 × 2,15 m", 3.01)], alias: { seed: ["Porte-fenêtre aluminium"] } }),
  m("CIT-AL-012", "Châssis fixe aluminium", "MENUISERIE_ALU", "Fenêtres", [ALU], "m2", [600, 850, 1150, "C", SEED], { alias: { seed: ["Châssis fixe aluminium"] } }),
  m("CIT-AL-011", "Porte d'entrée aluminium", "MENUISERIE_ALU", "Portes", [ALU], "u", [3200, 5000, 7000, "C", SEED],
    { alias: { seed: ["Porte d'entrée aluminium"], catalog: ["PORTE_ALU_ENTREE_90_215"] } }),
  m("CIT-AL-013", "Fenêtre PVC", "MENUISERIE_ALU", "Fenêtres", [ALU], "m2", [600, 800, 1000, "C", RC],
    { ventes: [v("fenetre_120x120", "Fenêtre 1,20 × 1,20 m", 1.44)], alias: { seed: ["Fenêtre PVC 2 vantaux"], catalog: ["FENETRE_PVC_2V_120_120"] } }),
  m("CIT-AL-014", "Volet roulant PVC", "MENUISERIE_ALU", "Fermetures", [ALU], "u", [700, 1100, 1550, "C", SEED], { alias: { seed: ["Volet roulant PVC"] } }),
  m("CIT-AL-005", "Rideau métallique", "MENUISERIE_ALU", "Fermetures", [ALU, MET], "m2", [450, 800, 1200, "C", MT], { alias: { terriscan: "rideau_metallique" } }),
  m("CIT-AL-001", "Moteur de rideau / volet", "MENUISERIE_ALU", "Motorisation", [ALU], "u", [2500, 4500, 7000, "C", MT], { alias: { terriscan: "moteur_rideau" } }),
  m("CIT-AL-006", "Vitrage feuilleté 44.2", "MENUISERIE_ALU", "Vitrage", [ALU], "m2", [300, 500, 800, "C", MT], { alias: { terriscan: "vitrage_442" } }),
  m("CIT-AL-002", "Ossature de façade aluminium", "MENUISERIE_ALU", "Ossatures façade", [ALU], "ml", [150, 300, 450, "C", MT], { alias: { terriscan: "ossature_facade" } }),
  m("CIT-AL-003", "Panneau composite aluminium (ACM)", "MENUISERIE_ALU", "Bardage", [ALU], "m2", [250, 400, 600, "C", MT], { alias: { terriscan: "panneau_acm" } }),
  m("CIT-AL-007", "Garde-corps aluminium", "MENUISERIE_ALU", "Garde-corps", [ALU, MET], "ml", [280, 365, 450, "C", RC], { alias: { catalog: ["GARDE_CORPS_ALU_ML"] } }),

  // ───────────── MENUISERIE BOIS & AGENCEMENT ─────────────
  m("CIT-MB-001", "Bloc-porte intérieur bois", "MENUISERIE_BOIS", "Portes", [BOIS], "u", [550, 1200, 3500, "C", MT],
    { alias: { terriscan: "bloc_porte", seed: ["Bloc-porte intérieur bois"], catalog: ["PORTE_BOIS_INT_70_200"] } }),
  m("CIT-MB-011", "Porte isoplane", "MENUISERIE_BOIS", "Portes", [BOIS], "u", [320, 550, 750, "C", RC], { alias: { seed: ["Porte isoplane"] } }),
  m("CIT-MB-012", "Porte blindée", "MENUISERIE_BOIS", "Portes", [BOIS], "u", [2700, 4500, 8500, "C", RC], { alias: { catalog: ["PORTE_BOIS_BLINDEE_90_215"] } }),
  m("CIT-MB-013", "Plinthe bois / MDF", "MENUISERIE_BOIS", "Finitions", [BOIS, SOL], "ml", [14, 22, 34, "C", SEED], { alias: { seed: ["Plinthe bois"], catalog: ["PLINTHE_MDF_70"] } }),
  m("CIT-MB-014", "Lambris bois", "MENUISERIE_BOIS", "Finitions", [BOIS, MUR], "m2", [95, 135, 185, "C", SEED], { alias: { seed: ["Lambris bois"] } }),
  m("CIT-MB-003", "Panneau d'agencement", "MENUISERIE_BOIS", "Panneaux", [BOIS], "m2", [250, 450, 700, "C", MT], { alias: { terriscan: "panneau_agencement" } }),
  m("CIT-MB-004", "Panneau mélaminé", "MENUISERIE_BOIS", "Panneaux", [BOIS], "m2", [180, 300, 450, "C", MT], { alias: { terriscan: "panneau_melamine" } }),
  m("CIT-MB-005", "Panneau plaqué bois", "MENUISERIE_BOIS", "Panneaux", [BOIS], "m2", [350, 600, 900, "C", MT], { alias: { terriscan: "panneau_plaque_bois" } }),
  m("CIT-MB-006", "Plan de travail", "MENUISERIE_BOIS", "Plans de travail", [BOIS], "ml", [600, 1200, 2500, "C", MT], { alias: { terriscan: "plan_travail" } }),
  m("CIT-MB-002", "Plan composite époxy / marbre reconstitué", "MENUISERIE_BOIS", "Plans & composites", [BOIS], "m2", [1200, 2000, 3000, "C", MT], { alias: { terriscan: "epoxy_composite_marbre" } }),
  m("CIT-MB-009", "Tablette bois", "MENUISERIE_BOIS", "Tablettes", [BOIS], "ml", [120, 250, 400, "C", MT], { alias: { terriscan: "tablette_bois" } }),
  m("CIT-MB-010", "Tasseau bois massif", "MENUISERIE_BOIS", "Bois massif", [BOIS], "ml", [25, 50, 90, "C", MT], { alias: { terriscan: "tasseau_bois" } }),
  m("CIT-MB-007", "Quincaillerie de menuiserie (ensemble)", "MENUISERIE_BOIS", "Quincaillerie", [BOIS], "u", [30, 120, 300, "C", MT], { alias: { terriscan: "quincaillerie" } }),
  m("CIT-MB-008", "Quincaillerie de meuble", "MENUISERIE_BOIS", "Quincaillerie", [BOIS], "u", [40, 120, 250, "C", MT], { alias: { terriscan: "quincaillerie_meuble" } }),

  // ───────────── PLÂTRERIE & FAUX PLAFONDS ─────────────
  m("CIT-FP-007", "Plâtre de construction", "FAUX_PLAFOND", "Plâtres", [STAFF, MUR], "kg", [1, 1.4, 1.8, "C", RC],
    { ventes: [SAC25, v("sac40", "Sac 40 kg", 40)], alias: { seed: ["Plâtre de construction — sac"], catalog: ["PLATRE_PARIS_SAC40"] } }),
  m("CIT-FP-004", "Plaque de plâtre BA13", "FAUX_PLAFOND", "Plaques", [FP, CLO], "m2", [35, 45, 55, "C", RC], { ventes: [v("plaque", "Plaque 1,20 × 2,50 m", 3)], alias: { terriscan: "plaque_ba13" } }),
  m("CIT-FP-005", "Plaque de plâtre BA13 hydrofuge", "FAUX_PLAFOND", "Plaques", [FP, CLO], "m2", [45, 60, 70, "C", RC], { ventes: [v("plaque", "Plaque 1,20 × 2,50 m", 3)], alias: { terriscan: "plaque_ba13_hydro" } }),
  m("CIT-FP-002", "Ossature métallique plaque de plâtre", "FAUX_PLAFOND", "Ossatures", [FP, CLO], "ml", [12, 20, 30, "C", MT], { ventes: [v("barre3", "Profilé 3 m", 3)], alias: { terriscan: "ossature_placo" } }),
  m("CIT-FP-003", "Ossature T (dalles)", "FAUX_PLAFOND", "Ossatures", [FP], "ml", [15, 25, 35, "C", MT], { alias: { terriscan: "ossature_t" } }),
  m("CIT-FP-001", "Dalle minérale 60×60", "FAUX_PLAFOND", "Dalles", [FP], "m2", [60, 100, 160, "C", MT], { alias: { terriscan: "dalle_minerale" } }),
  m("CIT-FP-006", "Profilé de gorge lumineuse", "FAUX_PLAFOND", "Profilés lumineux", [FP], "ml", [60, 110, 180, "C", MT], { alias: { terriscan: "profil_gorge_led" } }),
  m("CIT-FP-008", "Corniche staff", "FAUX_PLAFOND", "Staff", [STAFF], "ml", [65, 80, 95, "C", RC]),

  // ───────────── CARRELAGE & REVÊTEMENTS ─────────────
  m("CIT-REV-019", "Grès cérame 30×30 / 45×45", "REVETEMENT", "Carrelage", [SOL], "m2", [45, 105, 130, "B", RSO],
    { alias: { seed: ["Carrelage grès cérame 30x30"], catalog: ["CARRELAGE_GRES_30"] }, motsCles: ["carrelage"] }),
  m("CIT-REV-020", "Grès cérame 60×60", "REVETEMENT", "Carrelage", [SOL], "m2", [75, 165, 185, "B", RSO],
    { alias: { seed: ["Carrelage grès cérame 60x60"], catalog: ["CARRELAGE_GRES_60"] }, motsCles: ["carrelage"] }),
  m("CIT-REV-004", "Grès cérame grand format (60×120 et plus)", "REVETEMENT", "Carrelage", [SOL], "m2", [140, 250, 600, "C", MT],
    { alias: { terriscan: "gres_grand_format", seed: ["Carrelage grès cérame 60x120"] }, motsCles: ["carrelage"] }),
  m("CIT-REV-005", "Grès cérame antidérapant R11", "REVETEMENT", "Carrelage", [SOL], "m2", [120, 200, 320, "C", MT], { alias: { terriscan: "gres_r11" }, motsCles: ["carrelage"] }),
  m("CIT-REV-003", "Faïence murale", "REVETEMENT", "Faïence", [MUR], "m2", [55, 120, 250, "B", RSO],
    { alias: { terriscan: "faience", seed: ["Faïence murale 25x40"], catalog: ["FAIENCE_MURALE_25_40"] } }),
  m("CIT-REV-021", "Plinthe carrelage", "REVETEMENT", "Plinthes", [SOL], "ml", [8, 18, 30, "C", RC], { alias: { seed: ["Plinthe de carrelage"] } }),
  m("CIT-REV-013", "Plinthe à gorge", "REVETEMENT", "Plinthes", [SOL], "ml", [30, 55, 90, "C", MT], { alias: { terriscan: "plinthe_gorge" } }),
  m("CIT-REV-027", "Granito 30×30", "REVETEMENT", "Carrelage", [SOL], "m2", [60, 90, 130, "C", RC], { alias: { catalog: ["GRANITO_30_30"] } }),
  m("CIT-REV-018", "Parquet stratifié", "REVETEMENT", "Parquet", [SOL], "m2", [65, 120, 350, "C", MT],
    { alias: { terriscan: "stratifie_sol", seed: ["Parquet stratifié"], catalog: ["PARQUET_STRATIFIE_8"] } }),
  m("CIT-REV-022", "Parquet contrecollé", "REVETEMENT", "Parquet", [SOL], "m2", [180, 300, 430, "C", SEED], { alias: { seed: ["Parquet contrecollé"] } }),
  m("CIT-REV-023", "Parquet massif", "REVETEMENT", "Parquet", [SOL], "m2", [320, 520, 760, "C", SEED], { alias: { seed: ["Parquet massif"] } }),
  m("CIT-REV-024", "Revêtement PVC en lés", "REVETEMENT", "Sols souples", [SOL], "m2", [55, 90, 135, "C", SEED], { alias: { seed: ["Revêtement PVC en lés"] } }),
  m("CIT-REV-025", "Dalle PVC clipsable", "REVETEMENT", "Sols souples", [SOL], "m2", [90, 150, 225, "C", SEED], { alias: { seed: ["Dalle PVC clipsable"] } }),
  m("CIT-REV-026", "Moquette", "REVETEMENT", "Sols souples", [SOL], "m2", [60, 100, 155, "C", SEED], { alias: { seed: ["Moquette"] } }),
  m("CIT-REV-001", "Colle à carrelage C2", "REVETEMENT", "Colles & joints", [SOL, MUR], "kg", [1.9, 3, 5.6, "C", MT],
    { ventes: [SAC25], alias: { terriscan: "colle_c2", seed: ["Colle à carrelage — sac 25 kg"], catalog: ["MORTIER_COLLE_25"] }, motsCles: ["mortier-colle"] }),
  m("CIT-REV-007", "Joint ciment CG2", "REVETEMENT", "Colles & joints", [SOL, MUR], "kg", [7, 11, 16, "C", SEED],
    { ventes: [v("sac5", "Sac 5 kg", 5, true)], alias: { terriscan: "joint_cg2", seed: ["Joint de carrelage — sac"] } }),
  m("CIT-REV-008", "Joint époxy", "REVETEMENT", "Colles & joints", [SOL, MUR], "kg", [90, 150, 250, "C", MT], { alias: { terriscan: "joint_epoxy" } }),
  m("CIT-REV-015", "Ragréage autolissant", "REVETEMENT", "Préparation", [SOL], "kg", [3.6, 5.4, 7.2, "C", MT], { ventes: [SAC25], alias: { terriscan: "ragreage" } }),
  m("CIT-REV-014", "Primaire de sol (pot)", "REVETEMENT", "Préparation", [SOL], "u", [200, 400, 600, "C", MT], { alias: { terriscan: "primaire" } }),
  m("CIT-REV-016", "Résine époxy murale", "REVETEMENT", "Résines", [MUR], "kg", [70, 110, 160, "C", MT], { alias: { terriscan: "resine_epoxy_mur" } }),
  m("CIT-REV-017", "Résine époxy de sol", "REVETEMENT", "Résines", [SOL], "kg", [70, 110, 160, "C", MT], { alias: { terriscan: "resine_epoxy_sol" } }),
  m("CIT-REV-009", "Miroir argenté", "REVETEMENT", "Miroiterie", [MUR], "m2", [250, 450, 700, "C", MT], { alias: { terriscan: "miroir_argente" } }),
  m("CIT-REV-010", "Panneau contreplaqué", "REVETEMENT", "Panneaux", [BOIS, MUR], "m2", [150, 250, 400, "C", MT], { alias: { terriscan: "panneau_cp" } }),
  m("CIT-REV-011", "Panneau MDF", "REVETEMENT", "Panneaux", [BOIS, MUR], "m2", [120, 200, 320, "C", MT], { alias: { terriscan: "panneau_mdf" } }),

  // ───────────── MARBRE, PIERRE & ZELLIGE ─────────────
  m("CIT-MA-001", "Marbre local (beige, Sahara, Tafraout…)", "MARBRERIE", "Marbre", [SOL, MUR], "m2", [240, 440, 550, "B", RSO],
    { alias: { seed: ["Marbre Sahara beige — dalle", "Marbre beige de Tafraout — dalle"], catalog: ["MARBRE_BEIGE_2CM"] } }),
  m("CIT-MA-002", "Marbre importé (Carrare, Crema Marfil…)", "MARBRERIE", "Marbre", [SOL, MUR], "m2", [550, 700, 2200, "B", RSO], { alias: { seed: ["Marbre blanc de Carrare — dalle"] } }),
  m("CIT-MA-003", "Marbre noir", "MARBRERIE", "Marbre", [SOL, MUR], "m2", [380, 500, 640, "C", SEED], { alias: { seed: ["Marbre noir — dalle"] } }),
  m("CIT-MA-004", "Granit", "MARBRERIE", "Granit", [SOL, MUR], "m2", [350, 850, 1400, "B", RSO], { alias: { seed: ["Granit gris — dalle", "Granit noir Zimbabwe — dalle"] } }),
  m("CIT-MA-005", "Travertin", "MARBRERIE", "Pierre", [SOL, MUR], "m2", [220, 300, 370, "C", SEED], { alias: { seed: ["Travertin"] } }),
  m("CIT-MA-006", "Pierre de taille", "MARBRERIE", "Pierre", [MAC, MUR], "m2", [180, 260, 350, "C", SEED], { alias: { seed: ["Pierre de taille"] } }),
  m("CIT-MA-007", "Zellige", "MARBRERIE", "Zellige", [MUR, SOL], "m2", [250, 450, 1100, "C", RC],
    { alias: { seed: ["Zellige traditionnel de Fès"], catalog: ["ZELLIGE_TRADITIONNEL_10"] } }),
  m("CIT-MA-008", "Bejmat (terre cuite émaillée)", "MARBRERIE", "Zellige", [SOL], "m2", [150, 300, 800, "C", RC], { alias: { seed: ["Béjmat (terre cuite émaillée)"] } }),
  m("CIT-MA-009", "Plan de travail en marbre", "MARBRERIE", "Plans & escaliers", [BOIS], "ml", [450, 680, 920, "C", SEED], { alias: { seed: ["Plan de travail en marbre"] } }),
  m("CIT-MA-010", "Marche d'escalier en marbre", "MARBRERIE", "Plans & escaliers", [SOL], "ml", [280, 400, 540, "C", SEED], { alias: { seed: ["Marche d'escalier en marbre"] } }),

  // ───────────── PEINTURE & ENDUITS ─────────────
  m("CIT-PE-001", "Peinture vinylique intérieure (économique)", "PEINTURE", "Peintures", [PEI], "kg", [7.2, 10, 12.5, "B", RSO],
    { ventes: [v("seau30", "Seau 30 kg", 30), LITRE_PEINTURE], alias: { catalog: ["PEINTURE_VINYL_MAT"] } }),
  m("CIT-PE-002", "Peinture vinylique / acrylique mate", "PEINTURE", "Peintures", [PEI], "kg", [13.2, 14, 22, "B", RSO],
    { ventes: [v("seau25", "Seau 25 kg", 25), v("seau30", "Seau 30 kg", 30), LITRE_PEINTURE], alias: { seed: ["Peinture acrylique mate — pot 25 kg"] } }),
  m("CIT-REV-012", "Peinture satinée / velours lavable", "PEINTURE", "Peintures", [PEI], "kg", [16.8, 22, 47, "C", MT],
    { ventes: [v("seau25", "Seau 25 kg", 25), LITRE_PEINTURE], alias: { terriscan: "peinture_satinee", seed: ["Peinture acrylique satinée — pot 25 kg"], catalog: ["PEINTURE_VELOURS"] } }),
  m("CIT-PE-003", "Peinture acrylique haut de gamme", "PEINTURE", "Peintures", [PEI], "kg", [40, 47, 66, "B", RSO], { ventes: [LITRE_PEINTURE] }),
  m("CIT-PE-004", "Peinture glycérophtalique", "PEINTURE", "Peintures", [PEI], "kg", [30, 44, 60, "B", RSO], { ventes: [LITRE_PEINTURE] }),
  m("CIT-PE-005", "Peinture de façade", "PEINTURE", "Peintures", [PEI], "kg", [16.7, 20, 29, "B", RSO],
    { ventes: [v("seau25", "Seau 25 kg", 25), LITRE_PEINTURE], alias: { seed: ["Peinture façade — pot 25 kg"], catalog: ["PEINTURE_FACADE_SILOX"] } }),
  m("CIT-PE-006", "Peinture antirouille", "PEINTURE", "Peintures", [PEI, MET], "l", [36, 55, 74, "C", SEED],
    { ventes: [v("pot2_5", "Pot 2,5 L", 2.5, true)], alias: { seed: ["Peinture anti-rouille"] } }),
  m("CIT-PE-007", "Vernis bois", "PEINTURE", "Peintures", [PEI, BOIS], "l", [44, 65, 90, "C", SEED],
    { ventes: [v("pot2_5", "Pot 2,5 L", 2.5, true)], alias: { seed: ["Vernis bois"], catalog: ["VERNIS_BOIS_POLYU"] } }),
  m("CIT-REV-006", "Impression / sous-couche (pot)", "PEINTURE", "Enduits & sous-couches", [PEI], "u", [150, 300, 700, "C", MT],
    { alias: { terriscan: "impression", seed: ["Sous-couche universelle"] } }),
  m("CIT-REV-002", "Enduit de lissage", "PEINTURE", "Enduits & sous-couches", [PEI], "kg", [2.9, 4, 6.4, "C", MT],
    { ventes: [SAC25], alias: { terriscan: "enduit_lissage", seed: ["Enduit de lissage — sac 25 kg"] } }),
  m("CIT-PE-008", "Enduit décoratif / tadelakt", "PEINTURE", "Enduits & sous-couches", [PEI, MUR], "kg", [7, 10, 14, "C", SEED],
    { ventes: [SAC25], alias: { seed: ["Enduit décoratif tadelakt — sac"], catalog: ["ENDUIT_DECO_PRET", "TADELAKT_KG"] } }),
  m("CIT-PE-009", "Mastic de rebouchage", "PEINTURE", "Enduits & sous-couches", [PEI], "u", [35, 55, 78, "C", SEED], { alias: { seed: ["Mastic de rebouchage"] } }),

  // ───────────── QUINCAILLERIE ─────────────
  m("CIT-QU-001", "Visserie & chevilles (boîte)", "QUINCAILLERIE", "Visserie & fixation", [BOIS, MET], "u", [30, 70, 145, "C", SEED],
    { alias: { seed: ["Vis à bois — boîte", "Vis autoperceuse — boîte", "Chevilles à frapper — boîte", "Boulonnerie assortie — coffret"] } }),
  m("CIT-QU-002", "Clous", "QUINCAILLERIE", "Visserie & fixation", [GO, BOIS], "kg", [14, 20, 28, "C", SEED], { alias: { seed: ["Clous"] } }),
  m("CIT-QU-003", "Serrure à encastrer", "QUINCAILLERIE", "Serrurerie", [BOIS], "u", [90, 170, 290, "C", SEED], { parent: "CIT-MB-007", alias: { seed: ["Serrure à encastrer"] } }),
  m("CIT-QU-004", "Cylindre de sécurité", "QUINCAILLERIE", "Serrurerie", [BOIS, ALU], "u", [75, 150, 270, "C", SEED], { parent: "CIT-MB-007", alias: { seed: ["Cylindre de sécurité"] } }),
  m("CIT-QU-005", "Paumelle / charnière", "QUINCAILLERIE", "Serrurerie", [BOIS], "u", [12, 25, 48, "C", SEED], { parent: "CIT-MB-007", alias: { seed: ["Paumelle / charnière"] } }),
  m("CIT-QU-006", "Verrou de sûreté", "QUINCAILLERIE", "Serrurerie", [BOIS], "u", [55, 100, 170, "C", SEED], { parent: "CIT-MB-007", alias: { seed: ["Verrou de sûreté"] } }),
  m("CIT-QU-007", "Poignée de porte", "QUINCAILLERIE", "Serrurerie", [BOIS], "u", [45, 110, 230, "C", SEED], { parent: "CIT-MB-007", alias: { seed: ["Poignée de porte"] } }),
];

/**
 * Produits du seed marketplace volontairement HORS catalogue : outillage et
 * consommables de chantier, absents des bordereaux d'ouvrages.
 */
export const HORS_CATALOGUE_SEED = [
  "Croisillons (sachet)", "Rouleau + manchon", "Pinceau", "Bâche de protection", "Ruban de masquage",
  "Disque à tronçonner", "Foret béton — jeu", "Niveau à bulle", "Mètre ruban", "Brouette de chantier", "Truelle", "Bétonnière 160 L",
];

const PAR_CODE = new Map(CATALOGUE.map((r) => [r.code, r]));

export function materiau(code: string): MaterialRef | undefined {
  return PAR_CODE.get(code);
}

/** Codes du matériau et de ses déclinaisons (Ø12 → compte aussi pour l'acier HA générique). */
export function famillePrix(code: string): string[] {
  return [code, ...CATALOGUE.filter((r) => r.parent === code).map((r) => r.code)];
}

export const RE_CODE = /^CIT-[A-Z]{2,3}-\d{3}$/;
