/**
 * Tome 3 — Module Réception + Certificat de Conformité + Permis d'Habiter
 *
 * Concepts juridiques Maroc :
 *  - Réception provisoire : MOA prend possession ouvrage (art. 769 DOC).
 *    Point de départ des garanties légales.
 *  - Levée de réserves : chaque réserve formulée à la réception provisoire
 *    doit être levée (description + preuves photos + signature).
 *  - Réception définitive : 1 an après la provisoire si toutes réserves
 *    sont levées. Libère la retenue de garantie.
 *  - Permis d'Habiter / Certificat de Conformité : délivré par la commune
 *    après visite de conformité (loi 66-12 + décret 2-14-394). La plateforme
 *    suit la procédure et conserve une attestation probante CITURBAREA.
 *  - Garantie parfait achèvement : 1 an (art. 769 DOC)
 *  - Garantie biennale : 2 ans éléments dissociables (art. 769 bis DOC)
 *  - Garantie décennale : 10 ans solidité ouvrage + clos/couvert (art. 769 DOC)
 *
 * Persistance MVP : `Dossier.payload.receptionConformite` (JSON).
 * Migration cible : voir INTEGRATION.md (modèles Prisma).
 */

export const RECEPTION_PAYLOAD_KEY = "receptionConformite" as const;

export const RECEPTION_STATUS = [
  "NONE",
  "PROVISOIRE_DRAFT",
  "PROVISOIRE_SIGNED",
  "RESERVES_EN_COURS",
  "RESERVES_LEVEES",
  "DEFINITIVE_SIGNED",
] as const;
export type ReceptionStatus = (typeof RECEPTION_STATUS)[number];

export const PERMIS_HABITER_STATUS = [
  "NON_DEMANDE",
  "DEMANDE_DEPOSEE",
  "VISITE_PLANIFIEE",
  "VISITE_EFFECTUEE",
  "DELIVRE",
  "REFUSE",
] as const;
export type PermisHabiterStatus = (typeof PERMIS_HABITER_STATUS)[number];

export const GARANTIE_TYPES = [
  "PARFAIT_ACHEVEMENT",
  "BIENNALE",
  "DECENNALE",
] as const;
export type GarantieType = (typeof GARANTIE_TYPES)[number];

export const SINISTRE_STATUS = [
  "DECLARE",
  "EN_INSTRUCTION",
  "ACCEPTE",
  "REJETE",
  "CLOS",
] as const;
export type SinistreStatus = (typeof SINISTRE_STATUS)[number];

// Durées légales (jours) — Maroc DOC art. 769 / 769 bis
export const GARANTIE_DUREE_JOURS: Record<GarantieType, number> = {
  PARFAIT_ACHEVEMENT: 365,
  BIENNALE: 365 * 2,
  DECENNALE: 365 * 10,
};

export type ReceptionPresent = {
  nom: string;
  role: string; // MOA, ARCHITECTE, ENTREPRENEUR, BET, MOD, etc.
  organisme?: string | null;
};

export type ReceptionSignature = {
  partie: string;
  dataUrl: string; // PNG/JPEG base64 data-URL
  signedAt: string;
};

export type ReceptionPhoto = {
  url: string;
  legende?: string | null;
  piece?: string | null; // ex: "Salon RDC", "Chambre 1 R+1"
  capturedAt?: string | null;
};

export type ChecklistConformiteItem = {
  id: string;
  libelle: string;
  conforme: boolean;
  observation?: string | null;
};

/** Réserve formulée à la réception provisoire. */
export type Reserve = {
  id: string;
  description: string;
  severite: "MINEURE" | "MAJEURE" | "BLOQUANTE";
  piece?: string | null;
  photoUrls: string[];
  responsableLevee?: string | null;
  deadline?: string | null;
  /** Champ alimenté quand la réserve est levée. */
  leveeAt?: string | null;
  leveeDescription?: string | null;
  leveePhotoUrls?: string[];
  leveeSignature?: ReceptionSignature | null;
};

export type ReceptionProvisoire = {
  id: string;
  dateReception: string;
  presents: ReceptionPresent[];
  ouvrageDescription?: string | null;
  montantTravauxMAD?: number | null;
  checklist: ChecklistConformiteItem[];
  reserves: Reserve[];
  observations?: string | null;
  photos: ReceptionPhoto[];
  signatures: ReceptionSignature[];
  status: "DRAFT" | "FINAL";
  hashSha256?: string | null;
  pvUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};

export type ReceptionDefinitive = {
  id: string;
  dateReception: string;
  presents: ReceptionPresent[];
  validationToutesReservesLevees: boolean;
  observations?: string | null;
  libereRetenueGarantie: boolean;
  montantRetenueLibereeMAD?: number | null;
  signatures: ReceptionSignature[];
  status: "DRAFT" | "FINAL";
  hashSha256?: string | null;
  pvUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};

export type DemandePermisHabiter = {
  commune: string;
  dossierComplet: string[]; // ids documents
  dateDepot: string;
  numeroEnregistrement?: string | null;
};

export type VisiteConformite = {
  id: string;
  dateVisite: string;
  agentName: string;
  agentMatricule?: string | null;
  ralerie?: string | null; // observations agent (sic spec)
  observations?: string | null;
  resultat: "FAVORABLE" | "DEFAVORABLE" | "AVEC_RESERVES" | "EN_ATTENTE";
};

export type CertificatConformite = {
  refOfficial: string;
  dateDelivrance: string;
  urlOfficial?: string | null;
  /** Hash SHA-256 du certificat CITURBAREA probant. */
  hashSha256?: string | null;
  certificatCiturbarealUrl?: string | null;
  finalizedAt?: string | null;
};

export type PermisHabiterState = {
  status: PermisHabiterStatus;
  demande?: DemandePermisHabiter | null;
  visites: VisiteConformite[];
  certificat?: CertificatConformite | null;
  motifRefus?: string | null;
};

export type GarantieActive = {
  type: GarantieType;
  dateDebut: string; // = réception provisoire
  dateFin: string;
  expireDansJours: number;
  expiree: boolean;
  alerte30j: boolean;
};

export type Sinistre = {
  id: string;
  garantieType: GarantieType;
  description: string;
  photoUrls: string[];
  dateConstatation: string;
  dateDeclaration: string;
  status: SinistreStatus;
  declarantId?: string | null;
  reponseAssureur?: string | null;
};

export type ReceptionConformiteState = {
  status: ReceptionStatus;
  provisoire?: ReceptionProvisoire | null;
  definitive?: ReceptionDefinitive | null;
  permisHabiter: PermisHabiterState;
  sinistres: Sinistre[];
  garantieDateDebut?: string | null; // = provisoire.dateReception une fois FINAL
};

// ───────────────────── Inputs API

export type ProvisoireInput = {
  dateReception?: string;
  presents?: ReceptionPresent[];
  ouvrageDescription?: string | null;
  montantTravauxMAD?: number | null;
  checklist?: ChecklistConformiteItem[];
  reserves?: Array<Omit<Reserve, "id" | "leveeAt" | "leveeDescription" | "leveePhotoUrls" | "leveeSignature"> & { id?: string }>;
  reservesObs?: string | null;
  observations?: string | null;
  photos?: ReceptionPhoto[];
};

export type LeveeReserveInput = {
  reserveId: string;
  descriptionLevee: string;
  preuvePhotos?: string[];
  dateLevee?: string;
  signature?: ReceptionSignature | null;
};

export type DefinitiveInput = {
  dateReception?: string;
  presents?: ReceptionPresent[];
  validation?: boolean;
  observations?: string | null;
  montantRetenueLibereeMAD?: number | null;
};

export type DemandePhInput = {
  commune: string;
  dossierComplet: string[];
};

export type VisiteConformiteInput = {
  dateVisite: string;
  agentName: string;
  agentMatricule?: string | null;
  ralerie?: string | null;
  observations?: string | null;
  resultat?: VisiteConformite["resultat"];
};

export type CertificatInput = {
  refOfficial: string;
  dateDelivrance: string;
  urlOfficial?: string | null;
};

export type SinistreInput = {
  garantieType: GarantieType;
  description: string;
  photos?: string[];
  dateConstatation: string;
};

export type SignatureInput = {
  partie: string;
  dataUrl: string;
  cible: "PROVISOIRE" | "DEFINITIVE";
};
