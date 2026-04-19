"use strict";
// Tome 3 — Tunnels
// P1 — Parcours complet (doctrine -> exécution)
// NOTE: on garde le contenu maximal; les IDs sont volontairement string pour éviter que des alias/variantes
// (issus d’itérations) cassent la compilation. Le canon des IDs est maintenu via P1_PHASE_IDS_CANON.
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1_PHASES = exports.P1_PHASE_IDS_CANON = exports.P1_TUNNEL_VERSION = void 0;
exports.P1_TUNNEL_VERSION = "2026-02-15.v1.3";
// Canon (IDs stables recommandés)
exports.P1_PHASE_IDS_CANON = [
    "P1_PH_CREATE_DOSSIER",
    "P1_PH_OFFER_SELECT",
    "P1_PH_ESQUISSE",
    "P1_PH_MOA_VALIDATE",
    "P1_PH_AUTH_PLAN",
    "P1_PH_AUTH_DEPOSIT",
    "P1_PH_COMMISSION",
    "P1_PH_COMMISSION_RESULT",
    "P1_PH_COMMISSION_REMARKS",
    "P1_PH_AUTH_SIGN",
    "P1_PH_OPEN_SITE",
    "P1_PH_SITE_MONITORING",
    "P1_PH_PROVISIONAL_RECEPTION",
    "P1_PH_FINAL_RECEPTION",
    "P1_PH_PERMIS_HABITER",
    "P1_PH_ARCHIVE",
    // upsells majeurs
    "P1_PH_TOPO",
    "P1_PH_GEO_TECH",
    "P1_PH_STRUCT_ENGINEERING",
    "P1_PH_EXECUTION_DOSSIER",
    "P1_PH_CPS",
    "P1_PH_COMPANY_SELECTION",
    "P1_PH_BIM_IFC_COLLAB",
    "P1_PH_DECOR_INTERIOR",
    "P1_PH_MATERIALS_ORDER",
    "P1_PH_BANKING_FILE",
];
exports.P1_PHASES = [
    {
        id: "P1_PH_CREATE_DOSSIER",
        label: "Création dossier",
        description: "Création du dossier P1 + geo_id + lotissement/cahier des charges si disponible.",
    },
    {
        id: "P1_PH_OFFER_SELECT",
        label: "Choix de l’offre",
        description: "Choisir l’offre: (A) Plan type + suivi photos chantier / (B) Plan personnalisé + suivi photos / (C) Plan personnalisé + suivi chantier personnalisé. Paiement = déclencheur (T1).",
    },
    {
        id: "P1_PH_ESQUISSE",
        label: "Esquisse",
        description: "Esquisse (plan type ou personnalisé) générée sous contraintes du cahier des charges / lotissement si renseigné.",
        unlockBy: { entitlement: "PLAN_P1" },
    },
    {
        id: "P1_PH_MOA_VALIDATE",
        label: "Validation MOA",
        description: "Validation MOA (et/ou cycles de modification selon pack commandé).",
    },
    {
        id: "P1_PH_AUTH_PLAN",
        label: "Version autorisation",
        description: "Production du plan autorisation (pièces réglementaires), prêt dépôt.",
        unlockBy: { entitlement: "AUTH_DOSSIER_P1" },
    },
    {
        id: "P1_PH_AUTH_DEPOSIT",
        label: "Dépôt autorisation",
        description: "Dépôt autorisation + tracking + journal probatoire.",
        unlockBy: { state: "E8" },
    },
    {
        id: "P1_PH_COMMISSION",
        label: "Commission",
        description: "Passage commission / suivi / délais surveillés (PMS).",
    },
    {
        id: "P1_PH_COMMISSION_RESULT",
        label: "Résultat commission",
        description: "Avis favorable/défavorable. En cas défavorable: itérations corrections jusqu’à 3 passages (au-delà: escalade MOA / avenant).",
    },
    {
        id: "P1_PH_COMMISSION_REMARKS",
        label: "Remarques commission",
        description: "Intégration des remarques (coupes, encorbellements, surfaces min, etc.) et régénération contrôlée.",
        unlockBy: { entitlement: "CYCLE_EXTRA" },
    },
    {
        id: "P1_PH_AUTH_SIGN",
        label: "Signature autorisation",
        description: "Signature autorisation (Barid e-sign/Rokhas) + archivage probatoire.",
    },
    {
        id: "P1_PH_OPEN_SITE",
        label: "Ouverture chantier",
        description: "Ouverture chantier + jalons: fondations, dalles, toiture.",
    },
    {
        id: "P1_PH_SITE_MONITORING",
        label: "Suivi chantier",
        description: "Suivi chantier (photos, PV, contrôles). Chaque passage = événement probatoire. Options selon pack.",
        unlockBy: { entitlement: "SITE_MONITORING" },
    },
    {
        id: "P1_PH_PROVISIONAL_RECEPTION",
        label: "Réception provisoire",
        description: "PV réception provisoire.",
    },
    {
        id: "P1_PH_FINAL_RECEPTION",
        label: "Réception définitive",
        description: "PV réception définitive.",
    },
    {
        id: "P1_PH_PERMIS_HABITER",
        label: "Permis d’habiter",
        description: "Dossier permis d’habiter + dépôt.",
    },
    {
        id: "P1_PH_ARCHIVE",
        label: "Archivage",
        description: "Dossier archivé (append-only) + scellés (hash).",
    },
    // Upsells / modules complémentaires (débloqués par paiement)
    {
        id: "P1_PH_TOPO",
        label: "Implantation topographe",
        description: "Implantation topographique + PV.",
        unlockBy: { entitlement: "TOPO" },
    },
    {
        id: "P1_PH_GEO_TECH",
        label: "Rapport géotechnique",
        description: "Étude géotechnique + recommandations.",
        unlockBy: { entitlement: "GEOTECH" },
    },
    {
        id: "P1_PH_STRUCT_ENGINEERING",
        label: "Béton armé",
        description: "Plan béton armé (BET) + contrôle.",
        unlockBy: { entitlement: "STRUCT" },
    },
    {
        id: "P1_PH_EXECUTION_DOSSIER",
        label: "Dossier d’exécution",
        description: "Dossier d’exécution + détails + plans d’atelier si requis.",
        unlockBy: { entitlement: "EXEC_DOSSIER" },
    },
    {
        id: "P1_PH_CPS",
        label: "Cahier des prescriptions spéciales",
        description: "CPS / CCTP selon besoin.",
        unlockBy: { entitlement: "CPS" },
    },
    {
        id: "P1_PH_COMPANY_SELECTION",
        label: "Choix entreprise",
        description: "Choisir une entreprise CITURBAREA ou intégrer votre entreprise dans le processus (contrats, planning, PV).",
        unlockBy: { entitlement: "COMPANY" },
    },
    {
        id: "P1_PH_BIM_IFC_COLLAB",
        label: "BIM IFC & échanges",
        description: "Process BIM (IFC) + échanges + audit (clash report).",
        unlockBy: { entitlement: "BIM" },
    },
    {
        id: "P1_PH_DECOR_INTERIOR",
        label: "Décoration & design intérieur",
        description: "Décoration & design intérieur: moodboards, variantes matériaux, validations.",
        unlockBy: { entitlement: "DECOR" },
    },
    {
        id: "P1_PH_MATERIALS_ORDER",
        label: "Commande matériaux via CITURBAREA",
        description: "Commande matériaux via CITURBAREA + marge + traçabilité + livraison.",
        unlockBy: { entitlement: "MATERIALS" },
    },
    {
        id: "P1_PH_BANKING_FILE",
        label: "Dossier bancaire",
        description: "Dossier bancaire prêt à déposer (après plan type/personnalisé) + courtier technique + banques partenaires + marge CITURBAREA.",
        unlockBy: { entitlement: "BANK" },
    },
    // Variantes/alias historiques (conservées sans casser le canon)
    {
        id: "P1_PH_EXEC_DOSSIER",
        label: "Dossier d’exécution (alias)",
        description: "Alias historique de P1_PH_EXECUTION_DOSSIER.",
        aliasOf: "P1_PH_EXECUTION_DOSSIER",
    },
    {
        id: "P1_PH_SELECT_COMPANY",
        label: "Choix entreprise (alias)",
        description: "Alias historique de P1_PH_COMPANY_SELECTION.",
        aliasOf: "P1_PH_COMPANY_SELECTION",
    },
];
