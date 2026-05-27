/**
 * documents-repo.api.ts
 *
 * Client REST pour le Documents Repository (Tome 7).
 * Réutilise apiFetch (JWT + erreurs) et apiBase (origin runtime).
 */
import { apiBase, apiFetch, getToken } from "../../tomes/tome4/apiClient";

export type DocCategory =
  | "CONTRAT"
  | "PLAN"
  | "PIECE_ECRITE"
  | "PERMIS"
  | "PV"
  | "FACTURE"
  | "ATTESTATION"
  | "CIN"
  | "TITRE_FONCIER"
  | "AUTRE";

export type DocStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "PARTIALLY_SIGNED"
  | "SIGNED"
  | "ARCHIVED";

export type SigMethod = "LOCAL_CANVAS" | "BARID_ESIGN" | "OTP_EMAIL";

export type DocSignature = {
  id: string;
  signerId: string | null;
  signerName: string;
  signerRole: string;
  signerEmail: string | null;
  dataUrl: string;
  method: SigMethod;
  signedAt: string;
  ipAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
  order: number;
};

export type SigRequest = {
  signerId: string | null;
  signerName: string;
  signerRole: string;
  signerEmail: string | null;
  order: number;
  status: "PENDING" | "SIGNED" | "DECLINED";
  requestedAt: string;
  notifiedAt: string | null;
};

export type Document = {
  id: string;
  dossierId: string;
  title: string;
  description: string | null;
  category: DocCategory;
  status: DocStatus;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  ext: string;
  hashSha256: string;
  signatureRequests: SigRequest[];
  signatures: DocSignature[];
  uploadedBy: string | null;
  uploadedAt: string;
  updatedAt: string;
  signedAt: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  probativeHash: string | null;
  signedUrl?: string;
};

export type DocumentListItem = {
  id: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  signedAt: string | null;
  signaturesCount: number;
  pendingSignaturesCount: number;
};

export type VerifyResult = {
  ok: boolean;
  docId: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  hashSha256: string;
  uploadedAt: string;
  signaturesCount: number;
  signers: Array<{ name: string; role: string; signedAt: string }>;
  probativeHash: string | null;
  message?: string;
};

export type UploadResponse = { ok: true; document: Document };

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  CONTRAT: "Contrat",
  PLAN: "Plan",
  PIECE_ECRITE: "Pièce écrite",
  PERMIS: "Permis / Autorisation",
  PV: "Procès-verbal",
  FACTURE: "Facture / Devis",
  ATTESTATION: "Attestation",
  CIN: "CIN",
  TITRE_FONCIER: "Titre foncier",
  AUTRE: "Autre",
};

export const STATUS_COLOR: Record<DocStatus, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: "#e2e8f0", fg: "#475569", label: "Brouillon" },
  PENDING_SIGNATURE: { bg: "#fef9c3", fg: "#854d0e", label: "En attente signatures" },
  PARTIALLY_SIGNED: { bg: "#fed7aa", fg: "#9a3412", label: "Signé partiellement" },
  SIGNED: { bg: "#dcfce7", fg: "#166534", label: "Signé" },
  ARCHIVED: { bg: "#f1f5f9", fg: "#94a3b8", label: "Archivé" },
};

export const CATEGORY_ICON: Record<DocCategory, string> = {
  CONTRAT: "[CT]",
  PLAN: "[PL]",
  PIECE_ECRITE: "[PE]",
  PERMIS: "[PM]",
  PV: "[PV]",
  FACTURE: "[FA]",
  ATTESTATION: "[AT]",
  CIN: "[ID]",
  TITRE_FONCIER: "[TF]",
  AUTRE: "[--]",
};

export const documentsRepoApi = {
  list(dossierId: string) {
    return apiFetch<{ items: DocumentListItem[]; total: number }>(
      `/api/documents-repo/dossier/${dossierId}`,
    );
  },
  get(docId: string) {
    return apiFetch<Document>(`/api/documents-repo/${docId}`);
  },
  verifyPublic(docId: string, hash?: string) {
    const qs = hash ? `?hash=${encodeURIComponent(hash)}` : "";
    return apiFetch<VerifyResult>(`/api/documents-repo/${docId}/verify${qs}`);
  },
  async upload(
    dossierId: string,
    file: File,
    meta?: { title?: string; description?: string; category?: DocCategory },
    onProgress?: (pct: number) => void,
  ): Promise<UploadResponse> {
    const url = `${apiBase()}/api/documents-repo/dossier/${dossierId}/upload`;
    const fd = new FormData();
    fd.append("file", file, file.name);
    if (meta?.title) fd.append("title", meta.title);
    if (meta?.description) fd.append("description", meta.description);
    if (meta?.category) fd.append("category", meta.category);

    return new Promise<UploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      const token = getToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject({ status: xhr.status, message: body?.message ?? "Upload error", details: body });
        } catch (e) {
          reject({ status: xhr.status, message: "Réponse serveur invalide" });
        }
      };
      xhr.onerror = () => reject({ status: 0, message: "Erreur réseau" });
      xhr.send(fd);
    });
  },
  remove(docId: string) {
    return apiFetch<{ ok: boolean }>(`/api/documents-repo/${docId}`, {
      method: "DELETE",
    });
  },
  sign(docId: string, body: {
    dataUrl: string;
    signerRole: string;
    signerName?: string;
    signerEmail?: string | null;
    geoLat?: number | null;
    geoLng?: number | null;
  }) {
    return apiFetch<Document>(`/api/documents-repo/${docId}/sign`, {
      method: "POST",
      body,
    });
  },
  requestSignature(docId: string, signers: Array<{
    signerName: string;
    signerRole: string;
    signerEmail?: string;
    signerId?: string;
  }>) {
    return apiFetch<Document>(`/api/documents-repo/${docId}/request-signature`, {
      method: "POST",
      body: { signers },
    });
  },
  fileUrl(doc: Document): string {
    if (doc.signedUrl) return `${apiBase()}${doc.signedUrl}`;
    return "";
  },
  verifyUrl(docId: string, hash: string): string {
    return `${apiBase()}/api/documents-repo/${docId}/verify?hash=${encodeURIComponent(hash)}`;
  },
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}
