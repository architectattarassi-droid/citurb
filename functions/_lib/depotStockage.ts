/**
 * Dépôt de documents — stockage Neon : table "DocumentDepose" PARTAGÉE avec
 * les pièces du dossier (functions/_lib/documents.ts, session Gestion de
 * projet ; docs/sql/gestion-projet-neon.sql), étendue par
 * docs/sql/documents-neon.sql (support, versions, métadonnées, modération,
 * envoi en morceaux, archive Drive). Jamais créée ici ; absente → 503.
 * Vocabulaire de la table : "proprietaire" (= déposant) et statuts
 * PRIVE | PENDING | APPROVED | REJECTED (+ EN_COURS, SUPPRIME), traduits ici.
 * Conventions de imagesDepot.ts : octets écrits en hex (`decode(…, 'hex')`),
 * lus un par un en base64 (`encode(…, 'base64')`), listes SANS octets.
 */
import type { LigneDocument, StatutDocument } from "./depotRegles";

/** Statut du code → valeur en base (vocabulaire partagé avec les pièces du dossier). */
const VERS_BASE: Record<StatutDocument, string> = { EN_COURS: "EN_COURS", A_MODERER: "PENDING", VISIBLE: "APPROVED", REFUSE: "REJECTED", SUPPRIME: "SUPPRIME", PRIVE: "PRIVE" };
const DEPUIS_BASE: Record<string, StatutDocument> = Object.fromEntries(Object.entries(VERS_BASE).map(([k, v]) => [v, k as StatutDocument]));
export const statutBase = (s: StatutDocument) => VERS_BASE[s];

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export interface DepotFichiers {
  tablePresente(): Promise<boolean>;
  creer(d: LigneDocument): Promise<void>;
  lire(id: string): Promise<LigneDocument | null>;
  maj(id: string, champs: Partial<LigneDocument>): Promise<void>;
  ecrireOctets(id: string, hex: string | null, vignetteHex?: string | null): Promise<void>;
  lireOctets(id: string, vignette: boolean): Promise<string | null>;
  lister(contexte: string, objetId: string): Promise<LigneDocument[]>;
  aModerer(limite: number): Promise<LigneDocument[]>;
  compterContexte(contexte: string, objetId: string): Promise<{ n: number; octetsNeon: number }>;
  compterDeposant(cle: string, depuis: string): Promise<number>;
  totalNeon(): Promise<number>;
  versionMax(contexte: string, objetId: string, nomNorm: string, categorie: string): Promise<number>;
}

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const json = <T>(v: unknown, d: T): T => (v == null ? d : (typeof v === "string" ? JSON.parse(v) : v) as T);

const ligne = (r: Record<string, unknown>): LigneDocument => ({
  id: String(r.id), contexte: r.contexte as LigneDocument["contexte"], objetId: String(r.objetId), deposantCle: String(r.proprietaire), deposantNom: String(r.deposantNom || "CITURBAREA"),
  nom: String(r.nom), nomNormalise: String(r.nomNormalise ?? ""), type: r.type as LigneDocument["type"], taille: Number(r.taille), empreinte: (r.empreinte as string) || null, support: (r.support as LigneDocument["support"]) || "NEON",
  cleR2: (r.cleR2 as string) ?? null, largeur: r.largeur == null ? null : Number(r.largeur), hauteur: r.hauteur == null ? null : Number(r.hauteur),
  meta: json(r.meta, {}), version: Number(r.version) || 1, statut: DEPUIS_BASE[String(r.statut)] ?? "PRIVE", motif: (r.motif as string) ?? null,
  moderePar: (r.moderePar as string) ?? null, modereLe: iso(r.modereLe), supprimePar: (r.supprimePar as string) ?? null, supprimeLe: iso(r.supprimeLe),
  televersement: json(r.televersement, null), aVignette: !!r.aVignette, driveId: (r.driveId as string) ?? null, createdAt: iso(r.createdAt)!, updatedAt: iso(r.updatedAt ?? r.createdAt)!,
});


export function depotFichiersNeon(sql: Sql): DepotFichiers {
  // Le pilote HTTP Neon ne compose pas une liste de colonnes en fragment : requêtes écrites en entier.
  const select = async (where: (s: Sql) => Promise<Record<string, unknown>[]>) => (await where(sql)).map(ligne);
  return {
    async tablePresente() {
      const r = await sql`SELECT to_regclass('public."DocumentDepose"') IS NOT NULL AS d`;
      return !!r[0]?.d;
    },
    async creer(d) {
      await sql`INSERT INTO "DocumentDepose" ("id","contexte","objetId","proprietaire","deposantNom","nom","nomNormalise","type","taille","empreinte","support","cleR2","largeur","hauteur",
        "meta","version","statut","televersement","createdAt","updatedAt")
        VALUES (${d.id}, ${d.contexte}, ${d.objetId}, ${d.deposantCle}, ${d.deposantNom}, ${d.nom}, ${d.nomNormalise}, ${d.type}, ${d.taille}, ${d.empreinte ?? ""}, ${d.support}, ${d.cleR2},
        ${d.largeur}, ${d.hauteur}, ${JSON.stringify(d.meta)}::jsonb, ${d.version}, ${VERS_BASE[d.statut]}, ${JSON.stringify(d.televersement)}::jsonb, ${d.createdAt}::timestamptz, ${d.updatedAt}::timestamptz)`;
    },
    async lire(id) {
      const r = await sql`SELECT "id","contexte","objetId","proprietaire","deposantNom","nom","nomNormalise","type","taille","empreinte","support","cleR2","largeur","hauteur","meta","version","statut","motif",
        "moderePar","modereLe","supprimePar","supprimeLe","televersement","driveId","createdAt","updatedAt",
        ("vignette" IS NOT NULL OR "televersement"->>'vignette' = 'oui') AS "aVignette" FROM "DocumentDepose" WHERE "id" = ${id} LIMIT 1`;
      return r.length ? ligne(r[0]) : null;
    },
    async maj(id, c) {
      const t = await this.lire(id);
      if (!t) return;
      const n = { ...t, ...c };
      await sql`UPDATE "DocumentDepose" SET "nom" = ${n.nom}, "type" = ${n.type}, "taille" = ${n.taille}, "empreinte" = ${n.empreinte ?? ""}, "largeur" = ${n.largeur}, "hauteur" = ${n.hauteur},
        "meta" = ${JSON.stringify(n.meta)}::jsonb, "version" = ${n.version}, "statut" = ${VERS_BASE[n.statut]}, "motif" = ${n.motif}, "moderePar" = ${n.moderePar}, "modereLe" = ${n.modereLe}::timestamptz,
        "supprimePar" = ${n.supprimePar}, "supprimeLe" = ${n.supprimeLe}::timestamptz, "televersement" = ${JSON.stringify(n.televersement)}::jsonb, "driveId" = ${n.driveId},
        "updatedAt" = ${new Date().toISOString()}::timestamptz WHERE "id" = ${id}`;
    },
    async ecrireOctets(id, hex, vignetteHex) {
      if (vignetteHex !== undefined) await sql`UPDATE "DocumentDepose" SET "vignette" = CASE WHEN ${vignetteHex}::text IS NULL THEN NULL ELSE decode(${vignetteHex}, 'hex') END WHERE "id" = ${id}`;
      else await sql`UPDATE "DocumentDepose" SET "octets" = CASE WHEN ${hex}::text IS NULL THEN NULL ELSE decode(${hex}, 'hex') END WHERE "id" = ${id}`;
    },
    async lireOctets(id, vignette) {
      const r = vignette
        ? await sql`SELECT encode("vignette", 'base64') AS b FROM "DocumentDepose" WHERE "id" = ${id} LIMIT 1`
        : await sql`SELECT encode("octets", 'base64') AS b FROM "DocumentDepose" WHERE "id" = ${id} LIMIT 1`;
      return r[0]?.b ? String(r[0].b).replace(/\s+/g, "") : null;
    },
    lister: (contexte, objetId) => select((s) => s`SELECT "id","contexte","objetId","proprietaire","deposantNom","nom","nomNormalise","type","taille","empreinte","support","cleR2","largeur","hauteur","meta","version","statut","motif",
      "moderePar","modereLe","supprimePar","supprimeLe","televersement","driveId","createdAt","updatedAt",
      ("vignette" IS NOT NULL OR "televersement"->>'vignette' = 'oui') AS "aVignette"
      FROM "DocumentDepose" WHERE "contexte" = ${contexte} AND "objetId" = ${objetId} AND "statut" <> 'EN_COURS' ORDER BY "createdAt" DESC, "version" DESC LIMIT 500`),
    aModerer: (limite) => select((s) => s`SELECT "id","contexte","objetId","proprietaire","deposantNom","nom","nomNormalise","type","taille","empreinte","support","cleR2","largeur","hauteur","meta","version","statut","motif",
      "moderePar","modereLe","supprimePar","supprimeLe","televersement","driveId","createdAt","updatedAt",
      ("vignette" IS NOT NULL OR "televersement"->>'vignette' = 'oui') AS "aVignette"
      FROM "DocumentDepose" WHERE "statut" = 'PENDING' ORDER BY "createdAt" ASC LIMIT ${limite}`),
    async compterContexte(contexte, objetId) {
      const r = await sql`SELECT count(*)::int AS n, COALESCE(sum(CASE WHEN COALESCE("support", 'NEON') = 'NEON' THEN "taille" ELSE 0 END), 0)::bigint AS o
        FROM "DocumentDepose" WHERE "contexte" = ${contexte} AND "objetId" = ${objetId} AND "statut" NOT IN ('SUPPRIME', 'REJECTED')`;
      return { n: Number(r[0]?.n) || 0, octetsNeon: Number(r[0]?.o) || 0 };
    },
    async compterDeposant(cle, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "DocumentDepose" WHERE "proprietaire" = ${cle} AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async totalNeon() {
      const r = await sql`SELECT COALESCE(sum("taille"), 0)::bigint AS o FROM "DocumentDepose" WHERE COALESCE("support", 'NEON') = 'NEON' AND "statut" <> 'REJECTED'`;
      return Number(r[0]?.o) || 0;
    },
    async versionMax(contexte, objetId, nomNorm, categorie) {
      const r = await sql`SELECT COALESCE(max("version"), 0)::int AS v FROM "DocumentDepose" WHERE "contexte" = ${contexte} AND "objetId" = ${objetId}
        AND "nomNormalise" = ${nomNorm} AND COALESCE("meta"->>'categorie', '') = ${categorie} AND "statut" <> 'EN_COURS'`;
      return Number(r[0]?.v) || 0;
    },
  };
}

/** Dépôt en mémoire (tests, même contrat). */
export function depotFichiersMemoire(): DepotFichiers & { lignes: Map<string, LigneDocument & { octets?: string | null; vignette?: string | null }> } {
  const lignes = new Map<string, LigneDocument & { octets?: string | null; vignette?: string | null }>();
  const hexB64 = (hex: string) => btoa(hex.match(/../g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join(""));
  const cp = (d: LigneDocument & { vignette?: string | null }): LigneDocument => {
    const { octets: _o, vignette, ...reste } = structuredClone(d) as LigneDocument & { octets?: unknown; vignette?: unknown };
    return { ...reste, aVignette: !!vignette || reste.televersement?.["vignette" as never] === "oui" } as LigneDocument;
  };
  const vivants = () => [...lignes.values()];
  return {
    lignes,
    tablePresente: async () => true,
    creer: async (d) => { lignes.set(d.id, structuredClone(d)); },
    lire: async (id) => (lignes.has(id) ? cp(lignes.get(id)!) : null),
    maj: async (id, c) => { const d = lignes.get(id); if (d) lignes.set(id, { ...d, ...structuredClone(c) }); },
    ecrireOctets: async (id, hex, vHex) => { const d = lignes.get(id); if (!d) return; if (vHex !== undefined) d.vignette = vHex ? hexB64(vHex) : null; else d.octets = hex ? hexB64(hex) : null; },
    lireOctets: async (id, v) => { const d = lignes.get(id); return (v ? d?.vignette : d?.octets) ?? null; },
    lister: async (ctx, obj) => vivants().filter((d) => d.contexte === ctx && d.objetId === obj && d.statut !== "EN_COURS").sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.version - a.version).map(cp),
    aModerer: async (n) => vivants().filter((d) => d.statut === "A_MODERER").slice(0, n).map(cp),
    compterContexte: async (ctx, obj) => {
      const l = vivants().filter((d) => d.contexte === ctx && d.objetId === obj && d.statut !== "SUPPRIME" && d.statut !== "REFUSE");
      return { n: l.length, octetsNeon: l.filter((d) => d.support === "NEON").reduce((s, d) => s + d.taille, 0) };
    },
    compterDeposant: async (cle, depuis) => vivants().filter((d) => d.deposantCle === cle && d.createdAt >= depuis).length,
    totalNeon: async () => vivants().filter((d) => d.support === "NEON" && d.statut !== "REFUSE").reduce((s, d) => s + d.taille, 0),
    versionMax: async (ctx, obj, nn, cat) => Math.max(0, ...vivants().filter((d) => d.contexte === ctx && d.objetId === obj && d.nomNormalise === nn && (d.meta.categorie ?? "") === cat && d.statut !== "EN_COURS").map((d) => d.version)),
  };
}
