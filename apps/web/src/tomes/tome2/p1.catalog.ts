/**
 * Tome 2 — Portes
 * P1 (Particulier) — Catalogue offres
 * Doctrine: l'offre est une configuration déclarative, non une logique cachée.
 * Toute activation réelle passe par entitlements (Tome 1) + state machine (Tome 3).
 */

export type P1OfferId = "P1_O1" | "P1_O2" | "P1_O3";

export type P1UpsellId =
  | "UPS_PHOTO_VISITS"
  | "UPS_SITE_VISITS_CUSTOM"
  | "UPS_FINANCING_PREQUAL"
  | "UPS_FINANCING_DOSSIER"
  | "UPS_EXECUTION_DOSSIER"
  | "UPS_CPS"
  | "UPS_COMPANY_SELECTION"
  | "UPS_BIM_IFC_COLLAB"
  | "UPS_DECOR_INTERIOR"
  | "UPS_MATERIALS_ORDER"
  | "UPS_TOPO_IMPLANTATION"
  | "UPS_GEOTECH_REPORT"
  | "UPS_RC_SLAB"
  | "UPS_ROOF_SLAB"
  | "UPS_RC_STRUCTURAL_PLAN";

export type P1Offer = {
  id: P1OfferId;
  title: string;
  summary: string;
  includes: string[];
  excludes: string[];
  entitlementTypes: string[]; // mapping Tome1 Entitlement.type
};

export type P1Upsell = {
  id: P1UpsellId;
  title: string;
  summary: string;
  entitlementType: string;
};

// Web mirror — source: apps/api/src/tomes/tome-2/doors/p1.catalog.ts
export const P1_CATALOG_VERSION = "2026-02-15" as const;

export const P1_OFFERS: P1Offer[] = [
  {
    id: "P1_O1",
    title: "Plan type + suivi chantier photos",
    summary:
      "Pack d'entrée : plan type conforme + suivi photo/visites selon quota (preuves probatoires).",
    includes: [
      "Esquisse (plan type)",
      "Version autorisation",
      "Dépôt autorisation + passage commission (pilotage)",
      "Remarques commission : jusqu'à 3 itérations (au-delà → escalade MOA)",
      "Suivi chantier (photos) selon quota pack",
      "Archivage dossier",
    ],
    excludes: [
      "Plan personnalisé complet (sur-mesure)",
      "Suivi chantier personnalisé illimité",
      "Plan béton armé (UPS)",
      "Implantation topographe (UPS)",
      "Rapport géotechnique (UPS)",
    ],
    entitlementTypes: ["PLAN_TYPE", "DOSSIER_AUTORISATION"],
  },
  {
    id: "P1_O2",
    title: "Plan personnalisé + suivi photo",
    summary:
      "Pack standard : plan sur-mesure + cycles de révision inclus + suivi photo renforcé.",
    includes: [
      "Esquisse (plan personnalisé)",
      "Révisions incluses (C1/C2 selon scope)",
      "Version autorisation",
      "Dépôt autorisation + passage commission",
      "Remarques commission : jusqu'à 3 itérations",
      "Suivi chantier (photos) selon quota pack",
      "Archivage dossier",
    ],
    excludes: [
      "Suivi chantier personnalisé (visites & PV détaillés) (Pack O3)",
      "Plan béton armé (UPS)",
    ],
    entitlementTypes: ["PLAN_PERSO", "DOSSIER_AUTORISATION"],
  },
  {
    id: "P1_O3",
    title: "Plan personnalisé + suivi chantier personnalisé",
    summary:
      "Pack premium : plan sur-mesure + suivi chantier structuré (visites, PV, jalons).",
    includes: [
      "Esquisse (plan personnalisé)",
      "Révisions incluses (C1/C2 selon scope)",
      "Version autorisation",
      "Dépôt autorisation + passage commission",
      "Remarques commission : jusqu'à 3 itérations",
      "Ouverture chantier + jalons réception (dalles, toiture)",
      "Suivi chantier personnalisé (visites + PV probatoires)",
      "Réception provisoire + réception définitive",
      "Permis d'habiter (pilotage dossier)",
      "Archivage dossier",
    ],
    excludes: ["Plan béton armé (UPS)", "Rapport géotechnique (UPS)", "Topo (UPS)"],
    entitlementTypes: ["PLAN_PERSO", "DOSSIER_AUTORISATION", "SUIVI_CHANTIER_PREMIUM"],
  },
];

export const P1_UPSELLS: P1Upsell[] = [
  {
    id: "UPS_PHOTO_VISITS",
    title: "Suivi photos (pack visites)",
    summary: "Ajout de visites + album photos horodaté.",
    entitlementType: "SUIVI_PHOTOS",
  },
  {
    id: "UPS_SITE_VISITS_CUSTOM",
    title: "Suivi chantier personnalisé (visites)",
    summary: "Visites supplémentaires + PV + checklists.",
    entitlementType: "SUIVI_CHANTIER_EXTRA",
  },
  {
    id: "UPS_FINANCING_PREQUAL",
    title: "Pré-qualification crédit",
    summary:
      "Collecte guidée + pré-score pour lancer un financement (après 1er plan).",
    entitlementType: "FINANCING_PREQUAL",
  },
  {
    id: "UPS_FINANCING_DOSSIER",
    title: "Dossier bancaire prêt à déposer (banques partenaires)",
    summary:
      "Génération du dossier bancaire + pack pièces (stockage privé) + transmission partenaire.",
    entitlementType: "FINANCING_DOSSIER",
  },
  {
    id: "UPS_EXECUTION_DOSSIER",
    title: "Dossier d’exécution",
    summary: "Plans exécution détaillés (au-delà autorisation).",
    entitlementType: "EXECUTION_DOSSIER",
  },
  {
    id: "UPS_CPS",
    title: "Cahier des Prescriptions Spéciales (CPS)",
    summary: "CPS pour cadrer entreprise/lots.",
    entitlementType: "CPS",
  },
  {
    id: "UPS_COMPANY_SELECTION",
    title: "Choisir une entreprise / intégrer votre entreprise",
    summary:
      "Shortlist entreprises, comparaison devis, intégration entreprise client, contrat via CITURBAREA.",
    entitlementType: "COMPANY_SELECTION",
  },
  {
    id: "UPS_BIM_IFC_COLLAB",
    title: "BIM/IFC — échanges & coordination",
    summary:
      "Process IFC, versions, checks, journal d'échanges (features débloquées par paiements).",
    entitlementType: "BIM_IFC_COLLAB",
  },
  {
    id: "UPS_DECOR_INTERIOR",
    title: "Décoration intérieure",
    summary: "Pack design intérieur + choix finitions.",
    entitlementType: "DECOR_INTERIOR",
  },
  {
    id: "UPS_MATERIALS_ORDER",
    title: "Commande matériaux via CITURBAREA",
    summary: "Commande & suivi matériaux (via partenaires) + preuves probatoires.",
    entitlementType: "MATERIALS_ORDER",
  },
  {
    id: "UPS_TOPO_IMPLANTATION",
    title: "Implantation topographe",
    summary: "Commande et intégration du plan d'implantation.",
    entitlementType: "TOPO_IMPLANTATION",
  },
  {
    id: "UPS_GEOTECH_REPORT",
    title: "Rapport géotechnique",
    summary: "Commande et archivage du rapport géotechnique.",
    entitlementType: "GEOTECH_REPORT",
  },
  {
    id: "UPS_RC_STRUCTURAL_PLAN",
    title: "Plan béton armé",
    summary: "Commande/production plan structure (BA) et intégration.",
    entitlementType: "PLAN_BETON_ARME",
  },
  {
    id: "UPS_RC_SLAB",
    title: "Réception dalle",
    summary: "Jalon + PV réception dalle (RDC/étages selon projet).",
    entitlementType: "JALON_RECEPTION_DALLE",
  },
  {
    id: "UPS_ROOF_SLAB",
    title: "Réception toiture",
    summary: "Jalon + PV réception toiture.",
    entitlementType: "JALON_RECEPTION_TOITURE",
  },
];
