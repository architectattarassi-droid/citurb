/**
 * Images du catalogue Cercles (produits, prestations, galerie société) :
 * contrôle et nettoyage des octets reçus, fonctions pures (testées).
 *
 * Stockage : le navigateur redimensionne et ré-encode (WebP, 1600 px max +
 * vignette 400 px) puis envoie les octets ; la Function vérifie le type réel
 * (signature), les dimensions, la taille, retire les métadonnées EXIF / XMP /
 * IPTC (vie privée, géolocalisation) et stocke en base (bytea, table
 * "ImageCatalogue"). Choix et migration vers R2 : docs/architecture/contrat-catalogue.md.
 */

export const TYPES_IMAGE = ["image/webp", "image/jpeg"] as const;
export type TypeImage = (typeof TYPES_IMAGE)[number];

/** Plafonds (octets, pixels) et quotas. */
export const IMAGE_MAX_OCTETS = 400 * 1024;
export const VIGNETTE_MAX_OCTETS = 60 * 1024;
export const IMAGE_MAX_COTE = 2000;
export const VIGNETTE_MAX_COTE = 600;
export const IMAGES_PAR_OBJET = 8;
export const IMAGES_PAR_FOURNISSEUR = 40;
export const OCTETS_PAR_FOURNISSEUR = 10 * 1024 * 1024;

/** Type réel d'après la signature (jamais d'après le nom ou l'en-tête déclaré). */
export function typeImage(o: Uint8Array): TypeImage | null {
  if (o.length > 12 && o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46 && o[8] === 0x57 && o[9] === 0x45 && o[10] === 0x42 && o[11] === 0x50) return "image/webp";
  if (o.length > 4 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "image/jpeg";
  return null;
}

const u32le = (o: Uint8Array, i: number) => (o[i] | (o[i + 1] << 8) | (o[i + 2] << 16) | (o[i + 3] << 24)) >>> 0;
const u24le = (o: Uint8Array, i: number) => o[i] | (o[i + 1] << 8) | (o[i + 2] << 16);
const ascii = (o: Uint8Array, i: number, n: number) => String.fromCharCode(...o.subarray(i, i + n));

interface Morceau { type: string; debut: number; taille: number }
function morceauxWebp(o: Uint8Array): Morceau[] | null {
  const l: Morceau[] = [];
  let i = 12;
  while (i + 8 <= o.length) {
    const taille = u32le(o, i + 4);
    if (i + 8 + taille > o.length) return null;
    l.push({ type: ascii(o, i, 4), debut: i, taille });
    i += 8 + taille + (taille & 1);
  }
  return i === o.length || i === o.length + 1 ? l : null;
}

/** Largeur et hauteur, ou null si l'image est illisible. */
export function dimensions(o: Uint8Array): { largeur: number; hauteur: number } | null {
  const t = typeImage(o);
  if (t === "image/webp") {
    const ms = morceauxWebp(o);
    if (!ms) return null;
    for (const m of ms) {
      const d = m.debut + 8;
      if (m.type === "VP8X" && m.taille >= 10) return { largeur: u24le(o, d + 4) + 1, hauteur: u24le(o, d + 7) + 1 };
      if (m.type === "VP8 " && m.taille >= 10 && o[d + 3] === 0x9d && o[d + 4] === 0x01 && o[d + 5] === 0x2a)
        return { largeur: (o[d + 6] | (o[d + 7] << 8)) & 0x3fff, hauteur: (o[d + 8] | (o[d + 9] << 8)) & 0x3fff };
      if (m.type === "VP8L" && m.taille >= 5 && o[d] === 0x2f) {
        const b0 = o[d + 1], b1 = o[d + 2], b2 = o[d + 3], b3 = o[d + 4];
        return { largeur: 1 + (((b1 & 0x3f) << 8) | b0), hauteur: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
    }
    return null;
  }
  if (t === "image/jpeg") {
    let i = 2;
    while (i + 4 <= o.length) {
      if (o[i] !== 0xff) return null;
      const m = o[i + 1];
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const n = (o[i + 2] << 8) | o[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc && i + 9 <= o.length)
        return { hauteur: (o[i + 5] << 8) | o[i + 6], largeur: (o[i + 7] << 8) | o[i + 8] };
      if (m === 0xda) return null;
      i += 2 + n;
    }
  }
  return null;
}

/**
 * Retire les métadonnées : WebP → morceaux EXIF et « XMP  » (et leurs
 * drapeaux VP8X) ; JPEG → segments APP1 (EXIF, XMP), APP13 (IPTC) et
 * commentaires. Le reste de l'image est conservé octet pour octet.
 */
export function sansMetadonnees(o: Uint8Array): Uint8Array | null {
  const t = typeImage(o);
  if (t === "image/webp") {
    const ms = morceauxWebp(o);
    if (!ms) return null;
    const garder = ms.filter((m) => m.type !== "EXIF" && m.type !== "XMP ");
    const parts = garder.map((m) => {
      const fin = Math.min(o.length, m.debut + 8 + m.taille + (m.taille & 1));
      const c = o.slice(m.debut, fin);
      if (m.type === "VP8X") c[8] &= ~(0x08 | 0x04);
      return c;
    });
    const total = 12 + parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    out.set(o.subarray(0, 12), 0);
    const tailleRiff = total - 8;
    out[4] = tailleRiff & 0xff; out[5] = (tailleRiff >> 8) & 0xff; out[6] = (tailleRiff >> 16) & 0xff; out[7] = (tailleRiff >> 24) & 0xff;
    let i = 12;
    for (const p of parts) { out.set(p, i); i += p.length; }
    return out;
  }
  if (t === "image/jpeg") {
    const parts: Uint8Array[] = [o.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= o.length) {
      if (o[i] !== 0xff) return null;
      const m = o[i + 1];
      if (m === 0xda) { parts.push(o.subarray(i)); i = o.length; break; }
      if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { parts.push(o.subarray(i, i + 2)); i += 2; continue; }
      const n = (o[i + 2] << 8) | o[i + 3];
      if (n < 2 || i + 2 + n > o.length) return null;
      if (m !== 0xe1 && m !== 0xed && m !== 0xfe) parts.push(o.subarray(i, i + 2 + n));
      i += 2 + n;
    }
    if (i !== o.length) return null;
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let j = 0;
    for (const p of parts) { out.set(p, j); j += p.length; }
    return out;
  }
  return null;
}

/** Vrai si des métadonnées EXIF / XMP / IPTC sont présentes (contrôle des tests et du back-office). */
export function aDesMetadonnees(o: Uint8Array): boolean {
  const t = typeImage(o);
  if (t === "image/webp") return !!morceauxWebp(o)?.some((m) => m.type === "EXIF" || m.type === "XMP ");
  if (t === "image/jpeg") {
    let i = 2;
    while (i + 4 <= o.length && o[i] === 0xff) {
      const m = o[i + 1];
      if (m === 0xda) return false;
      if (m === 0xe1 || m === 0xed) return true;
      i += 2 + ((o[i + 2] << 8) | o[i + 3]);
    }
  }
  return false;
}

export type ImageValide = { octets: Uint8Array; type: TypeImage; largeur: number; hauteur: number };

/** Contrôle complet d'une image reçue : type réel, taille, dimensions, métadonnées retirées. */
export function validerImage(o: Uint8Array, maxOctets: number, maxCote: number): { ok: true; image: ImageValide } | { ok: false; error: string } {
  if (!o.length) return { ok: false, error: "image_vide" };
  if (o.length > maxOctets) return { ok: false, error: "image_trop_lourde" };
  const type = typeImage(o);
  if (!type) return { ok: false, error: "image_type_invalide" };
  const d = dimensions(o);
  if (!d || d.largeur < 16 || d.hauteur < 16) return { ok: false, error: "image_illisible" };
  if (d.largeur > maxCote || d.hauteur > maxCote) return { ok: false, error: "image_trop_grande" };
  const propre = sansMetadonnees(o);
  if (!propre) return { ok: false, error: "image_illisible" };
  return { ok: true, image: { octets: propre, type, ...d } };
}

const b64 = (s: string): Uint8Array | null => {
  try { return Uint8Array.from(atob(s.replace(/^data:[^,]*,/, "")), (c) => c.charCodeAt(0)); } catch { return null; }
};
export const depuisBase64 = b64;
export const versBase64 = (o: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(s);
};
export const versHex = (o: Uint8Array): string => Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");

/** Identifiant non devinable (128 bits, base64url). */
export function idImage(): string {
  const o = crypto.getRandomValues(new Uint8Array(16));
  return `img_${versBase64(o).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export async function empreinte(o: Uint8Array): Promise<string> {
  return versHex(new Uint8Array(await crypto.subtle.digest("SHA-256", o as Uint8Array<ArrayBuffer>))).slice(0, 32);
}
