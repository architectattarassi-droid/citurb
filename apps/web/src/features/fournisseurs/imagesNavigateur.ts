/**
 * Réduction des photos dans le navigateur avant envoi : redimensionnement
 * (1 600 px de côté au plus, vignette 400 px) et ré-encodage WebP (repli
 * JPEG si le navigateur n'encode pas le WebP). Le ré-encodage par canvas ne
 * conserve aucune métadonnée (EXIF, GPS) ; la Function les retire aussi.
 * Plafonds alignés sur functions/_lib/images.ts.
 */
export const COTE_IMAGE = 1600, COTE_VIGNETTE = 400;
export const MAX_IMAGE = 400 * 1024, MAX_VIGNETTE = 60 * 1024;

async function encoder(source: ImageBitmap, cote: number, max: number): Promise<Blob> {
  const k = Math.min(1, cote / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * k)), h = Math.max(1, Math.round(source.height * k));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.drawImage(source, 0, 0, w, h);
  for (const q of [0.82, 0.72, 0.62, 0.5, 0.4]) {
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", q));
    const blob = b && b.type === "image/webp" ? b : await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= max) return blob;
  }
  throw new Error("trop_lourde");
}

const enBase64 = (b: Blob) => new Promise<string>((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ""));
  r.onerror = () => ko(r.error);
  r.readAsDataURL(b);
});

/** Image et vignette prêtes à l'envoi (base64). Refuse ce qui n'est pas une image lisible par le navigateur. */
export async function preparerImage(fichier: File): Promise<{ image: string; vignette: string; apercu: string }> {
  if (!/^image\//.test(fichier.type) || /svg/i.test(fichier.type)) throw new Error("type");
  if (fichier.size > 25 * 1024 * 1024) throw new Error("trop_lourde");
  const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" } as ImageBitmapOptions);
  try {
    const [image, vignette] = await Promise.all([encoder(bitmap, COTE_IMAGE, MAX_IMAGE), encoder(bitmap, COTE_VIGNETTE, MAX_VIGNETTE)]);
    return { image: await enBase64(image), vignette: await enBase64(vignette), apercu: URL.createObjectURL(vignette) };
  } finally { bitmap.close(); }
}
