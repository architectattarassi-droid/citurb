/**
 * Dépôt de documents commun (PDF et images) — contrat docs/architecture/contrat-depot-fichiers.md.
 * Table "DocumentDepose" (docs/sql/gestion-projet-neon.sql). Premier usage : pièces
 * du dossier (GP2) ; réutilisable par les appels vidéo, la messagerie et les Cercles.
 *
 * Règles : type lu dans les octets (jamais le nom ni le content-type déclaré),
 * PDF sans JavaScript ni fichier joint, images sans métadonnées (GPS compris),
 * taille plafonnée, nom de fichier sans coordonnées, identifiant non devinable.
 * Le service ne décide pas QUI lit : chaque module vérifie l'appartenance puis appelle `octets(id)`.
 */
import { depuisBase64, empreinte, validerImage, versBase64, versHex } from "./images";
import { masquerCoordonnees } from "./coordonnees";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export const DOC_MAX_PDF = 4 * 1024 * 1024;
export const DOC_MAX_IMAGE = 900 * 1024;
export const DOC_MAX_COTE = 3000;
/** Quota par objet (dossier, appel…) : la base Neon gratuite fait 0,5 Go en tout. */
export const OCTETS_PAR_OBJET = 60 * 1024 * 1024;

export type TypeDocument = "application/pdf" | "image/webp" | "image/jpeg";
export interface DocumentValide { octets: Uint8Array; type: TypeDocument; nom: string }

const PDF_ACTIF = /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction\s*<<[^>]*\/JS)\b/;

/** Nom affichable : sans chemin, sans coordonnées, borné. */
export function nomDocument(v: unknown, type: TypeDocument): string {
  let s = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 120) : "";
  s = masquerCoordonnees(s).replace(/\[coordonnées masquées[^\]]*\]/g, "_");
  const ext = type === "application/pdf" ? ".pdf" : type === "image/webp" ? ".webp" : ".jpg";
  if (!s || s === "." || s === "..") s = "document";
  return /\.[a-z0-9]{2,5}$/i.test(s) ? s : s + ext;
}

/** Contrôle complet d'un document reçu (octets bruts). */
export function validerDocument(o: Uint8Array, nom: unknown): { ok: true; doc: DocumentValide } | { ok: false; error: string } {
  if (!o.length) return { ok: false, error: "document_vide" };
  if (o[0] === 0x25 && o[1] === 0x50 && o[2] === 0x44 && o[3] === 0x46 && o[4] === 0x2d) { // %PDF-
    if (o.length > DOC_MAX_PDF) return { ok: false, error: "document_trop_lourd" };
    let texte = "";
    for (let i = 0; i < o.length; i += 0x8000) texte += String.fromCharCode(...o.subarray(i, i + 0x8000));
    if (PDF_ACTIF.test(texte)) return { ok: false, error: "pdf_actif_refuse" };
    return { ok: true, doc: { octets: o, type: "application/pdf", nom: nomDocument(nom, "application/pdf") } };
  }
  const v = validerImage(o, DOC_MAX_IMAGE, DOC_MAX_COTE);
  if (!v.ok) return { ok: false, error: v.error === "image_type_invalide" ? "type_refuse" : v.error };
  return { ok: true, doc: { octets: v.image.octets, type: v.image.type, nom: nomDocument(nom, v.image.type) } };
}

export function idDocument(): string {
  return `doc_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export interface MetaDocument { id: string; contexte: string; objetId: string; proprietaire: string; type: string; nom: string; taille: number; createdAt: string }
export interface OctetsDocument { base64: string; type: string; nom: string; empreinte: string }

export interface DepotDocuments {
  pret(): Promise<boolean>;
  occupe(contexte: string, objetId: string): Promise<number>;
  inserer(d: { contexte: string; objetId: string; proprietaire: string; doc: DocumentValide }, le: string): Promise<MetaDocument>;
  metas(ids: string[]): Promise<MetaDocument[]>;
  octets(id: string): Promise<OctetsDocument | null>;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));
const meta = (r: Record<string, unknown>): MetaDocument => ({
  id: String(r.id), contexte: String(r.contexte), objetId: String(r.objetId), proprietaire: String(r.proprietaire),
  type: String(r.type), nom: String(r.nom), taille: Number(r.taille) || 0, createdAt: iso(r.createdAt),
});

export function depotDocumentsNeon(sql: Sql): DepotDocuments {
  return {
    async pret() {
      const r = await sql`SELECT to_regclass('public."DocumentDepose"') IS NOT NULL AS ok`;
      return !!r[0]?.ok;
    },
    async occupe(contexte, objetId) {
      const r = await sql`SELECT coalesce(sum("taille"), 0)::bigint AS n FROM "DocumentDepose" WHERE "contexte" = ${contexte} AND "objetId" = ${objetId}`;
      return Number(r[0]?.n) || 0;
    },
    async inserer(d, le) {
      const id = idDocument();
      const e = await empreinte(d.doc.octets);
      await sql`INSERT INTO "DocumentDepose" ("id", "contexte", "objetId", "proprietaire", "type", "nom", "taille", "octets", "empreinte", "statut", "createdAt")
        VALUES (${id}, ${d.contexte}, ${d.objetId}, ${d.proprietaire}, ${d.doc.type}, ${d.doc.nom}, ${d.doc.octets.length}, decode(${versHex(d.doc.octets)}, 'hex'), ${e}, 'PRIVE', ${le}::timestamp(3))`;
      return { id, contexte: d.contexte, objetId: d.objetId, proprietaire: d.proprietaire, type: d.doc.type, nom: d.doc.nom, taille: d.doc.octets.length, createdAt: le };
    },
    async metas(ids) {
      if (!ids.length) return [];
      const r = await sql`SELECT "id", "contexte", "objetId", "proprietaire", "type", "nom", "taille", "createdAt" FROM "DocumentDepose" WHERE "id" = ANY(${ids}::text[])`;
      return r.map(meta);
    },
    async octets(id) {
      const r = (await sql`SELECT encode("octets", 'base64') AS "b64", "type", "nom", "empreinte" FROM "DocumentDepose" WHERE "id" = ${id}`)[0];
      return r ? { base64: String(r.b64 ?? ""), type: String(r.type), nom: String(r.nom), empreinte: String(r.empreinte) } : null;
    },
  };
}

/** Dépôt en mémoire (tests). */
export function depotDocumentsMemoire(): DepotDocuments & { lignes: Map<string, MetaDocument & { octets: Uint8Array }> } {
  const lignes = new Map<string, MetaDocument & { octets: Uint8Array }>();
  return {
    lignes,
    async pret() { return true; },
    async occupe(c, o) { let n = 0; for (const l of lignes.values()) if (l.contexte === c && l.objetId === o) n += l.taille; return n; },
    async inserer(d, le) {
      const m: MetaDocument = { id: idDocument(), contexte: d.contexte, objetId: d.objetId, proprietaire: d.proprietaire, type: d.doc.type, nom: d.doc.nom, taille: d.doc.octets.length, createdAt: le };
      lignes.set(m.id, { ...m, octets: d.doc.octets });
      return m;
    },
    async metas(ids) { return ids.map((i) => lignes.get(i)).filter((x): x is MetaDocument & { octets: Uint8Array } => !!x).map(({ octets: _o, ...m }) => m); },
    async octets(id) { const l = lignes.get(id); return l ? { base64: versBase64(l.octets), type: l.type, nom: l.nom, empreinte: "test" } : null; },
  };
}

/** Réponse binaire privée : PDF téléchargé, image affichée ; jamais en cache public. */
export function reponseDocument(o: OctetsDocument | null): Response {
  if (!o || !o.base64) return new Response("Document introuvable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  const octets = depuisBase64(o.base64);
  if (!octets) return new Response("Document illisible", { status: 500 });
  const pdf = o.type === "application/pdf";
  const nom = o.nom.replace(/[^\w.\- ]/g, "_");
  return new Response(octets as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": o.type, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex",
      "content-disposition": `${pdf ? "attachment" : "inline"}; filename="${nom}"`, "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}
