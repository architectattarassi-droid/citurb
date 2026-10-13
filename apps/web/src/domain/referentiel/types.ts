/**
 * Référentiel CITURBAREA : le projet décomposé en jalons (milestones), chacun
 * portant les exigences normatives et réglementaires qui s'y appliquent, les
 * checklists de conception et d'exécution, les documents et PV types.
 *
 * Ossature :
 *  - phase    = code de packages/contracts/src/phases.catalog.ts (00_BRIEF … 97_RECEPTION_DEFINITIVE) ;
 *  - lot      = code de domain/chiffrage/lots.ts (INS, TER, FON, STR, MAC, ETA, …) quand le jalon porte sur un lot ;
 *  - jalon    = étape vérifiable (ex. « Ferraillage des semelles avant bétonnage »).
 *
 * RÈGLE DE CONTENU (droit d'auteur) : les normes NM / NF / EN / DTU sont des
 * documents payants protégés. Le référentiel n'en reproduit JAMAIS le texte :
 * chaque exigence est une reformulation, dans nos mots, de ce qu'il faut faire
 * et vérifier, avec la référence (code + article / paragraphe si connu). Les
 * textes réglementaires publiés au Bulletin officiel (lois, décrets, arrêtés :
 * RPS 2000, RTCM, sécurité incendie…) peuvent être résumés librement.
 * Toute valeur non vérifiée dans une source : `verifie: false`.
 */

/** Organisme ou nature du texte. */
export type Organisme = "ETAT_MA" | "IMANOR" | "AFNOR" | "CEN" | "ISO" | "CSTB" | "AUTRE";

/** Portée juridique au Maroc. */
export type Portee =
  | "REGLEMENTAIRE"          // loi, décret, arrêté : obligatoire
  | "NORME_OBLIGATOIRE"      // norme NM rendue d'application obligatoire par arrêté
  | "NORME_VOLONTAIRE"       // norme d'application volontaire (souvent exigée par le CPS / le bureau de contrôle)
  | "REGLE_DE_L_ART";        // DTU, guides professionnels, Eurocodes utilisés comme référence

export type Domaine =
  | "URBANISME" | "STRUCTURE" | "SISMIQUE" | "GEOTECHNIQUE" | "BETON" | "MACONNERIE" | "ETANCHEITE"
  | "THERMIQUE" | "ACOUSTIQUE" | "INCENDIE" | "ACCESSIBILITE" | "ELECTRICITE" | "PLOMBERIE" | "GAZ"
  | "VENTILATION" | "MENUISERIE" | "REVETEMENTS" | "PEINTURE" | "ASCENSEUR" | "VRD" | "SECURITE_CHANTIER"
  | "ENVIRONNEMENT" | "CONTRAT" | "RECEPTION";

export interface Norme {
  /** Identifiant stable, ex. "RPS_2011", "NM_EN_206_1", "DTU_43_1". */
  id: string;
  /** Référence officielle telle qu'écrite par l'organisme. */
  code: string;
  intitule: string;
  organisme: Organisme;
  portee: Portee;
  domaines: Domaine[];
  /** Ce que couvre le texte, en 1–3 phrases, dans nos mots. */
  objet: string;
  /** Texte de référence officiel : BO, page de l'organisme (jamais une copie pirate). */
  source?: { titre: string; url: string };
  /** Remplace / est remplacé par (ids). */
  remplace?: string[];
  remplacePar?: string;
  verifie: boolean;
  majLe: string; // AAAA-MM-JJ
}

export type Moment = "CONCEPTION" | "EXECUTION" | "RECEPTION";
export type Criticite = "BLOQUANT" | "MAJEUR" | "MINEUR";
export type Preuve = "PHOTO" | "VIDEO" | "PV" | "ESSAI" | "MESURE" | "DOCUMENT" | "PLAN" | "VISA" | "SIGNATURE";

/** Rôles (alignés sur Acteur de phases.catalog.ts, simplifiés pour l'affichage). */
export type Role =
  | "CLIENT" | "ARCHITECTE" | "BET_STRUCTURE" | "BET_FLUIDES" | "GEOTECHNICIEN" | "TOPOGRAPHE"
  | "BUREAU_CONTROLE" | "LABORATOIRE" | "ENTREPRISE" | "SOUS_TRAITANT" | "COORDINATEUR_SPS"
  | "ADMINISTRATION" | "NOTAIRE" | "ADMIN_CITURBAREA";

/** Conditions d'application (toutes facultatives ; absentes = toujours). */
export interface Conditions {
  types?: ("VILLA" | "MAISON" | "IMMEUBLE" | "MIXTE" | "ERP" | "LOTISSEMENT")[];
  zoneSismiqueMin?: number;      // zones RPS 0 à 4 (à confirmer selon RPS 2011)
  sousSol?: boolean;
  hauteurMinM?: number;
  erp?: boolean;
  ascenseur?: boolean;
  piscine?: boolean;
}

/** Une exigence = une chose à respecter, reformulée, rattachée à ses textes. */
export interface Exigence {
  id: string;                    // ex. "EX.FON.ENROBAGE"
  normes: string[];              // ids de Norme
  /** Référence fine dans le texte (article, paragraphe, tableau) si connue. */
  reference?: string;
  /** Reformulation dans nos mots — JAMAIS une citation. */
  texte: string;
  moment: Moment;
  criticite: Criticite;
  /** Comment on vérifie et ce qui le prouve. */
  verification: { methode: string; preuves: Preuve[]; responsable: Role };
  conditions?: Conditions;
  verifie: boolean;
}

/** Point de checklist affiché dans le jalon (coché avec preuve). */
export interface PointChecklist {
  id: string;
  texte: string;
  moment: Moment;
  exigence?: string;             // id d'Exigence
  preuves?: Preuve[];
  responsable: Role;
}

export interface ChampModele {
  id: string;
  libelle: string;
  type: "texte" | "texte_long" | "nombre" | "date" | "case" | "choix" | "signature" | "photo" | "tableau";
  options?: string[];
  colonnes?: string[];           // pour "tableau"
  obligatoire?: boolean;
  aide?: string;
}

/** PV type ou document type à remplir (puis imprimer / PDF dans l'espace projet). */
export interface ModeleDocument {
  id: string;                    // ex. "PV_RECEPTION_FONDS_FOUILLES"
  titre: string;
  nature: "PV" | "FICHE_TECHNIQUE" | "FORMULAIRE" | "ATTESTATION" | "COURRIER" | "CHECKLIST";
  objet: string;
  sections: { titre: string; champs: ChampModele[] }[];
  signataires: Role[];
  mentions?: string[];           // mentions finales (réserves, diffusion…)
}

export interface Jalon {
  /** Code stable hiérarchique : <PHASE>.<LOT?>.<NN>, ex. "84_FONDATIONS.FON.03". */
  code: string;
  phase: string;                 // code phases.catalog
  lot?: string;                  // code chiffrage/lots.ts
  ordre: number;
  titre: string;
  objectif: string;
  prerequis?: string[];          // codes de jalons
  conditions?: Conditions;
  acteurs: Role[];
  validateurs: Role[];
  exigences: string[];           // ids d'Exigence
  checklist: PointChecklist[];
  documents: string[];           // ids de ModeleDocument à produire / fournir
  /** Bloque le jalon suivant tant qu'il n'est pas validé. */
  pointArret?: boolean;
}

/** Un fichier de données du référentiel (un par domaine). */
export interface FichierReferentiel {
  domaine: string;
  version: string;
  majLe: string;
  auteur: string;
  normes: Norme[];
  exigences: Exigence[];
  modeles: ModeleDocument[];
  jalons: Jalon[];
}
