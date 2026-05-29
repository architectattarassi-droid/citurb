/**
 * object-storage.types — types et garde-fous MIME/taille pour l'upload médias.
 * Limites doctrinaires (BRIEF Chantier B §2) :
 *   - photo : jpg/png/webp ≤ 10 Mo
 *   - vidéo : mp4/mov/webm ≤ 200 Mo
 * Tout autre MIME ou taille hors plage → rejet immédiat à la présigne.
 */
export type ObjectKind = "photo" | "video" | "thumbnail";

export interface PresignInput {
  mime: string;
  size: number;
  kind: ObjectKind;
  ownerKey: string; // préfixe d'organisation (slug cabinet ou userId)
}

export interface PresignedUpload {
  uploadUrl: string;                  // PUT direct (R2 en prod, API locale en dev)
  publicUrl: string;                  // URL finale stockée en base (CDN R2 ou /uploads/objects/:key)
  key: string;                        // identifiant objet
  method: "PUT";
  headers?: Record<string, string>;
  expiresAt: string;
  driver: "r2" | "local";
}

export const MIME_LIMITS = {
  photo:     { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes:  10 * 1024 * 1024 },
  video:     { mimes: ["video/mp4", "video/quicktime", "video/webm"], maxBytes: 200 * 1024 * 1024 },
  thumbnail: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes:   2 * 1024 * 1024 },
} as const;

export function validatePresign(input: PresignInput): void {
  const lim = (MIME_LIMITS as Record<string, { mimes: readonly string[]; maxBytes: number }>)[input.kind];
  if (!lim) throw new Error(`Kind invalide: ${input.kind}`);
  if (!lim.mimes.includes(input.mime)) {
    throw new Error(`MIME non autorisé pour ${input.kind}: ${input.mime} (attendu: ${lim.mimes.join(", ")})`);
  }
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > lim.maxBytes) {
    throw new Error(`Taille hors plage pour ${input.kind}: ${input.size} (max: ${lim.maxBytes})`);
  }
  if (!input.ownerKey || !/^[A-Za-z0-9_\-:.]{1,64}$/.test(input.ownerKey)) {
    throw new Error("ownerKey invalide");
  }
}

export function extFor(mime: string): string {
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  } as Record<string, string>)[mime] || "bin";
}
