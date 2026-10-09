/**
 * Nomenclature unique des lots du chiffrage. Reprend la proposition de
 * docs/prix/recherche/prix-internes.md §4 (code alpha stable + numéro d'ordre)
 * avec la correspondance vers costRangesMA, les gabarits CPS
 * (apps/api/data/cps-templates/lots) et le référentiel TerriScan.
 * Seuls les lots utilisés par le chiffrage neuf sont listés (DEM, TRV exclus).
 */

export type CodeLot =
  | "INS" | "TER" | "FON" | "STR" | "MAC" | "ETA" | "FAC" | "ALU" | "BOI" | "MET"
  | "FPL" | "RSO" | "RMU" | "PEI" | "PLO" | "ELE" | "CFA" | "CVC" | "ASC" | "ENR" | "VRD" | "EXT";

export type Lot = {
  code: CodeLot;
  numero: string;
  libelle: string;
  /** Famille de coût pour le contrôle « part du gros œuvre ». */
  famille: "GROS_OEUVRE" | "SECOND_OEUVRE" | "EQUIPEMENTS" | "EXTERIEURS";
  costRangesMA: string[];
  cps: string[];
  terriscan: string[];
};

const L = (code: CodeLot, numero: string, libelle: string, famille: Lot["famille"], costRangesMA: string[], cps: string[], terriscan: string[]): Lot =>
  ({ code, numero, libelle, famille, costRangesMA, cps, terriscan });

export const LOTS: Lot[] = [
  L("INS", "00", "Installation de chantier", "GROS_OEUVRE", ["INS"], ["LOT_00_GENERALITES"], ["GO.01.A"]),
  L("TER", "01", "Terrassements", "GROS_OEUVRE", ["TER"], ["LOT_01_TERRASSEMENT"], ["GO.01.B"]),
  L("FON", "02", "Fondations, infrastructure et soutènement", "GROS_OEUVRE", ["FON"], ["LOT_02 (infrastructure)"], ["GO.02"]),
  L("STR", "03", "Structure béton armé", "GROS_OEUVRE", ["STR"], ["LOT_02_GROS_OEUVRE_BETON"], ["GO.03"]),
  L("MAC", "04", "Maçonnerie et enduits", "GROS_OEUVRE", ["MAC"], ["LOT_03_MACONNERIE"], ["GO.04"]),
  L("ETA", "05", "Étanchéité et isolation", "GROS_OEUVRE", ["ETA"], ["LOT_04_ETANCHEITE"], ["GO.05"]),
  L("FAC", "07", "Façades (enduit et peinture extérieurs)", "SECOND_OEUVRE", ["FAC"], ["LOT_03 (enduit ext.)", "LOT_13 (peinture façade)"], ["FIN.03.A.03"]),
  L("ALU", "08", "Menuiseries extérieures aluminium", "SECOND_OEUVRE", ["ALU"], ["LOT_07_MENUISERIE_EXT_ALU"], ["FIN.03.A.01"]),
  L("BOI", "09", "Menuiseries intérieures bois et cuisine", "SECOND_OEUVRE", ["BOI"], ["LOT_08_MENUISERIE_INT_BOIS"], ["SO.03"]),
  L("MET", "10", "Métallerie, ferronnerie", "SECOND_OEUVRE", ["FER"], ["LOT_09_METALLERIE"], ["SO.01"]),
  L("FPL", "12", "Faux plafonds, plâtre et staff", "SECOND_OEUVRE", ["PLA"], ["LOT_18_FAUX_PLAFONDS", "LOT_19_STAFF_STUC"], ["SO.02"]),
  L("RSO", "13", "Revêtements de sols", "SECOND_OEUVRE", ["REV"], ["LOT_11_REVETEMENTS_SOLS"], ["FIN.01"]),
  L("RMU", "14", "Revêtements muraux (faïence)", "SECOND_OEUVRE", ["REV (faïence)"], ["LOT_12_REVETEMENTS_MURS"], ["FIN.02.A.03"]),
  L("PEI", "15", "Peinture intérieure", "SECOND_OEUVRE", ["PEI"], ["LOT_13_PEINTURE"], ["FIN.02.A.01", "FIN.02.A.02"]),
  L("PLO", "16", "Plomberie sanitaire et eau chaude", "SECOND_OEUVRE", ["PLO"], ["LOT_14_PLOMBERIE_SANITAIRE", "LOT_17_PLOMBERIE_ECS"], ["TEC.02"]),
  L("ELE", "17", "Électricité", "SECOND_OEUVRE", ["ELE"], ["LOT_15_ELECTRICITE"], ["TEC.01.A.01-10"]),
  L("CFA", "18", "Courants faibles (VDI, interphone)", "SECOND_OEUVRE", ["TEC/SEC (partie)"], ["LOT_20_VDI_COURANTS_FAIBLES"], ["TEC.01.A.11"]),
  L("CVC", "19", "Climatisation", "EQUIPEMENTS", ["CLM (AME)"], ["LOT_16_CLIMATISATION"], ["TEC.03"]),
  L("ASC", "20", "Ascenseur / élévateur", "EQUIPEMENTS", ["SEC (partie)"], [], []),
  L("ENR", "21", "Énergies renouvelables (solaire, photovoltaïque)", "EQUIPEMENTS", [], [], []),
  L("VRD", "22", "Assainissement et réseaux extérieurs", "EXTERIEURS", ["(exclu)"], ["LOT_26_VRD_VOIRIE"], ["VRD.01"]),
  L("EXT", "23", "Clôture, portail, piscine et extérieurs", "EXTERIEURS", [], ["LOT_21_ESPACES_VERTS"], []),
];

export const LOT_PAR_CODE: Record<CodeLot, Lot> = Object.fromEntries(LOTS.map((l) => [l.code, l])) as Record<CodeLot, Lot>;
