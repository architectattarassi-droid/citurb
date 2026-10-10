/**
 * Correspondance ouvrages du chiffrage → lots et postes du bordereau CPS
 * (apps/api/data/cps-templates/lots). `poste` n'est renseigné que si l'unité
 * concorde, ou avec un `facteur` de conversion explicite (quantité CPS =
 * quantité chiffrage × facteur ; PU CPS = PU ÷ facteur). Sans poste, l'ouvrage
 * devient un poste complémentaire « N.Cx » du lot (désignation du chiffrage).
 * Lots sans gabarit (ascenseur, photovoltaïque) : pseudo-lots signalés.
 */
export type Cible = { lot: string; poste?: string; facteur?: number; note?: string;
  /** Montant fusionné dans le poste de cet ouvrage (ex. hérisson compris dans le dallage 2.08). */
  fusionAvec?: string };

export const LOTS_SANS_GABARIT: Record<string, { numero: number; intitule: string }> = {
  LOT_23_ASCENSEUR: { numero: 23, intitule: "Ascenseurs et élévateurs (gabarit CPS à rédiger)" },
  LOT_25_PHOTOVOLTAIQUE: { numero: 25, intitule: "Photovoltaïque (gabarit CPS à rédiger)" },
  LOT_24_DOMOTIQUE: { numero: 24, intitule: "Domotique et sûreté (gabarit CPS à rédiger)" },
};

const T = "LOT_01_TERRASSEMENT", B = "LOT_02_GO_BETON", M = "LOT_03_MACONNERIE", E = "LOT_04_ETANCHEITE",
  A = "LOT_07_MENUISERIE_EXT_ALU", W = "LOT_08_MENUISERIE_INT_BOIS", F = "LOT_09_METALLERIE", S = "LOT_11_REVETEMENTS_SOLS",
  R = "LOT_12_REVETEMENTS_MURS", P = "LOT_13_PEINTURE", PL = "LOT_14_PLOMBERIE_SANITAIRE", EL = "LOT_15_ELECTRICITE",
  CL = "LOT_16_CLIMATISATION", ECS = "LOT_17_PLOMBERIE_ECS", FP = "LOT_18_FAUX_PLAFONDS", ST = "LOT_19_STAFF_STUC",
  VDI = "LOT_20_VDI_COURANTS_FAIBLES", EV = "LOT_21_ESPACES_VERTS", VRD = "LOT_26_VRD_VOIRIE";

export const CORRESPONDANCE_CPS: Record<string, Cible> = {
  // 01 Terrassements
  "TER.01": { lot: T, poste: "1.01" }, "TER.02": { lot: T, poste: "1.02" }, "TER.03": { lot: T, poste: "1.03" },
  "TER.04": { lot: T }, "TER.05": { lot: T, poste: "1.06" }, "TER.06": { lot: T, poste: "1.04" },
  "TER.07": { lot: T, poste: "1.05" }, "TER.08": { lot: T, poste: "1.07" }, "TER.09": { lot: T },
  // 02 Béton armé (fondations et élévation)
  "FON.01": { lot: B, poste: "2.01", facteur: 0.1, note: "ép. 10 cm" },
  "FON.02": { lot: B, poste: "2.03" }, "FON.03": { lot: B, poste: "2.03" }, "FON.04": { lot: B, poste: "2.03" },
  "FON.05": { lot: B, poste: "2.03" }, "FON.06": { lot: B, poste: "2.03" }, "FON.09": { lot: B, poste: "2.02" },
  "FON.07": { lot: B, poste: "2.08", fusionAvec: "FON.08" }, "FON.08": { lot: B, poste: "2.08" },
  "FON.10": { lot: B, poste: "2.04", facteur: 0.2, note: "voile ép. 20 cm" },
  "FON.11": { lot: B }, "FON.15": { lot: B }, "FON.16": { lot: "LOT_03_MACONNERIE" },
  "STR.01": { lot: B, poste: "2.04" }, "STR.02": { lot: B, poste: "2.04" }, "STR.07": { lot: B, poste: "2.04" },
  "STR.03": { lot: B, poste: "2.06" }, "STR.04": { lot: B, poste: "2.06" }, "STR.05": { lot: B, poste: "2.05" },
  "STR.06": { lot: B, poste: "2.07" }, "STR.08": { lot: M },
  // 03 Maçonnerie, enduits, façades
  "MAC.01": { lot: M, poste: "3.01" }, "MAC.02": { lot: M }, "MAC.03": { lot: M },
  "MAC.05": { lot: M, poste: "3.07" }, "MAC.06": { lot: M, poste: "3.07" }, "MAC.07": { lot: M },
  "FAC.01": { lot: M, poste: "3.08" }, "FAC.04": { lot: M },
  "EXT.01": { lot: M },
  // 04 Étanchéité, drainage, parties enterrées
  "ETA.01": { lot: E, poste: "4.01" }, "ETA.02": { lot: E, poste: "4.04" }, "ETA.03": { lot: E, poste: "4.06" },
  "ETA.04": { lot: E, poste: "4.03" }, "ETA.05": { lot: E, poste: "4.03" }, "ETA.06": { lot: E, poste: "4.05" },
  "ETA.07": { lot: R, poste: "12.07" },
  "FON.12": { lot: E }, "FON.13": { lot: E }, "FON.14": { lot: E },
  // 07 Menuiseries extérieures
  "ALU.01": { lot: A }, "ALU.02": { lot: A, poste: "7.01" }, "ALU.03": { lot: A, poste: "7.01" }, "ALU.04": { lot: A, poste: "7.02" },
  "ALU.05": { lot: A }, "ALU.06": { lot: A },
  // 08 Menuiseries intérieures et cuisine
  "BOI.01": { lot: W, poste: "8.01" }, "BOI.02": { lot: W, poste: "8.01" }, "BOI.03": { lot: W, poste: "8.01" }, "BOI.04": { lot: W, poste: "8.01" },
  "BOI.05": { lot: W }, "BOI.06": { lot: W, poste: "8.04" },
  "BOI.07": { lot: W, poste: "8.03", facteur: 2.5, note: "placard toute hauteur 2,50 m" },
  "BOI.10": { lot: W }, "BOI.11": { lot: W }, "BOI.12": { lot: W }, "BOI.13": { lot: W }, "BOI.14": { lot: W },
  // 09 Métallerie
  "MET.01": { lot: F, poste: "9.01" }, "MET.02": { lot: F, poste: "9.01" }, "MET.03": { lot: F, poste: "9.01" }, "MET.04": { lot: F, poste: "9.01" },
  "MET.05": { lot: F, poste: "9.03" }, "EXT.02": { lot: F, poste: "9.04" },
  // 11-13 Revêtements et peinture
  "RSO.01": { lot: S, poste: "11.01" }, "RSO.02": { lot: S, poste: "11.01" }, "RSO.03": { lot: S, poste: "11.01" },
  "RSO.04": { lot: S, poste: "11.02" }, "RSO.05": { lot: S, poste: "11.02" }, "RSO.06": { lot: S, poste: "11.05" },
  "RMU.01": { lot: R, poste: "12.01" }, "RMU.02": { lot: R, poste: "12.01" }, "RMU.03": { lot: R, poste: "12.02" },
  "PEI.01": { lot: P, poste: "13.01" }, "PEI.02": { lot: P, poste: "13.01" }, "PEI.03": { lot: P, poste: "13.01" },
  "FAC.02": { lot: P, poste: "13.02" }, "FAC.03": { lot: P, poste: "13.02" },
  // 14 / 17 Plomberie, eau chaude
  "PLO.01": { lot: PL }, "PLO.02": { lot: PL }, "PLO.03": { lot: PL }, "PLO.04": { lot: PL }, "PLO.05": { lot: PL },
  "PLO.06": { lot: PL }, "PLO.07": { lot: PL }, "PLO.09": { lot: PL, poste: "14.05" }, "PLO.10": { lot: PL, poste: "14.03" },
  "PLO.11": { lot: PL }, "PLO.12": { lot: PL },
  "PLO.08": { lot: ECS }, "ENR.01": { lot: ECS },
  // 15 Électricité, 20 courants faibles
  "ELE.01": { lot: EL, poste: "15.04" }, "ELE.03": { lot: EL, poste: "15.04" }, "ELE.02": { lot: EL, poste: "15.05" }, "ELE.04": { lot: EL, poste: "15.05" },
  "ELE.05": { lot: EL, poste: "15.06" }, "ELE.06": { lot: EL, poste: "15.02" }, "ELE.07": { lot: EL, poste: "15.07" },
  "ELE.08": { lot: EL }, "ELE.09": { lot: EL, poste: "15.03", facteur: 1, note: "1 ensemble = 1 tableau" },
  "CFA.01": { lot: VDI }, "CFA.02": { lot: VDI }, "CFA.03": { lot: "LOT_24_DOMOTIQUE" },
  // 16 Climatisation
  "CVC.01": { lot: CL, poste: "16.01" }, "CVC.02": { lot: CL, poste: "16.01" }, "CVC.03": { lot: CL, poste: "16.01" }, "CVC.04": { lot: CL },
  // 18-19 Plafonds
  "FPL.01": { lot: FP, poste: "18.02" }, "FPL.02": { lot: ST },
  // Équipements sans gabarit
  "ASC.01": { lot: "LOT_23_ASCENSEUR" }, "ASC.02": { lot: "LOT_23_ASCENSEUR" }, "ASC.03": { lot: "LOT_23_ASCENSEUR" }, "ASC.04": { lot: "LOT_23_ASCENSEUR" },
  "ENR.02": { lot: "LOT_25_PHOTOVOLTAIQUE" },
  // 21 / 26 Extérieurs et réseaux
  "EXT.03": { lot: EV }, "EXT.04": { lot: EV },
  "VRD.01": { lot: VRD }, "VRD.02": { lot: VRD, poste: "26.04" },
};
