/**
 * Correspondance composants du chiffrage → codes CIT du catalogue unique des
 * matériaux (domain/materiaux/catalogue.ts), selon le contrat
 * docs/prix/contrat-fournisseurs-chiffrage.md §1. `facteur` = quantité en
 * uniteRef du code CIT pour UNE unité du composant (ex. sac de 50 kg → 50 kg).
 * Sert à remplacer un prix de recherche par le prix marché des fournisseurs
 * Cercles (GET /api/prix/materiaux) et à bâtir les demandes de prix par lot.
 * Composants sans équivalent catalogue (posés, forfaits, hypothèses) : absents.
 */
import { MATERIAUX, prixHT } from "./referentiel";

export const CORRESPONDANCE_CIT: Record<string, { cit: string; facteur: number }> = {
  BPE_B15: { cit: "CIT-GO-005", facteur: 1 },
  BPE_B25: { cit: "CIT-GO-004", facteur: 1 },
  BPE_B30: { cit: "CIT-GO-045", facteur: 1 },
  POMPAGE: { cit: "CIT-GO-047", facteur: 1 },
  ACIER_HA: { cit: "CIT-GO-001", facteur: 1 },
  CIMENT_CPJ45: { cit: "CIT-GO-008", facteur: 50 },
  SABLE: { cit: "CIT-GO-011", facteur: 1 },
  GRAVIER: { cit: "CIT-GO-043", facteur: 1 },
  TOUT_VENANT: { cit: "CIT-GO-019", facteur: 1 },
  AGGLO10: { cit: "CIT-GO-002", facteur: 1 },
  AGGLO15: { cit: "CIT-GO-048", facteur: 1 },
  AGGLO20: { cit: "CIT-GO-003", facteur: 1 },
  BRIQUE8: { cit: "CIT-GO-006", facteur: 1 },
  HOURDIS16: { cit: "CIT-GO-013", facteur: 1 },
  HOURDIS20: { cit: "CIT-GO-055", facteur: 1 },
  POUTRELLE: { cit: "CIT-GO-017", facteur: 1 },
  CTBX18: { cit: "CIT-GO-058", facteur: 1 },
  MEMBRANE_SBS4: { cit: "CIT-ET-004", facteur: 1 },
  MEMBRANE_SBS3: { cit: "CIT-ET-006", facteur: 1 },
  GEOTEXTILE: { cit: "CIT-VRD-016", facteur: 1 },
  XPS4: { cit: "CIT-IS-002", facteur: 1 },
  PSE4: { cit: "CIT-IS-001", facteur: 1 },
  PVC200: { cit: "CIT-VRD-007", facteur: 1 },
  CARREAU_45: { cit: "CIT-REV-019", facteur: 1 },
  CARREAU_60: { cit: "CIT-REV-020", facteur: 1 },
  CARREAU_GF: { cit: "CIT-REV-004", facteur: 1 },
  MARBRE_LOCAL: { cit: "CIT-MA-001", facteur: 1 },
  MARBRE_IMPORT: { cit: "CIT-MA-002", facteur: 1 },
  FAIENCE_STD: { cit: "CIT-REV-003", facteur: 1 },
  ZELLIGE: { cit: "CIT-MA-007", facteur: 1 },
  PLINTHE: { cit: "CIT-REV-021", facteur: 1 },
  COLLE_C2: { cit: "CIT-REV-001", facteur: 1 },
  PEINT_ECO: { cit: "CIT-PE-001", facteur: 1 },
  PEINT_MOY: { cit: "CIT-PE-002", facteur: 1 },
  PEINT_HAUT: { cit: "CIT-PE-003", facteur: 1 },
  PEINT_FACADE: { cit: "CIT-PE-005", facteur: 1 },
  ENDUIT_LISSAGE: { cit: "CIT-REV-002", facteur: 1 },
  BA13: { cit: "CIT-FP-004", facteur: 1 },
  OSSATURE: { cit: "CIT-FP-002", facteur: 1 },
  CORNICHE: { cit: "CIT-FP-008", facteur: 1 },
  ALU_ECO: { cit: "CIT-AL-008", facteur: 1 },
  ALU_MOY: { cit: "CIT-AL-009", facteur: 1 },
  PORTE_ENTREE_ALU: { cit: "CIT-AL-011", facteur: 1 },
  PORTE_ECO: { cit: "CIT-MB-011", facteur: 1 },
  PORTE_MOY: { cit: "CIT-MB-001", facteur: 1 },
  GC_ALU: { cit: "CIT-AL-007", facteur: 1 },
  GAINE_ICTA20: { cit: "CIT-EL-012", facteur: 1 },
  FIL_15: { cit: "CIT-EL-003", facteur: 1 },
  FIL_25: { cit: "CIT-EL-004", facteur: 1 },
  PRISE: { cit: "CIT-EL-015", facteur: 1 },
  INTER: { cit: "CIT-EL-019", facteur: 1 },
  COFFRET42: { cit: "CIT-EL-025", facteur: 1 },
  DISJ: { cit: "CIT-EL-011", facteur: 1 },
  ID30: { cit: "CIT-EL-010", facteur: 1 },
  PPR20: { cit: "CIT-PL-008", facteur: 1 },
  PVC_EVAC: { cit: "CIT-PL-009", facteur: 1 },
  WC_ECO: { cit: "CIT-PL-010", facteur: 1 },
  WC_SUSPENDU: { cit: "CIT-PL-024", facteur: 1 },
  LAVABO_ECO: { cit: "CIT-PL-025", facteur: 1 },
  VASQUE_HAUT: { cit: "CIT-PL-026", facteur: 1 },
  MIT_LAV_ECO: { cit: "CIT-PL-020", facteur: 1 },
  MIT_DOUCHE: { cit: "CIT-PL-021", facteur: 1 },
  MIT_EVIER: { cit: "CIT-PL-022", facteur: 1 },
  CHAUFFE_EAU_100: { cit: "CIT-PL-031", facteur: 1 },
  CES_200: { cit: "CIT-PL-033", facteur: 1 },
  SPLIT12: { cit: "CIT-CVC-013", facteur: 1 },
  GAINABLE: { cit: "CIT-CVC-006", facteur: 1 },
};

/** Unité du composant attendue pour chaque uniteRef CIT (contrôle de cohérence). */
export const UNITE_EQUIVALENTE: Record<string, string> = { m3: "m³", m2: "m²", kg: "kg", ml: "ml", u: "u", l: "L" };

/**
 * Prix HT d'un composant à partir d'un prix CIT par uniteRef (prix marché
 * fournisseurs) ; repli sur le prix de recherche si le code n'est pas couvert.
 */
export function prixComposantDepuisCIT(id: string, prixParCit: Record<string, number | undefined>): number {
  const c = CORRESPONDANCE_CIT[id];
  const p = c ? prixParCit[c.cit] : undefined;
  return p !== undefined ? p * c!.facteur : prixHT(MATERIAUX[id]);
}
