/**
 * Client API REST pour la fiche cabinet d'architecte (ancrée sur ProProfile).
 * Endpoints publics et owner (JWT) sous `/api/pro/*`.
 * Upload présigné via `/uploads/presign` + PUT direct (R2 prod / API en local dev).
 */
import { apiFetch, apiBase, getToken } from "../../tomes/tome4/apiClient";

export type ProjectStatus = "ETUDE" | "EN_COURS" | "LIVRE";
export type MediaKind = "PHOTO" | "VIDEO_FILE" | "VIDEO_URL";

export interface CabinetMedia {
  id: string;
  projectId: string;
  kind: MediaKind;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  uploadDate: string;
  position: number;
}

export interface CabinetProject {
  id: string;
  proProfileId: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  surface: number | null;
  year: number | null;
  status: ProjectStatus;
  missions: string[];
  programme: string | null;
  description: string;
  materials: string | null;
  keywords: string[];
  published: boolean;
  media: CabinetMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface CabinetProfile {
  id: string;
  userId: string;
  slug: string | null;
  displayName: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  cabinetName: string | null;
  villePrincipale: string | null;
  regions: string[];
  websiteUrl: string | null;
  linkedinUrl: string | null;
  behanceUrl: string | null;
  instagramUrl: string | null;
  pinterestUrl: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  portfolioProjects: CabinetProject[];
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  method: "PUT";
  headers?: Record<string, string>;
  expiresAt: string;
  driver: "r2" | "local";
}

export type PresignInput = { mime: string; size: number; kind: "photo" | "video" | "thumbnail" };

export const cabinetApi = {
  // ── public ───────────────────────────────────────────────────────
  getPublic: (slug: string) =>
    apiFetch<{ ok: true; data: CabinetProfile }>(`/api/pro/${encodeURIComponent(slug)}`),
  getPublicProject: (slug: string, projectSlug: string) =>
    apiFetch<{ ok: true; data: CabinetProject & { proProfile: CabinetProfile } }>(
      `/api/pro/${encodeURIComponent(slug)}/projet/${encodeURIComponent(projectSlug)}`,
    ),
  getSchemaJson: async (slug: string): Promise<any[]> => {
    const r = await fetch(`${apiBase()}/api/pro/${encodeURIComponent(slug)}/schema.json`, { credentials: "omit" });
    if (!r.ok) throw new Error(`schema.json HTTP ${r.status}`);
    return r.json();
  },

  // ── owner (JWT) ─────────────────────────────────────────────────
  ensureMySlug: () => apiFetch<{ ok: true; data: { slug: string } }>(`/api/pro/me/slug`, { method: "POST", body: {} }),
  listMyProjects: () => apiFetch<{ ok: true; data: CabinetProject[] }>(`/api/pro/me/projects`),
  createProject: (body: Partial<CabinetProject>) =>
    apiFetch<{ ok: true; data: CabinetProject }>(`/api/pro/me/projects`, { method: "POST", body }),
  updateProject: (id: string, body: Partial<CabinetProject>) =>
    apiFetch<{ ok: true; data: CabinetProject }>(`/api/pro/me/projects/${id}`, { method: "PATCH", body }),
  deleteProject: (id: string) =>
    apiFetch<{ ok: true }>(`/api/pro/me/projects/${id}`, { method: "DELETE" }),
  publishProject: (id: string, published: boolean) =>
    apiFetch<{ ok: true; data: CabinetProject }>(`/api/pro/me/projects/${id}/publish`, { method: "PATCH", body: { published } }),
  addMedia: (id: string, body: Partial<CabinetMedia>) =>
    apiFetch<{ ok: true; data: CabinetMedia }>(`/api/pro/me/projects/${id}/media`, { method: "POST", body }),
  deleteMedia: (id: string, mediaId: string) =>
    apiFetch<{ ok: true }>(`/api/pro/me/projects/${id}/media/${mediaId}`, { method: "DELETE" }),
  reorderMedia: (id: string, order: { id: string; position: number }[]) =>
    apiFetch<{ ok: true; count: number }>(`/api/pro/me/projects/${id}/media/reorder`, { method: "PATCH", body: { order } }),

  // ── upload présigné ─────────────────────────────────────────────
  presign: (body: PresignInput) =>
    apiFetch<{ ok: true; data: PresignedUpload }>(`/uploads/presign`, { method: "POST", body }),

  /**
   * Flux complet : presign → PUT (avec progression) → renvoie publicUrl/key.
   * onProgress(percent 0..100).
   */
  uploadFile: (file: File, kind: "photo" | "video" | "thumbnail", onProgress?: (p: number) => void) =>
    new Promise<{ publicUrl: string; key: string }>(async (resolve, reject) => {
      try {
        const { data: presign } = await cabinetApi.presign({ mime: file.type, size: file.size, kind });
        const xhr = new XMLHttpRequest();
        xhr.open(presign.method, presign.uploadUrl, true);
        if (presign.headers) for (const [k, v] of Object.entries(presign.headers)) xhr.setRequestHeader(k, v);
        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
          };
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve({ publicUrl: presign.publicUrl, key: presign.key });
          else reject(new Error(`PUT ${xhr.status}: ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(file);
      } catch (e) {
        reject(e);
      }
    }),
};

export function isAuthed(): boolean {
  return !!getToken();
}

/**
 * Extrait l'ID d'une vidéo YouTube depuis une URL classique. Permet de dériver
 * automatiquement la thumbnailUrl (img.youtube.com/vi/<id>/hqdefault.jpg) et de
 * satisfaire le garde-fou VideoObject (thumbnailUrl + uploadDate requis).
 */
export function youtubeId(url: string): string | null {
  const m =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url || "");
  return m ? m[1] : null;
}

export function youtubeThumb(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
