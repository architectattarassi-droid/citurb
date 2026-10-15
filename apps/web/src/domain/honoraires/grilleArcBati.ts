/**
 * Grille ARC-BATI ARCHITECTURE — données de départ (spec §1.6, §3, §4).
 *
 * Versionnée : un devis émis fige `grilleVersionId` ; une nouvelle grille est
 * une nouvelle constante (jamais une modification de celle-ci).
 *
 * Les descriptifs sont une première rédaction à relire par le cabinet.
 * Les forfaits administratifs sans prix connu (§3.2) ont `valeur: null` :
 * ils s'affichent « Sur devis » tant que le cabinet ne les a pas tarifés.
 */
import { P1_COUT_M2 } from "../prix/grille2026";
import type { DomaineValidite, GrilleTarifaire } from "./types";

/** Domaine de calibrage des forfaits « * » (§1.6) — seuils à confirmer (§10, point 3). */
export const DOMAINE_MAISON: DomaineValidite = {
  typologies: ["MAISON_INDIVIDUELLE"],
  surfacePlancherMax: "400",
  niveauxMax: 3,
  sousSol: false,
};

export const MENTION_PLAN_TYPE = "Plan type 2D, sans variante, sans 3D et sans modification après validation";

export const GRILLE_ARC_BATI_2026_10: GrilleTarifaire = {
  id: "arc-bati-2026-10",
  cabinetId: "cab_arc_bati",
  version: "2026-10",
  dateEffet: "2026-10-14",
  tauxHonoraires: "5",
  puFondations: "600",
  puElevationParTypologie: {
    // Maison : niveau « économique » de la grille unique (= 2 500, devis Ouazzane).
    MAISON_INDIVIDUELLE: String(P1_COUT_M2.ECONOMIQUE),
    // Immeuble : PU observé sur le devis Casablanca (absent de la grille unique).
    IMMEUBLE: "3000",
    VILLA: String(P1_COUT_M2.STANDING),
  },
  prestations: [
    // ── Honoraires d'architecte (assiette : 5 % du coût prévisionnel) ──
    {
      code: "HON_CONCEPTION", famille: "HONORAIRES",
      libelle: "Plan personnalisé — 3 variantes + rendus 3D + modifications jusqu'à version finale",
      descriptif: "Conception sur mesure : trois variantes de plan, rendus 3D extérieurs, modifications jusqu'à la version finale validée par le maître d'ouvrage.",
      modeTarification: "POURCENTAGE_HONORAIRES", valeur: "40", caractere: "FACULTATIVE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "HON_AUTORISATION", famille: "HONORAIRES",
      libelle: "Dépôt et suivi de l'autorisation de construire",
      descriptif: "Constitution du dossier, dépôt auprès de la Commune de {commune} et suivi jusqu'à la décision.",
      modeTarification: "POURCENTAGE_HONORAIRES", valeur: "30", caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "HON_CHANTIER", famille: "HONORAIRES",
      libelle: "Suivi de chantier et permis d'habiter",
      descriptif: "Visites de chantier aux étapes clés, procès-verbaux, et constitution du dossier de permis d'habiter.",
      modeTarification: "POURCENTAGE_HONORAIRES", valeur: "30", caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "HON_DECO", famille: "HONORAIRES",
      libelle: "Décoration et aménagement intérieur",
      descriptif: "Mission complémentaire, s'ajoute aux 100 % des honoraires de base.",
      modeTarification: "POURCENTAGE_HONORAIRES", valeur: "30", caractere: "FACULTATIVE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    // ── Prestations hors honoraires ──
    {
      code: "BA", famille: "HORS_HONORAIRES",
      libelle: "Plans de béton armé et note de calcul",
      descriptif: "Établis par un bureau d'études techniques.",
      modeTarification: "FORFAIT", valeur: "2000", caractere: "OBLIGATOIRE", intervenant: "BUREAU_ETUDES", horsHonoraires: true, actif: true,
      domaineValidite: DOMAINE_MAISON,
    },
    {
      code: "GEOTECH", famille: "HORS_HONORAIRES",
      libelle: "Étude géotechnique",
      descriptif: "Réalisée par un laboratoire agréé.",
      modeTarification: "FORFAIT", valeur: "6000", caractere: "RECOMMANDEE", intervenant: "LABORATOIRE", horsHonoraires: true, actif: true,
      domaineValidite: DOMAINE_MAISON,
    },
    {
      code: "TOPO", famille: "HORS_HONORAIRES",
      libelle: "Plan topographique",
      descriptif: "Établi par un géomètre topographe.",
      modeTarification: "FORFAIT", valeur: "2500", caractere: "SUR_DEMANDE", intervenant: "GEOMETRE", horsHonoraires: true, actif: true,
      domaineValidite: DOMAINE_MAISON,
    },
    {
      code: "CTRL_BET", famille: "HORS_HONORAIRES",
      libelle: "Contrôle technique de chantier",
      descriptif: "Une visite aux fondations puis une visite par dalle.",
      modeTarification: "UNITAIRE", valeur: "500", unite: "VISITE", caractere: "OBLIGATOIRE", intervenant: "BUREAU_ETUDES", horsHonoraires: true, actif: true,
    },
    {
      code: "3D_INT", famille: "HORS_HONORAIRES",
      libelle: "3D intérieure et décoration",
      descriptif: "Par étage, jusqu'à 5 pièces habitables.",
      modeTarification: "UNITAIRE", valeur: "20000", unite: "ETAGE", caractere: "SUR_DEMANDE", intervenant: "ARCHITECTE", horsHonoraires: true, actif: true,
    },
    // ── Forfaits administratifs (§3.2) ──
    {
      code: "DEPOT_RENOUV", famille: "FORFAIT_ADMINISTRATIF",
      libelle: "Dépôt et obtention d'une nouvelle décision d'autorisation",
      descriptif: "Autorisation expirée : constitution et dépôt du dossier auprès de la Commune de {commune}, suivi jusqu'à l'obtention de la nouvelle décision.",
      modeTarification: "FORFAIT", valeur: "5000", caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "PERMIS_HABITER", famille: "FORFAIT_ADMINISTRATIF",
      libelle: "Demande de permis d'habiter (total ou partiel)",
      descriptif: "Constitution et dépôt de la demande auprès de la Commune de {commune}.",
      modeTarification: "FORFAIT", valeur: null, caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "MODIFICATIF", famille: "FORFAIT_ADMINISTRATIF",
      libelle: "Modificatif de plans sur projet autorisé",
      descriptif: "Mission distincte : toute modification par rapport à l'autorisation initiale (dépôt auprès de la Commune de {commune}).",
      modeTarification: "FORFAIT", valeur: null, caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "ATTESTATION_CONFORMITE", famille: "FORFAIT_ADMINISTRATIF",
      libelle: "Attestation de conformité",
      descriptif: "Visite de constat et établissement de l'attestation.",
      modeTarification: "FORFAIT", valeur: null, caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
    {
      code: "REGULARISATION", famille: "FORFAIT_ADMINISTRATIF",
      libelle: "Régularisation",
      descriptif: "Dossier de régularisation déposé auprès de la Commune de {commune}.",
      modeTarification: "FORFAIT", valeur: null, caractere: "OBLIGATOIRE", intervenant: "ARCHITECTE", horsHonoraires: false, actif: true,
    },
  ],
  packs: [
    { code: "ESSENTIEL", libelle: "Essentiel", prestations: ["HON_AUTORISATION", "HON_CHANTIER"], mentionRestrictive: MENTION_PLAN_TYPE },
    { code: "PERSONNALISE", libelle: "Personnalisé", prestations: ["HON_AUTORISATION", "HON_CHANTIER", "HON_CONCEPTION"] },
    { code: "PREMIUM", libelle: "Premium", prestations: ["HON_AUTORISATION", "HON_CHANTIER", "HON_CONCEPTION", "HON_DECO"] },
  ],
};

export const GRILLES: Record<string, GrilleTarifaire> = { [GRILLE_ARC_BATI_2026_10.id]: GRILLE_ARC_BATI_2026_10 };
