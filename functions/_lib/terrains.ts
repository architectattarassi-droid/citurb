/**
 * Annonces de terrains (porte P4) : validation du dépôt, vue publique, requêtes.
 * Les coordonnées du déposant (nom, téléphone, e-mail) ne sortent JAMAIS dans
 * la vue publique : l'acheteur passe par CITURBAREA (lead P4).
 */

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export const DEPOSANTS = ["PROPRIETAIRE", "INTERMEDIAIRE"] as const;
export const TITRES = ["TITRE", "EN_COURS", "NON_TITRE"] as const;
export const USAGES = ["VILLA", "IMMEUBLE", "COMMERCIAL", "AGRICOLE", "AUTRE"] as const;
export const STATUTS = ["EN_ATTENTE", "PUBLIE", "REFUSE", "VENDU"] as const;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const un = <T extends readonly string[]>(v: unknown, l: T): T[number] | undefined => (typeof v === "string" && (l as readonly string[]).includes(v) ? (v as T[number]) : undefined);
const nombre = (v: unknown) => { const x = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[\s ]/g, "")) : NaN; return Number.isFinite(x) && x > 0 ? x : null; };

/** Téléphone marocain ou international (même règle que la capture des leads). */
export function telephone(t: string): string | null {
  const c = t.replace(/[\s.\-()]/g, "");
  if (/^(\+212|00212|0)[567]\d{8}$/.test(c)) return c.startsWith("00212") ? `+${c.slice(2)}` : c;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(c)) return c.startsWith("00") ? `+${c.slice(2)}` : c;
  return null;
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function slugifier(ville: string, quartier: string, surface: number, id: string): string {
  const base = sansAccents(`terrain-${surface}m2-${quartier ? `${quartier}-` : ""}${ville}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return `${base}-${id.slice(-6)}`;
}

export type Depot = {
  deposant: (typeof DEPOSANTS)[number]; mandat: boolean; nom: string; telephone: string; email: string | null;
  ville: string; quartier: string | null; surface: number; prix: number | null;
  titre: (typeof TITRES)[number]; usage: (typeof USAGES)[number]; description: string | null;
};

/** Valide un dépôt. Renvoie le dépôt propre ou un code d'erreur. */
export function validerDepot(b: Record<string, unknown>): Depot | { erreur: string } {
  const deposant = un(b.deposant, DEPOSANTS);
  if (!deposant) return { erreur: "deposant_invalide" };
  if (deposant === "INTERMEDIAIRE" && b.mandat !== true) return { erreur: "mandat_requis" };
  if (b.consentement !== true) return { erreur: "consentement_requis" };
  const nom = clip(b.nom, 120);
  if (nom.length < 2) return { erreur: "nom_invalide" };
  const tel = telephone(clip(b.telephone, 30));
  if (!tel) return { erreur: "telephone_invalide" };
  const ville = clip(b.ville, 80);
  if (ville.length < 2) return { erreur: "ville_invalide" };
  const surface = nombre(b.surface);
  if (!surface || surface < 20 || surface > 10_000_000) return { erreur: "surface_invalide" };
  const prix = nombre(b.prix);
  if (prix != null && (prix < 1_000 || prix > 5_000_000_000)) return { erreur: "prix_invalide" };
  const titre = un(b.titre, TITRES) ?? "EN_COURS";
  const usage = un(b.usage, USAGES) ?? "AUTRE";
  // Pas de coordonnées dans la description publique (téléphone, e-mail, liens).
  const description = clip(b.description, 1500).replace(/(\+?\d[\d\s.\-]{7,}\d)|([^\s@]+@[^\s@]+)|(https?:\/\/\S+)|(wa\.me\/\S+)/gi, "[coordonnées retirées]") || null;
  return { deposant, mandat: b.mandat === true, nom, telephone: tel, email: clip(b.email, 200).toLowerCase() || null, ville, quartier: clip(b.quartier, 80) || null, surface: Math.round(surface), prix: prix ? Math.round(prix) : null, titre, usage, description };
}

/** Vue publique d'une annonce (aucune coordonnée du déposant). */
export function vuePublique(r: Record<string, unknown>) {
  const surface = Number(r.surface) || 0;
  const prix = r.prix == null ? null : Number(r.prix);
  return {
    slug: String(r.slug), ville: String(r.ville), quartier: (r.quartier as string) ?? null, surface, prix,
    prixM2: prix && surface ? Math.round(prix / surface) : null,
    titre: String(r.titre), usage: String(r.usage), description: (r.description as string) ?? null,
    deposant: String(r.deposant), statut: String(r.statut),
    publieAt: r.publieAt instanceof Date ? r.publieAt.toISOString() : r.publieAt ? String(r.publieAt) : null,
  };
}

export async function tableExiste(sql: Sql): Promise<boolean> {
  const r = await sql`SELECT to_regclass('public."TerrainAnnonce"') IS NOT NULL AS t`;
  return !!r[0]?.t;
}

/** Annonces publiées, les plus récentes d'abord (filtre ville facultatif). */
export async function annoncesPubliees(sql: Sql, opts: { ville?: string; limite?: number } = {}) {
  if (!(await tableExiste(sql))) return [];
  const limite = Math.min(Math.max(opts.limite ?? 60, 1), 200);
  const rows = opts.ville
    ? await sql`SELECT * FROM "TerrainAnnonce" WHERE "statut" IN ('PUBLIE', 'VENDU') AND lower("ville") = lower(${opts.ville}) ORDER BY ("statut" = 'VENDU'), "publieAt" DESC NULLS LAST LIMIT ${limite}`
    : await sql`SELECT * FROM "TerrainAnnonce" WHERE "statut" IN ('PUBLIE', 'VENDU') ORDER BY ("statut" = 'VENDU'), "publieAt" DESC NULLS LAST LIMIT ${limite}`;
  return rows.map(vuePublique);
}

export async function annonceParSlug(sql: Sql, slug: string) {
  if (!/^[a-z0-9-]{8,90}$/.test(slug) || !(await tableExiste(sql))) return null;
  const rows = await sql`SELECT * FROM "TerrainAnnonce" WHERE "slug" = ${slug} AND "statut" IN ('PUBLIE', 'VENDU') LIMIT 1`;
  return rows.length ? vuePublique(rows[0]) : null;
}

export const LIB_USAGE: Record<string, string> = { VILLA: "Villa", IMMEUBLE: "Immeuble", COMMERCIAL: "Commercial", AGRICOLE: "Agricole", AUTRE: "Autre" };
export const LIB_TITRE: Record<string, string> = { TITRE: "Titré", EN_COURS: "Titre en cours", NON_TITRE: "Non titré (melk)" };
