/**
 * Sous-Traitants — Types (Tome 3 / P3 — MOD délégué)
 *
 * Module : assigner, suivre, contracter, évaluer et payer chaque sous-traitant
 * par lot dans le cadre d'une opération de Maîtrise d'Ouvrage Déléguée.
 *
 * Conformité : loi marocaine 32-99 sur la sous-traitance dans le BTP
 *   (articles 2 à 13 : déclaration, contrat écrit, agrément, paiement direct).
 *
 * Persistance MVP : JSON in Dossier.payload.sousTraitants (cf. INTEGRATION.md
 * pour la migration Prisma future).
 */

export const ST_PAYLOAD_KEY = "sousTraitants";

export type SousTraitantStatus =
  | "PROPOSED" // assigné, pas encore contracté
  | "CONTRACTED" // contrat signé
  | "IN_PROGRESS" // travaux en cours, situations en flux
  | "COMPLETED" // travaux terminés, évaluation prête
  | "TERMINATED"; // résilié / sortie anticipée

/** Lots TPHI 1-25 (référentiel marocain consolidé RGC + FFB). */
export type LotCode =
  | "LOT-01-TERRASSEMENT"
  | "LOT-02-FONDATIONS"
  | "LOT-03-GROS-OEUVRE-BETON"
  | "LOT-04-CHARPENTE"
  | "LOT-05-COUVERTURE"
  | "LOT-06-ETANCHEITE"
  | "LOT-07-FACADE-RAVALEMENT"
  | "LOT-08-CLOISONS-PLATRERIE"
  | "LOT-09-MENUISERIE-EXT"
  | "LOT-10-MENUISERIE-INT"
  | "LOT-11-PLOMBERIE-SANITAIRE"
  | "LOT-12-ELECTRICITE-CFO"
  | "LOT-13-ELECTRICITE-CFA"
  | "LOT-14-CVC-CLIM"
  | "LOT-15-ASCENSEURS"
  | "LOT-16-ISOLATION"
  | "LOT-17-CARRELAGE-FAIENCE"
  | "LOT-18-REVETEMENT-SOL"
  | "LOT-19-MARBRERIE"
  | "LOT-20-PEINTURE"
  | "LOT-21-FAUX-PLAFOND"
  | "LOT-22-MENUISERIE-METAL"
  | "LOT-23-VRD-AMENAGEMENT"
  | "LOT-24-ESPACES-VERTS"
  | "LOT-25-EQUIPEMENTS-SPECIFIQUES";

export type LotCatalogEntry = {
  code: LotCode;
  intitule: string;
  numero: number;
  agrementRequis?: boolean;
};

export const LOTS_TPHI: LotCatalogEntry[] = [
  { code: "LOT-01-TERRASSEMENT", intitule: "Terrassement / Excavation", numero: 1 },
  { code: "LOT-02-FONDATIONS", intitule: "Fondations", numero: 2, agrementRequis: true },
  { code: "LOT-03-GROS-OEUVRE-BETON", intitule: "Gros œuvre béton armé", numero: 3, agrementRequis: true },
  { code: "LOT-04-CHARPENTE", intitule: "Charpente", numero: 4, agrementRequis: true },
  { code: "LOT-05-COUVERTURE", intitule: "Couverture", numero: 5 },
  { code: "LOT-06-ETANCHEITE", intitule: "Étanchéité", numero: 6, agrementRequis: true },
  { code: "LOT-07-FACADE-RAVALEMENT", intitule: "Façade / Ravalement", numero: 7 },
  { code: "LOT-08-CLOISONS-PLATRERIE", intitule: "Cloisons / Plâtrerie", numero: 8 },
  { code: "LOT-09-MENUISERIE-EXT", intitule: "Menuiserie extérieure", numero: 9 },
  { code: "LOT-10-MENUISERIE-INT", intitule: "Menuiserie intérieure", numero: 10 },
  { code: "LOT-11-PLOMBERIE-SANITAIRE", intitule: "Plomberie sanitaire", numero: 11, agrementRequis: true },
  { code: "LOT-12-ELECTRICITE-CFO", intitule: "Électricité courant fort", numero: 12, agrementRequis: true },
  { code: "LOT-13-ELECTRICITE-CFA", intitule: "Électricité courant faible", numero: 13 },
  { code: "LOT-14-CVC-CLIM", intitule: "CVC / Climatisation", numero: 14, agrementRequis: true },
  { code: "LOT-15-ASCENSEURS", intitule: "Ascenseurs / Monte-charges", numero: 15, agrementRequis: true },
  { code: "LOT-16-ISOLATION", intitule: "Isolation thermique/acoustique", numero: 16 },
  { code: "LOT-17-CARRELAGE-FAIENCE", intitule: "Carrelage / Faïence", numero: 17 },
  { code: "LOT-18-REVETEMENT-SOL", intitule: "Revêtement de sol", numero: 18 },
  { code: "LOT-19-MARBRERIE", intitule: "Marbrerie / Pierre", numero: 19 },
  { code: "LOT-20-PEINTURE", intitule: "Peinture", numero: 20 },
  { code: "LOT-21-FAUX-PLAFOND", intitule: "Faux-plafond", numero: 21 },
  { code: "LOT-22-MENUISERIE-METAL", intitule: "Menuiserie métallique / Serrurerie", numero: 22 },
  { code: "LOT-23-VRD-AMENAGEMENT", intitule: "VRD / Aménagement extérieur", numero: 23 },
  { code: "LOT-24-ESPACES-VERTS", intitule: "Espaces verts", numero: 24 },
  { code: "LOT-25-EQUIPEMENTS-SPECIFIQUES", intitule: "Équipements spécifiques", numero: 25 },
];

export type SousTraitantConditions = {
  delaiJours: number;
  garantie?: string; // ex "Décennale + Parfait achèvement 12 mois"
  penaliteJours?: number; // % du marché par jour de retard
  retenueGarantie?: number; // % retenu jusqu'à réception définitive
};

export type SituationPhoto = {
  url: string;
  geoloc?: { lat: number; lng: number; accuracyM?: number };
  capturedAt?: string;
  caption?: string;
};

export type SituationTravaux = {
  id: string;
  declaredAt: string;
  declaredBy: string; // userId sous-traitant
  pctAvancement: number; // 0..100 cumulé
  pctIncrement: number; // delta vs situation précédente (calcul service)
  montantPaiement: number; // calcul auto: (pctIncrement / 100) * montantHt
  photos: SituationPhoto[];
  commentaire?: string;
  validatedAt?: string;
  validatedBy?: string; // userId chef chantier
  rejetMotif?: string;
  paidAt?: string;
  paymentRef?: string; // Stripe charge / escrow release ref
};

export type EvaluationSousTraitant = {
  qualite: number; // 0..5
  delai: number;
  communication: number;
  relation: number;
  scoreMoyen: number; // calcul service
  commentaire?: string;
  evaluatedAt: string;
  evaluatedBy: string;
};

export type SousTraitantAssignment = {
  id: string;
  dossierId: string;
  lotCode: LotCode;
  lotIntitule: string;
  lotNumero: number;
  supplierUserId?: string | null; // userId Cercles si inscrit
  supplierCabinet: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierClasse?: string | null; // classe BTP (ex "Classe 3 BTP-A")
  supplierAgrements: string[]; // codes agréments détenus
  montantHt: number;
  tva: number; // %
  montantTtc: number; // calcul service
  devise: "MAD";
  conditions: SousTraitantConditions;
  contratPdfUrl?: string | null;
  contratHash?: string | null;
  contratSignedAt?: string | null;
  contratSignedBy?: string | null;
  situations: SituationTravaux[];
  evaluation?: EvaluationSousTraitant;
  status: SousTraitantStatus;
  loi32_99_declared: boolean; // déclarée OUI au maître d'ouvrage
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

export type AssignInput = {
  lotCode: LotCode;
  supplierUserId?: string | null;
  supplierCabinet: string;
  supplierEmail?: string | null;
  supplierPhone?: string | null;
  supplierClasse?: string | null;
  supplierAgrements?: string[];
  montantHt: number;
  tva?: number;
  conditions: SousTraitantConditions;
  loi32_99_declared?: boolean;
};

export type SituationDeclareInput = {
  pctAvancement: number;
  photos: SituationPhoto[];
  commentaire?: string;
};

export type EvaluationInput = {
  qualite: number;
  delai: number;
  communication: number;
  relation: number;
  commentaire?: string;
};

export type Loi32_99AuditResult = {
  dossierId: string;
  totalAssignments: number;
  declared: number;
  undeclared: number;
  missingAgrement: number;
  anomalies: Array<{
    assignmentId: string;
    lotCode: LotCode;
    supplierCabinet: string;
    severity: "INFO" | "WARN" | "CRITICAL";
    code:
      | "ST_UNDECLARED"
      | "AGREMENT_MISSING"
      | "MONTANT_HORS_NORME"
      | "CONTRAT_NON_SIGNE"
      | "PAIEMENT_DIRECT_NON_TRACE";
    message: string;
  }>;
  conformite: "CONFORME" | "ANOMALIES" | "NON_CONFORME";
  auditedAt: string;
};
