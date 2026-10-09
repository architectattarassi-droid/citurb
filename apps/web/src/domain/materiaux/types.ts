/**
 * Catalogue unique de référence des matériaux CITURBAREA — types.
 *
 * Un matériau = un code stable CIT-<PFX>-NNN (espace de codes repris de la
 * matériauthèque TerriScan, mapping.json, et prolongé). Le code ne change
 * jamais ; un matériau retiré passe `actif: false`.
 *
 * UNITÉ DE RÉFÉRENCE (uniteRef) = l'unité dans laquelle le moteur de chiffrage
 * compte le composant dans un sous-détail d'ouvrage (kg de ciment, kg d'acier,
 * m³ de sable, m² de membrane, ml de câble, u d'agglo…). Tous les prix
 * comparés (recherche, fiches fournisseurs, médianes) sont ramenés à cette
 * unité, en HT.
 *
 * UNITÉS DE VENTE (ventes) = ce que le fournisseur facture (sac 50 kg, barre
 * 12 m, couronne 100 m, rouleau 10 m², seau 25 kg, tonne…). `facteur` =
 * quantité d'uniteRef contenue dans UNE unité de vente :
 *   prix par uniteRef = prix par unité de vente / facteur.
 * L'unité de référence elle-même est toujours vendable (facteur 1).
 */

/** Unités de référence (minuscules, celles des bordereaux / sous-détails). */
export type UniteRef = "kg" | "t" | "m3" | "m2" | "ml" | "u" | "l" | "ens";

export const UNITES_REF: Record<UniteRef, string> = {
  kg: "kg", t: "tonne", m3: "m³", m2: "m²", ml: "mètre linéaire", u: "unité", l: "litre", ens: "ensemble",
};

/** Catégories du catalogue (filtres annuaire, demandes de prix par lot). */
export const CATEGORIES = {
  GROS_OEUVRE: "Gros œuvre",
  ETANCHEITE: "Étanchéité",
  ISOLATION: "Isolation",
  VRD: "VRD & extérieurs",
  ELECTRICITE: "Électricité & courants faibles",
  PLOMBERIE: "Plomberie & sanitaire",
  CVC: "Climatisation, ventilation, eau chaude",
  STRUCTURE_METALLIQUE: "Métallerie & structure métallique",
  MENUISERIE_ALU: "Menuiserie aluminium & PVC",
  MENUISERIE_BOIS: "Menuiserie bois & agencement",
  FAUX_PLAFOND: "Plâtrerie & faux plafonds",
  REVETEMENT: "Carrelage & revêtements",
  MARBRERIE: "Marbre, pierre & zellige",
  PEINTURE: "Peinture & enduits",
  QUINCAILLERIE: "Quincaillerie & fixations",
} as const;
export type Categorie = keyof typeof CATEGORIES;

export interface UniteVente {
  /** Code court stable (sac50, barre12, couronne100, rouleau10…). */
  code: string;
  libelle: string;
  /** Quantité d'uniteRef dans une unité de vente (> 0). */
  facteur: number;
  /** Vrai si le facteur dépend d'une hypothèse (masse volumique, densité…). */
  approx?: boolean;
}

/** Fiabilité d'un prix : A = fournisseurs vérifiés (≥ 3 fiches), B = sources publiques datées, C = indicatif. */
export type Fiabilite = "A" | "B" | "C";

export interface PrixRecherche {
  /** HT présumé, en DH par uniteRef. */
  min: number;
  ref: number;
  max: number;
  fiabilite: Exclude<Fiabilite, "A">;
  /** Origine lisible (docs/prix/recherche/*.md, matériauthèque, seed). */
  source: string;
}

export interface MaterialRef {
  code: string;
  libelle: string;
  categorie: Categorie;
  famille: string;
  /** Lots du chiffrage / CPS où le matériau apparaît (nomenclature LOT_NN_* des cps-templates). */
  lots: string[];
  uniteRef: UniteRef;
  /** Unités de vente en plus de uniteRef (facteur 1, implicite). */
  ventes: UniteVente[];
  /** Matériau générique dont celui-ci est une déclinaison (ex. Ø12 → acier HA) : même uniteRef. */
  parent?: string;
  /** Masse en kg par uniteRef quand elle sert aux conversions (acier : kg/ml). */
  masseKg?: number;
  prix: PrixRecherche;
  /** Correspondances avec les anciens référentiels (réconciliation). */
  alias: {
    /** Clé de referentiel_cps/terriscan_referentiel/mapping.json (materiauRefs). */
    terriscan?: string;
    /** Noms exacts de apps/api/scripts/seed-referentiel.ts (MarketProduct.name). */
    seed?: string[];
    /** Codes de apps/api/data/materials/catalog.json. */
    catalog?: string[];
  };
  motsCles?: string[];
  actif?: boolean;
}
