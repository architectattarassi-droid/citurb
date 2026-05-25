/**
 * Tome 2 — PV de Chantier (Procès-Verbaux)
 *
 * Types canoniques pour les PV de visite de chantier.
 *
 * Doctrine T2-R-PV-001 :
 *  - Tout PV finalisé est immuable (status=FINAL).
 *  - Un PV finalisé reçoit un hash SHA-256 et une entrée dans ProbativeLog.
 *  - La numérotation est de la forme `YYYY-NNN` (NNN remis à zéro chaque année).
 *  - Le PDF est généré à la demande à partir de l'HTML imprimable.
 */

export const PV_TYPES_VISITE = [
  "INITIALE",
  "AVANCEMENT",
  "RECEPTION_PROVISOIRE",
  "RECEPTION_DEFINITIVE",
  "LEVE_RESERVES",
] as const;
export type PvTypeVisite = (typeof PV_TYPES_VISITE)[number];

export const PV_SEVERITES = ["INFO", "AVIS", "RESERVE", "BLOQUANT"] as const;
export type PvSeverite = (typeof PV_SEVERITES)[number];

export const PV_STATUS = ["DRAFT", "SIGNED_PARTIEL", "FINAL"] as const;
export type PvStatus = (typeof PV_STATUS)[number];

export type PvGeoloc = {
  lat: number;
  lng: number;
  altitudeM?: number | null;
  accuracyM?: number | null;
  capturedAt?: string | null;
};

export type PvPresent = {
  nom: string;
  role: string;
  organisme?: string | null;
};

export type PvAbsent = {
  nom: string;
  role: string;
  motif?: string | null;
};

export type PvObservation = {
  id: string;
  lot?: string | null;
  severite: PvSeverite;
  titre: string;
  description?: string | null;
  photoUrls: string[];
  geoloc?: PvGeoloc | null;
  deadline?: string | null;
};

export type PvDecision = {
  id: string;
  description: string;
  responsable?: string | null;
  deadline?: string | null;
};

export type PvSignature = {
  partie: string;
  /** Data-URL PNG signature canvas. */
  dataUrl: string;
  signedAt: string;
};

export type PvChantier = {
  id: string;
  dossierId: string;
  numero: string;
  date: string;
  typeVisite: PvTypeVisite;

  meteo?: string | null;
  temperatureC?: number | null;
  vent?: string | null;

  presents: PvPresent[];
  absents: PvAbsent[];

  observations: PvObservation[];
  decisions: PvDecision[];

  prochaineVisite?: string | null;
  signatures: PvSignature[];

  status: PvStatus;
  hashSha256?: string | null;
  pdfUrl?: string | null;

  authorId?: string | null;

  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};

export type PvChantierCreateInput = {
  date?: string;
  typeVisite?: PvTypeVisite;
  meteo?: string | null;
  temperatureC?: number | null;
  vent?: string | null;
  presents?: PvPresent[];
  absents?: PvAbsent[];
  observations?: PvObservation[];
  decisions?: PvDecision[];
  prochaineVisite?: string | null;
};

export type PvChantierPatchInput = Partial<PvChantierCreateInput>;

export type PvChantierSignInput = {
  partie: string;
  dataUrl: string;
};

export type PvChantierListItem = Pick<
  PvChantier,
  "id" | "numero" | "date" | "typeVisite" | "status" | "createdAt" | "finalizedAt"
> & {
  observationsCount: number;
  severiteMax: PvSeverite | null;
};

/**
 * Pour compter les sévérités max (max() ordonné) côté liste.
 */
export const PV_SEVERITE_ORDER: Record<PvSeverite, number> = {
  INFO: 0,
  AVIS: 1,
  RESERVE: 2,
  BLOQUANT: 3,
};

/**
 * Schéma Prisma proposé — voir INTEGRATION.md.
 * Tant que la migration n'est pas appliquée, le module persiste les PV
 * sous forme JSON dans `Dossier.payload.pvChantier` (fallback résilient).
 */
export const PV_PAYLOAD_KEY = "pvChantier" as const;
