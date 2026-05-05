/**
 * Registry P6 — Classes, catégories d'agrément et types de prestataires
 *
 * Sources réglementaires:
 *  - Décret n° 2-94-223 (Maroc) — qualification & classification entreprises BTP
 *  - Ministère de l'Équipement, Transport, Logistique et Eau (METLE)
 *  - Ordre National des Architectes (CNOA)
 *  - Ordre des Ingénieurs / Géomètres-topographes
 */

// ─── Type principal P6 ────────────────────────────────────────────────
export type P6Type = "PRESTATAIRE_SERVICE" | "FOURNISSEUR_MATERIAUX";

export const P6_TYPES = [
  {
    code: "PRESTATAIRE_SERVICE" as const,
    label: "Entreprise prestataire de services",
    desc: "Entreprise BTP, BET, BC, géomètre, expert, agence, etc.",
    fields: ["agrement", "classe", "categorie", "specialites", "references", "decennale"],
  },
  {
    code: "FOURNISSEUR_MATERIAUX" as const,
    label: "Fournisseur de matériaux",
    desc: "Carreleur, briquetier, étanchéité, sanitaire, électrique… Fiche réactive avec catalogue prix.",
    fields: ["catalogueMaateriaux", "zoneFourniture", "prixLivraison", "delaisLivraison", "minLivraison"],
  },
];

// ─── Classes BTP (Décret 2-94-223 Maroc) ───────────────────────────────
export type ClasseBTP = "1" | "2" | "3" | "4" | "5" | "6" | "7";

export const CLASSES_BTP = [
  { code: "1" as ClasseBTP, label: "Classe 1", caRange: "> 50 000 000 DH", level: "Très grand" },
  { code: "2" as ClasseBTP, label: "Classe 2", caRange: "30 000 000 – 50 000 000 DH", level: "Grand" },
  { code: "3" as ClasseBTP, label: "Classe 3", caRange: "15 000 000 – 30 000 000 DH", level: "Moyen-grand" },
  { code: "4" as ClasseBTP, label: "Classe 4", caRange: "7 000 000 – 15 000 000 DH", level: "Moyen" },
  { code: "5" as ClasseBTP, label: "Classe 5", caRange: "3 000 000 – 7 000 000 DH", level: "Petit-moyen" },
  { code: "6" as ClasseBTP, label: "Classe 6", caRange: "1 000 000 – 3 000 000 DH", level: "Petit" },
  { code: "7" as ClasseBTP, label: "Classe 7", caRange: "< 1 000 000 DH", level: "Très petit" },
];

// ─── Catégories d'agrément METLE ──────────────────────────────────────
export type CategorieAgrement = "A" | "B" | "C" | "D" | "E";

export const CATEGORIES_AGREMENT = [
  { code: "A" as CategorieAgrement, label: "A — Bâtiments", desc: "Construction et réhabilitation de bâtiments", subTypes: ["A.1 Gros œuvre", "A.2 Second œuvre", "A.3 Bâtiments tous corps d'état"] },
  { code: "B" as CategorieAgrement, label: "B — Travaux Publics", desc: "Routes, ponts, ouvrages d'art, terrassement", subTypes: ["B.1 Routes & autoroutes", "B.2 Ouvrages d'art", "B.3 Terrassement & VRD"] },
  { code: "C" as CategorieAgrement, label: "C — Spécialités techniques", desc: "Lots techniques (élec, plomberie, étanchéité, etc.)", subTypes: ["C.1 Électricité CF/CFa", "C.2 Plomberie sanitaire", "C.3 CVC", "C.4 Étanchéité", "C.5 Ascenseurs", "C.6 Sécurité incendie", "C.7 Photovoltaïque"] },
  { code: "D" as CategorieAgrement, label: "D — Études techniques (BET)", desc: "Bureaux d'études — calculs structure, fluides, thermique", subTypes: ["D.1 BET structure", "D.2 BET fluides", "D.3 BET thermique RT2020", "D.4 BET acoustique"] },
  { code: "E" as CategorieAgrement, label: "E — Contrôle technique (BC)", desc: "Bureaux de contrôle — visa technique, inspection", subTypes: ["E.1 BC bâtiment", "E.2 BC ouvrages d'art", "E.3 BC ascenseurs"] },
];

// ─── Spécialités prestataires (services hors BTP standard) ────────────
export const SPECIALITES_PRESTATAIRE = [
  { code: "ARCHITECTE", label: "Architecte conseil", agrementType: "CNOA" },
  { code: "INGENIEUR", label: "Ingénieur conseil (BET indépendant)", agrementType: "OIM" },
  { code: "GEOMETRE", label: "Géomètre-topographe", agrementType: "ONIGT" },
  { code: "EXPERT_IMMOBILIER", label: "Expert immobilier", agrementType: "ONEC ou indépendant" },
  { code: "EXPERT_JUDICIAIRE", label: "Expert judiciaire (CESTA)", agrementType: "Ministère Justice" },
  { code: "ECONOMISTE_CONSTRUCTION", label: "Économiste de la construction", agrementType: "—" },
  { code: "PAYSAGISTE", label: "Paysagiste / Architecte paysagiste", agrementType: "—" },
  { code: "DECORATEUR", label: "Architecte d'intérieur / Décorateur", agrementType: "CNOA si architecte" },
];

// ─── États de validation P6 (workflow scoring) ────────────────────────
export type P6ValidationStatus =
  | "DRAFT"            // fiche en cours de remplissage
  | "PENDING_REVIEW"   // soumise, en attente review admin
  | "NEEDS_DOCS"       // documents manquants demandés
  | "VERIFIED"         // validée, accessible aux dossiers
  | "BLACKLISTED"      // bannie suite à incident
  | "EXPIRED";         // validation expirée (> 12 mois sans renouvellement)

export const P6_STATUS_LABELS: Record<P6ValidationStatus, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "#6b7280" },
  PENDING_REVIEW: { label: "En attente de validation", color: "#f59e0b" },
  NEEDS_DOCS: { label: "Documents manquants", color: "#ef4444" },
  VERIFIED: { label: "Validé ✓", color: "#10b981" },
  BLACKLISTED: { label: "Liste noire", color: "#dc2626" },
  EXPIRED: { label: "Validation expirée", color: "#94a3b8" },
};

// ─── Documents requis par type ────────────────────────────────────────
export const DOCUMENTS_REQUIS_PRESTATAIRE = [
  { slug: "cin_gerant", label: "CIN du gérant / représentant légal", obligatoire: true },
  { slug: "rc", label: "Registre du commerce (RC)", obligatoire: true },
  { slug: "ice", label: "ICE (Identifiant Commun de l'Entreprise)", obligatoire: true },
  { slug: "patente", label: "Patente", obligatoire: true },
  { slug: "cnss_attestation", label: "Attestation CNSS", obligatoire: true },
  { slug: "fiscal_attestation", label: "Attestation fiscale", obligatoire: true },
  { slug: "rib", label: "RIB bancaire (pour escrow)", obligatoire: true },
  { slug: "agrement_metle", label: "Certificat de qualification & classification (METLE)", obligatoire: false, notes: "Si applicable selon catégorie d'activité" },
  { slug: "ordre_national", label: "Inscription Ordre national (architecte/ingénieur/géomètre)", obligatoire: false, notes: "Si profession ordinale" },
  { slug: "decennale", label: "Police d'assurance décennale en cours", obligatoire: true },
  { slug: "rc_pro", label: "Police de Responsabilité Civile professionnelle", obligatoire: true },
  { slug: "references", label: "Liste de 3+ références chantiers passés (5 dernières années)", obligatoire: true },
  { slug: "photos_chantiers", label: "Photos de chantiers terminés (5+ photos)", obligatoire: false },
];

export const DOCUMENTS_REQUIS_FOURNISSEUR = [
  { slug: "cin_gerant", label: "CIN du gérant / représentant légal", obligatoire: true },
  { slug: "rc", label: "Registre du commerce (RC)", obligatoire: true },
  { slug: "ice", label: "ICE", obligatoire: true },
  { slug: "patente", label: "Patente", obligatoire: true },
  { slug: "fiscal_attestation", label: "Attestation fiscale", obligatoire: true },
  { slug: "rib", label: "RIB bancaire", obligatoire: true },
  { slug: "fiches_techniques", label: "Fiches techniques des matériaux fournis", obligatoire: true },
  { slug: "certifications_qualite", label: "Certifications qualité (ISO, NM, CE…)", obligatoire: false },
];
