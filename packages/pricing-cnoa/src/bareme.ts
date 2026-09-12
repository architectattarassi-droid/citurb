/**
 * Barème CNOA 2021 — plancher déontologique.
 *
 * Déplacé tel quel depuis apps/api/src/tomes/tome-2/p2/pricing.service.ts :
 * aucune valeur n'a été modifiée. Ce fichier est la SEULE définition du barème
 * dans le dépôt ; l'API et le front l'importent, personne ne le recopie.
 *
 * Ces montants ne sont pas des prix de vente : ce sont les coûts de
 * construction planchers au m² sous lesquels un architecte ne peut pas
 * calculer ses honoraires. Le prix proposé au client vient de GRILLE_REELLE
 * (grille.ts), et le plancher est vérifié à chaque calcul.
 *
 * Sources :
 *  - Contrat type unifié d'Architecte Construction (CNOA 28-02-2024) — Annexe 2
 *  - Règlement Intérieur Ordre National des Architectes (CNOA 28-02-2024)
 *  - Loi 016-89 (exercice profession architecte)
 *  - Loi 12-90 (urbanisme) + Loi 25-90 (lotissements)
 */

export type P2Section = "IMM" | "GR" | "LOT" | "EPIG" | "AMG";
export type FollowMode = "ON_SITE" | "PHOTOS";

export type CategoryCode =
  | "1.1" | "1.2"
  | "3.1" | "3.2" | "3.3"
  | "4.1" | "4.2" | "4.3" | "4.4" | "4.5" | "4.6"
  | "5.1" | "5.2" | "5.3" | "5.4" | "5.5" | "5.6" | "5.7" | "5.8" | "5.9"
  | "6.1" | "6.2";

export type CategoryDef = {
  label: string;
  costPerM2: number;
  validSections: P2Section[];
  photoOptionAvailable: boolean;
  notes?: string;
};

export const BAREME_CNOA_2021: Record<CategoryCode, CategoryDef> = {
  // 1.x — Habitat individuel petit gabarit
  "1.1": { label: "Habitat RDC ou R+3 max — surface plancher ≤ 500 m² — zone d'aménagement", costPerM2: 1900, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "1.2": { label: "Habitat social 250 000 / 140 000 DH (convention Etat) — lotissement obligatoire", costPerM2: 1900, validSections: ["IMM", "GR"], photoOptionAvailable: true },

  // 3.x — Immeubles collectifs et bureaux R+4 et plus
  "3.1": { label: "Immeubles collectifs et bureaux R+4+", costPerM2: 2500, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "3.2": { label: "Immeubles collectifs moyen standing R+4+", costPerM2: 3700, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "3.3": { label: "Immeubles collectifs haut standing R+4+", costPerM2: 5000, validSections: ["IMM", "GR"], photoOptionAvailable: true },

  // 4.x — Villas
  "4.1": { label: "Villas en bande", costPerM2: 3500, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "4.2": { label: "Villas en bande de standing", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "4.3": { label: "Villas jumelées", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "4.4": { label: "Villas jumelées de standing", costPerM2: 6000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "4.5": { label: "Villas isolées", costPerM2: 4000, validSections: ["IMM", "GR"], photoOptionAvailable: true },
  "4.6": { label: "Villas isolées de standing", costPerM2: 6000, validSections: ["IMM", "GR"], photoOptionAvailable: true },

  // 5.x — Équipements privés d'intérêt général (EPIG)
  "5.1": { label: "Hangars agricoles", costPerM2: 1500, validSections: ["EPIG"], photoOptionAvailable: true },
  "5.2": { label: "Hangars et dépôts industriels", costPerM2: 2500, validSections: ["EPIG"], photoOptionAvailable: true },
  "5.3": { label: "Écoles, collèges, lycées, mosquées", costPerM2: 3500, validSections: ["EPIG"], photoOptionAvailable: true },
  "5.4": { label: "Usines", costPerM2: 2500, validSections: ["EPIG"], photoOptionAvailable: true },
  "5.5": { label: "Hôtel 2★ / résidence touristique / maison d'hôte / hémodialyse / laboratoire", costPerM2: 3500, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
  "5.6": { label: "Hôtel 3★", costPerM2: 5000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
  "5.7": { label: "Cliniques", costPerM2: 5500, validSections: ["EPIG"], photoOptionAvailable: false, notes: "Hospitalier — DCE + CPS + suivi physique obligatoires" },
  "5.8": { label: "Hôtel 4★", costPerM2: 7000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "DCE + CPS + suivi physique obligatoires" },
  "5.9": { label: "Hôtel 5★ et équipement haut standing", costPerM2: 9000, validSections: ["EPIG"], photoOptionAvailable: false, notes: "Haut standing — DCE + CPS + suivi physique obligatoires" },

  // 6.x — Aménagements
  "6.1": { label: "Petit aménagement intérieur (locaux divers ≤ 50 m²)", costPerM2: 2500, validSections: ["AMG"], photoOptionAvailable: true },
  "6.2": { label: "Grand aménagement (agences bancaires, télécom, show-room, …)", costPerM2: 4500, validSections: ["AMG"], photoOptionAvailable: true },
};

export const SECTION_LABELS: Record<P2Section, string> = {
  IMM: "Immeuble (unité)",
  GR: "Groupement résidentiel",
  LOT: "Lotissement / morcellement",
  EPIG: "Équipement privé d'intérêt général",
  AMG: "Aménagement (transformation usage)",
};

/** Taux d'honoraires et de phases — article 7 du contrat type unifié CNOA. */
export const HONORAIRES_RATE = 0.05;
export const TVA_RATE = 0.2;
export const PHASE_A_RATE = 0.4;
export const PHASE_B_RATE = 0.3;
export const PHASE_C_ON_SITE_RATE = 0.3;
export const PHASE_C_PHOTOS_RATE = 0.1;

export const CATEGORY_CODES = Object.keys(BAREME_CNOA_2021) as CategoryCode[];

export function estCategorieConnue(code: string): code is CategoryCode {
  return Object.prototype.hasOwnProperty.call(BAREME_CNOA_2021, code);
}

/** Catégories valides pour une section (alimente GET /p2/categories). */
export function categoriesDeSection(section: P2Section): CategoryCode[] {
  return CATEGORY_CODES.filter((code) => BAREME_CNOA_2021[code].validSections.includes(section));
}
