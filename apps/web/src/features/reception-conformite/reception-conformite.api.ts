/**
 * apps/web/src/features/reception-conformite/reception-conformite.api.ts
 *
 * Client REST pour le module Réception + Permis d'Habiter (Tome 3).
 */

import { apiBase, apiFetch } from "../../tomes/tome4/apiClient";

export type ReceptionStatus =
  | "NONE"
  | "PROVISOIRE_DRAFT"
  | "PROVISOIRE_SIGNED"
  | "RESERVES_EN_COURS"
  | "RESERVES_LEVEES"
  | "DEFINITIVE_SIGNED";

export type PermisHabiterStatus =
  | "NON_DEMANDE"
  | "DEMANDE_DEPOSEE"
  | "VISITE_PLANIFIEE"
  | "VISITE_EFFECTUEE"
  | "DELIVRE"
  | "REFUSE";

export type GarantieType = "PARFAIT_ACHEVEMENT" | "BIENNALE" | "DECENNALE";

export type SinistreStatus =
  | "DECLARE"
  | "EN_INSTRUCTION"
  | "ACCEPTE"
  | "REJETE"
  | "CLOS";

export type ReceptionPresent = {
  nom: string;
  role: string;
  organisme?: string | null;
};

export type ReceptionSignature = {
  partie: string;
  dataUrl: string;
  signedAt: string;
};

export type ReceptionPhoto = {
  url: string;
  legende?: string | null;
  piece?: string | null;
  capturedAt?: string | null;
};

export type ChecklistConformiteItem = {
  id: string;
  libelle: string;
  conforme: boolean;
  observation?: string | null;
};

export type Reserve = {
  id: string;
  description: string;
  severite: "MINEURE" | "MAJEURE" | "BLOQUANTE";
  piece?: string | null;
  photoUrls: string[];
  responsableLevee?: string | null;
  deadline?: string | null;
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
  finalizedAt?: string | null;
};

export type VisiteConformite = {
  id: string;
  dateVisite: string;
  agentName: string;
  agentMatricule?: string | null;
  ralerie?: string | null;
  observations?: string | null;
  resultat: "FAVORABLE" | "DEFAVORABLE" | "AVEC_RESERVES" | "EN_ATTENTE";
};

export type CertificatConformite = {
  refOfficial: string;
  dateDelivrance: string;
  urlOfficial?: string | null;
  hashSha256?: string | null;
  certificatCiturbarealUrl?: string | null;
  finalizedAt?: string | null;
};

export type PermisHabiterState = {
  status: PermisHabiterStatus;
  demande?: {
    commune: string;
    dossierComplet: string[];
    dateDepot: string;
    numeroEnregistrement?: string | null;
  } | null;
  visites: VisiteConformite[];
  certificat?: CertificatConformite | null;
  motifRefus?: string | null;
};

export type GarantieActive = {
  type: GarantieType;
  dateDebut: string;
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
  reponseAssureur?: string | null;
};

export type ReceptionState = {
  status: ReceptionStatus;
  provisoire?: ReceptionProvisoire | null;
  definitive?: ReceptionDefinitive | null;
  permisHabiter: PermisHabiterState;
  sinistres: Sinistre[];
  garantieDateDebut?: string | null;
};

export const receptionApi = {
  state(dossierId: string) {
    return apiFetch<ReceptionState>(`/api/reception/dossier/${dossierId}`);
  },
  garanties(dossierId: string) {
    return apiFetch<{ garanties: GarantieActive[]; debut: string | null }>(
      `/api/reception/dossier/${dossierId}/garanties`,
    );
  },

  upsertProvisoire(dossierId: string, body: Partial<ReceptionProvisoire> & { reservesObs?: string }) {
    return apiFetch<ReceptionProvisoire>(
      `/api/reception/dossier/${dossierId}/provisoire`,
      { method: "POST", body },
    );
  },
  signProvisoire(dossierId: string, partie: string, dataUrl: string) {
    return apiFetch<ReceptionState>(
      `/api/reception/dossier/${dossierId}/provisoire/sign`,
      { method: "POST", body: { partie, dataUrl } },
    );
  },
  finalizeProvisoire(dossierId: string) {
    return apiFetch<ReceptionProvisoire>(
      `/api/reception/dossier/${dossierId}/provisoire/finalize`,
      { method: "POST" },
    );
  },

  leveeReserve(dossierId: string, body: {
    reserveId: string;
    descriptionLevee: string;
    preuvePhotos?: string[];
    dateLevee?: string;
    signature?: ReceptionSignature | null;
  }) {
    return apiFetch<Reserve>(
      `/api/reception/dossier/${dossierId}/leveereserves`,
      { method: "POST", body },
    );
  },

  upsertDefinitive(dossierId: string, body: Partial<ReceptionDefinitive>) {
    return apiFetch<ReceptionDefinitive>(
      `/api/reception/dossier/${dossierId}/definitive`,
      { method: "POST", body },
    );
  },
  signDefinitive(dossierId: string, partie: string, dataUrl: string) {
    return apiFetch<ReceptionState>(
      `/api/reception/dossier/${dossierId}/definitive/sign`,
      { method: "POST", body: { partie, dataUrl } },
    );
  },
  finalizeDefinitive(dossierId: string) {
    return apiFetch<ReceptionDefinitive>(
      `/api/reception/dossier/${dossierId}/definitive/finalize`,
      { method: "POST" },
    );
  },

  demandePh(dossierId: string, body: { commune: string; dossierComplet: string[] }) {
    return apiFetch<PermisHabiterState>(
      `/api/reception/dossier/${dossierId}/demande-permis-habiter`,
      { method: "POST", body },
    );
  },
  visiteConformite(dossierId: string, body: {
    dateVisite: string;
    agentName: string;
    agentMatricule?: string | null;
    ralerie?: string | null;
    observations?: string | null;
    resultat?: VisiteConformite["resultat"];
  }) {
    return apiFetch<PermisHabiterState>(
      `/api/reception/dossier/${dossierId}/visite-conformite`,
      { method: "POST", body },
    );
  },
  certificatConformite(dossierId: string, body: {
    refOfficial: string;
    dateDelivrance: string;
    urlOfficial?: string | null;
  }) {
    return apiFetch<PermisHabiterState>(
      `/api/reception/dossier/${dossierId}/certificat-conformite`,
      { method: "POST", body },
    );
  },

  declareSinistre(dossierId: string, body: {
    garantieType: GarantieType;
    description: string;
    photos?: string[];
    dateConstatation: string;
  }) {
    return apiFetch<Sinistre>(
      `/api/reception/dossier/${dossierId}/sinistre`,
      { method: "POST", body },
    );
  },

  uploadPhoto(dossierId: string, file: {
    contentBase64: string;
    mimeType: string;
    filenameHint?: string;
    bucket?: string;
  }) {
    return apiFetch<{ url: string }>(
      `/api/reception/dossier/${dossierId}/photos`,
      { method: "POST", body: file },
    );
  },

  pdfProvisoireUrl(dossierId: string) {
    return `${apiBase()}/api/reception/dossier/${dossierId}/pdf/provisoire`;
  },
  pdfDefinitiveUrl(dossierId: string) {
    return `${apiBase()}/api/reception/dossier/${dossierId}/pdf/definitive`;
  },
  pdfLeveeUrl(dossierId: string, reserveId: string) {
    return `${apiBase()}/api/reception/dossier/${dossierId}/pdf/levee/${reserveId}`;
  },
  pdfCertificatUrl(dossierId: string) {
    return `${apiBase()}/api/reception/dossier/${dossierId}/pdf/certificat`;
  },
};

// ───────────────── Labels & couleurs

export const GARANTIE_LABEL: Record<GarantieType, { label: string; duree: string; desc: string }> = {
  PARFAIT_ACHEVEMENT: {
    label: "Parfait achèvement",
    duree: "1 an",
    desc: "Art. 769 DOC — tout défaut signalé pendant 1 an doit être réparé par l'entrepreneur.",
  },
  BIENNALE: {
    label: "Biennale",
    duree: "2 ans",
    desc: "Art. 769 bis DOC — éléments d'équipement dissociables (volets, chauffe-eau, etc.).",
  },
  DECENNALE: {
    label: "Décennale",
    duree: "10 ans",
    desc: "Art. 769 DOC — solidité de l'ouvrage et clos/couvert.",
  },
};

export const STATUS_COLOR: Record<ReceptionStatus, { bg: string; fg: string; label: string }> = {
  NONE: { bg: "#e2e8f0", fg: "#475569", label: "Non démarré" },
  PROVISOIRE_DRAFT: { bg: "#fef9c3", fg: "#854d0e", label: "Provisoire brouillon" },
  PROVISOIRE_SIGNED: { bg: "#dcfce7", fg: "#166534", label: "Provisoire signée" },
  RESERVES_EN_COURS: { bg: "#fed7aa", fg: "#9a3412", label: "Réserves en cours" },
  RESERVES_LEVEES: { bg: "#dbeafe", fg: "#1e40af", label: "Réserves levées" },
  DEFINITIVE_SIGNED: { bg: "#dcfce7", fg: "#166534", label: "Définitive signée" },
};

export const PH_STATUS_COLOR: Record<PermisHabiterStatus, { bg: string; fg: string; label: string }> = {
  NON_DEMANDE: { bg: "#e2e8f0", fg: "#475569", label: "Non demandé" },
  DEMANDE_DEPOSEE: { bg: "#fef9c3", fg: "#854d0e", label: "Demande déposée" },
  VISITE_PLANIFIEE: { bg: "#dbeafe", fg: "#1e40af", label: "Visite planifiée" },
  VISITE_EFFECTUEE: { bg: "#dbeafe", fg: "#1e40af", label: "Visite effectuée" },
  DELIVRE: { bg: "#dcfce7", fg: "#166534", label: "Délivré" },
  REFUSE: { bg: "#fecaca", fg: "#991b1b", label: "Refusé" },
};

export const SEVERITE_COLOR: Record<Reserve["severite"], { bg: string; fg: string; label: string }> = {
  MINEURE: { bg: "#fef9c3", fg: "#854d0e", label: "Mineure" },
  MAJEURE: { bg: "#fed7aa", fg: "#9a3412", label: "Majeure" },
  BLOQUANTE: { bg: "#fecaca", fg: "#991b1b", label: "Bloquante" },
};

export function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error("Format de fichier invalide"));
        return;
      }
      resolve({ mime: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
