/**
 * Dépôt de documents commun — logique pure (testée), sans réseau ni base.
 * Contrat : docs/architecture/contrat-depot-fichiers.md (v2).
 *
 * Réutilise les briques images de la session Cercles (images.ts) et le
 * moteur commun de masquage des coordonnées (coordonnees.ts).
 */
import { detecterCoordonnees, masquerCoordonnees, type TypeCoordonnee } from "./coordonnees";
import { dimensions, empreinte, sansMetadonnees, typeImage, validerImage, versBase64 } from "./images";

export const CONTEXTES_DEPOT = ["conversation", "appel", "dossier", "rdv", "projet", "demande-prix"] as const;
export type ContexteDepot = (typeof CONTEXTES_DEPOT)[number];
/** PRIVE : pièce déposée par le module « pièces du dossier » (documents.ts), régie par ses propres droits. */
export const STATUTS_DOCUMENT = ["EN_COURS", "A_MODERER", "VISIBLE", "REFUSE", "SUPPRIME", "PRIVE"] as const;
export type StatutDocument = (typeof STATUTS_DOCUMENT)[number];
export type Support = "NEON" | "R2";

export const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;
export const TYPES_VIDEO = ["video/mp4", "video/quicktime", "video/webm"] as const;
export type TypeDocument = (typeof TYPES_IMAGE)[number] | "application/pdf" | (typeof TYPES_VIDEO)[number];

const Mo = 1024 * 1024;
/** Plafonds par support (octets) et taille des morceaux. */
export const PLAFONDS = {
  NEON: { image: 1.5 * Mo, pdf: 2 * Mo, video: 0, coteImage: 4000 },
  R2: { image: 50 * Mo, pdf: 200 * Mo, video: 5 * 1024 * Mo, coteImage: 12000 },
} as const;
export const TAILLE_PARTIE = 20 * Mo;
/** Au-delà, envoi en plusieurs morceaux (R2 multipart). */
export const SEUIL_MULTIPART = 20 * Mo;
export const VIGNETTE_MAX = 60 * 1024;
/** Quotas : par contexte (Neon), par déposant et par jour, et plafond global Neon. */
export const QUOTAS = { documentsParContexte: 60, octetsParContexteNeon: 40 * Mo, depotsParJour: 40, totalNeon: 400 * Mo } as const;
export const DUREE_LIEN_S = 15 * 60;

/** Identifiants des deux modules (documents.ts : 32 hexadécimaux ; ici : 22 caractères base64url). */
export const ID_DOCUMENT_RE = /^doc_(?:[A-Za-z0-9_-]{22}|[0-9a-f]{32})$/;
export const OBJET_DEPOT_RE = /^[A-Za-z0-9:_.\-]{1,120}$/;

export type Erreur = { ok: false; status: number; erreur: string };
const ko = (status: number, erreur: string): Erreur => ({ ok: false, status, erreur });

export function idDocument(): string {
  return `doc_${versBase64(crypto.getRandomValues(new Uint8Array(16))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

const famille = (t: string): "image" | "pdf" | "video" | null =>
  (TYPES_IMAGE as readonly string[]).includes(t) ? "image" : t === "application/pdf" ? "pdf" : (TYPES_VIDEO as readonly string[]).includes(t) ? "video" : null;

const EXTENSIONS: Record<TypeDocument, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "application/pdf": ["pdf"],
  "video/mp4": ["mp4", "m4v"], "video/quicktime": ["mov"], "video/webm": ["webm"],
};

// ── Texte saisi : nom, légende, métadonnées ─────────────────────────────

const CONTROLE = /[\u0000-\u001F\u007F]/g;
const coupe = (v: unknown, n: number) => (typeof v === "string" ? Array.from(v.replace(CONTROLE, " ").trim()).slice(0, n).join("") : "");

/** Nom de fichier propre (pas de chemin), coordonnées masquées ; `types` = coordonnées tentées. */
export function nettoyerNom(v: unknown): { nom: string; types: TypeCoordonnee[] } {
  const brut = coupe(v, 140).replace(/[\\/:*?"<>|]+/g, "_").replace(/^\.+/, "") || "document";
  return { nom: masquerCoordonnees(brut), types: detecterCoordonnees(brut) };
}

export type MetaDocument = { phase?: string; categorie?: string; niveau?: string; version?: string; legende?: string };
const CLES_META: (keyof MetaDocument)[] = ["phase", "categorie", "niveau", "version", "legende"];

export function lireMeta(v: unknown): { meta: MetaDocument; types: TypeCoordonnee[] } {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const meta: MetaDocument = {};
  const types = new Set<TypeCoordonnee>();
  for (const k of CLES_META) {
    const s = coupe(o[k], k === "legende" ? 500 : 60);
    if (!s) continue;
    for (const t of detecterCoordonnees(s)) types.add(t);
    meta[k] = masquerCoordonnees(s);
  }
  return { meta, types: [...types] };
}

/** Nom normalisé pour les versions : même nom (sans extension, casse, accents) = nouvelle version. */
export const nomNormalise = (nom: string) => nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\.[a-z0-9]{2,5}$/, "").replace(/[^a-z0-9]+/g, "-");

// ── Plan d'envoi ────────────────────────────────────────────────────────

export type Plan = { mode: "neon" | "r2" | "r2-multipart"; taillePartie: number; parties: number };

/** Choix automatique du support et du découpage selon la configuration et la taille annoncée. */
export function planifier(support: Support, type: unknown, taille: unknown, nom: string): { ok: true; type: TypeDocument; taille: number; plan: Plan } | Erreur {
  if (typeof type !== "string" || !famille(type)) return ko(415, "type_refuse");
  const t = type as TypeDocument;
  const f = famille(t)!;
  const ext = nom.toLowerCase().split(".").pop() || "";
  if (!EXTENSIONS[t].includes(ext)) return ko(415, "extension_incoherente");
  const n = typeof taille === "number" && Number.isInteger(taille) ? taille : NaN;
  if (!(n > 0)) return ko(400, "taille_invalide");
  const max = PLAFONDS[support][f];
  if (f === "video" && support === "NEON") return ko(507, "video_r2_requis");
  if (n > max) return ko(413, "fichier_trop_lourd");
  if (support === "NEON") return { ok: true, type: t, taille: n, plan: { mode: "neon", taillePartie: n, parties: 1 } };
  if (n <= SEUIL_MULTIPART) return { ok: true, type: t, taille: n, plan: { mode: "r2", taillePartie: n, parties: 1 } };
  return { ok: true, type: t, taille: n, plan: { mode: "r2-multipart", taillePartie: TAILLE_PARTIE, parties: Math.ceil(n / TAILLE_PARTIE) } };
}

// ── Contrôle des octets ─────────────────────────────────────────────────

/** Type lu dans les octets (signature). */
export function typeReel(o: Uint8Array): TypeDocument | null {
  const ti = typeImage(o);
  if (ti) return ti;
  if (o.length > 8 && o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47 && o[4] === 0x0d && o[5] === 0x0a && o[6] === 0x1a && o[7] === 0x0a) return "image/png";
  if (o.length > 5 && o[0] === 0x25 && o[1] === 0x50 && o[2] === 0x44 && o[3] === 0x46 && o[4] === 0x2d) return "application/pdf";
  if (o.length > 12 && o[4] === 0x66 && o[5] === 0x74 && o[6] === 0x79 && o[7] === 0x70) {
    const marque = String.fromCharCode(...o.subarray(8, 12));
    return marque === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (o.length > 4 && o[0] === 0x1a && o[1] === 0x45 && o[2] === 0xdf && o[3] === 0xa3) return "video/webm";
  return null;
}

/** Types déclarés compatibles avec le type lu (un .mov peut être lu « mp4 » et inversement). */
const compatibles = (declare: TypeDocument, lu: TypeDocument) => declare === lu || (famille(declare) === "video" && famille(lu) === "video");

// PNG : dimensions (IHDR) et retrait des morceaux de métadonnées (texte, EXIF, date).
const u32be = (o: Uint8Array, i: number) => ((o[i] << 24) | (o[i + 1] << 16) | (o[i + 2] << 8) | o[i + 3]) >>> 0;
const MORCEAUX_PNG_RETIRES = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
export function pngPropre(o: Uint8Array): { octets: Uint8Array; largeur: number; hauteur: number } | null {
  if (o.length < 33 || String.fromCharCode(...o.subarray(12, 16)) !== "IHDR") return null;
  const largeur = u32be(o, 16), hauteur = u32be(o, 20);
  const garder: Uint8Array[] = [o.subarray(0, 8)];
  let i = 8, fin = false;
  while (i + 12 <= o.length) {
    const n = u32be(o, i);
    const type = String.fromCharCode(...o.subarray(i + 4, i + 8));
    const bout = i + 12 + n;
    if (bout > o.length) return null;
    if (!MORCEAUX_PNG_RETIRES.has(type)) garder.push(o.subarray(i, bout));
    i = bout;
    if (type === "IEND") { fin = true; break; }
  }
  if (!fin) return null;
  const total = garder.reduce((s, x) => s + x.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const x of garder) { out.set(x, p); p += x.length; }
  return { octets: out, largeur, hauteur };
}

/** Marqueurs PDF refusés : JavaScript, lancement d'application, fichiers joints, contenus riches. */
export const PDF_INTERDITS = ["/JavaScript", "/JS", "/Launch", "/EmbeddedFile", "/RichMedia", "/XFA"];
/** Recherche des marqueurs interdits dans un morceau de PDF (latin1), avec un recouvrement entre morceaux. */
export function marqueurPdfInterdit(morceau: Uint8Array): string | null {
  let s = "";
  for (let i = 0; i < morceau.length; i += 0x8000) s += String.fromCharCode(...morceau.subarray(i, i + 0x8000));
  return PDF_INTERDITS.find((m) => new RegExp(`${m.replace("/", "\\/")}(?![A-Za-z])`).test(s)) ?? null;
}

export type FichierValide = { octets: Uint8Array | null; type: TypeDocument; largeur: number | null; hauteur: number | null; empreinte: string };

/**
 * Contrôle complet d'un fichier entièrement en mémoire (Neon, ou image / petit
 * PDF sur R2) : signature cohérente avec le type déclaré, plafonds, image
 * sans métadonnées, PDF sans JavaScript ni fichier joint.
 */
export async function validerFichier(o: Uint8Array, declare: TypeDocument, support: Support): Promise<{ ok: true; fichier: FichierValide } | Erreur> {
  if (!o.length) return ko(400, "fichier_vide");
  const lu = typeReel(o);
  if (!lu || !compatibles(declare, lu)) return ko(415, "type_incoherent");
  const p = PLAFONDS[support];
  const f = famille(lu)!;
  if (o.length > p[f]) return ko(413, "fichier_trop_lourd");
  if (f === "image") {
    if (lu === "image/png") {
      const x = pngPropre(o);
      if (!x || x.largeur < 16 || x.hauteur < 16) return ko(415, "image_illisible");
      if (x.largeur > p.coteImage || x.hauteur > p.coteImage) return ko(413, "image_trop_grande");
      return { ok: true, fichier: { octets: x.octets, type: lu, largeur: x.largeur, hauteur: x.hauteur, empreinte: await empreinte(x.octets) } };
    }
    const v = validerImage(o, p.image, p.coteImage);
    if (!v.ok) return ko(415, v.error);
    return { ok: true, fichier: { octets: v.image.octets, type: lu, largeur: v.image.largeur, hauteur: v.image.hauteur, empreinte: await empreinte(v.image.octets) } };
  }
  if (f === "pdf") {
    const m = marqueurPdfInterdit(o);
    if (m) return ko(415, "pdf_contenu_actif");
    return { ok: true, fichier: { octets: o, type: lu, largeur: null, hauteur: null, empreinte: await empreinte(o) } };
  }
  return { ok: true, fichier: { octets: null, type: lu, largeur: null, hauteur: null, empreinte: await empreinte(o.subarray(0, 1024 * 1024)) } };
}

/** Vignette d'image (facultative) : WebP / JPEG ≤ 60 Ko, sans métadonnées. */
export function validerVignette(o: Uint8Array): Uint8Array | null {
  if (!o.length || o.length > VIGNETTE_MAX) return null;
  const v = validerImage(o, VIGNETTE_MAX, 800);
  return v.ok ? v.image.octets : null;
}

export { dimensions, sansMetadonnees };

// ── Statut, visibilité ──────────────────────────────────────────────────

/** Déposé par le cabinet : visible d'emblée ; sinon modération (numéro écrit dans une image ou un PDF non détectable). */
export const statutApresEnvoi = (parCabinet: boolean): StatutDocument => (parCabinet ? "VISIBLE" : "A_MODERER");

export type LigneDocument = {
  id: string; contexte: ContexteDepot; objetId: string; deposantCle: string; deposantNom: string; nom: string; nomNormalise: string; type: TypeDocument;
  taille: number; empreinte: string | null; support: Support; cleR2: string | null; largeur: number | null; hauteur: number | null;
  meta: MetaDocument; version: number; statut: StatutDocument; motif: string | null; moderePar: string | null; modereLe: string | null;
  supprimePar: string | null; supprimeLe: string | null; televersement: { uploadId?: string; parties?: { partNumber: number; etag: string }[]; plan: Plan; vignette?: "oui" } | null;
  aVignette: boolean; driveId: string | null; createdAt: string; updatedAt: string;
};

/** Ce document est-il visible pour ce lecteur ? */
export function visible(d: LigneDocument, lecteurCle: string, cabinet: boolean): boolean {
  if (cabinet) return d.statut !== "EN_COURS";
  if (d.statut === "SUPPRIME" || d.statut === "EN_COURS") return false;
  if (d.deposantCle === lecteurCle) return true;
  // Pièce du dossier (module documents.ts) : ses règles propres s'appliquent, ici cabinet et déposant seulement.
  if (d.statut === "PRIVE") return false;
  return d.statut === "VISIBLE";
}

/** Vue d'un document : jamais la clé de stockage ni l'identité stable du déposant. */
export const vueDocument = (d: LigneDocument, lecteurCle: string, cabinet: boolean) => ({
  id: d.id, contexte: d.contexte, objetId: d.objetId, nom: d.nom, type: d.type, taille: d.taille, statut: d.statut, version: d.version, meta: d.meta,
  deposant: d.deposantNom, moi: d.deposantCle === lecteurCle, largeur: d.largeur, hauteur: d.hauteur, aVignette: d.aVignette,
  createdAt: d.createdAt, motif: d.statut === "REFUSE" && (cabinet || d.deposantCle === lecteurCle) ? d.motif : null,
  ...(cabinet ? { support: d.support, archiveDrive: !!d.driveId, supprimePar: d.supprimePar, supprimeLe: d.supprimeLe, moderePar: d.moderePar, modereLe: d.modereLe } : {}),
});

// ── Liens signés ────────────────────────────────────────────────────────

const enc = new TextEncoder();
async function hmacHex(secret: string, d: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(d))), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

/** Lien de lecture signé, valable DUREE_LIEN_S secondes. */
export async function lienSigne(secret: string, id: string, vignette: boolean, maintenant = Date.now()): Promise<{ url: string; expire: string }> {
  const e = Math.floor(maintenant / 1000) + DUREE_LIEN_S;
  const s = await hmacHex(secret, `depot|${id}|${e}|${vignette ? "v" : "f"}`);
  return { url: `/api/depot/f/${id}?e=${e}&s=${s}${vignette ? "&taille=vignette" : ""}`, expire: new Date(e * 1000).toISOString() };
}

export async function verifierLien(secret: string, id: string, e: string | null, s: string | null, vignette: boolean, maintenant = Date.now()): Promise<boolean> {
  if (!ID_DOCUMENT_RE.test(id) || !e || !s || !/^\d{9,11}$/.test(e) || !/^[0-9a-f]{40}$/.test(s)) return false;
  if (Number(e) < Math.floor(maintenant / 1000)) return false;
  const attendu = await hmacHex(secret, `depot|${id}|${e}|${vignette ? "v" : "f"}`);
  let diff = 0;
  for (let i = 0; i < 40; i++) diff |= attendu.charCodeAt(i) ^ s.charCodeAt(i);
  return diff === 0;
}
