/**
 * Accès Neon des tables Cercles "Fournisseur", "SupplierPrice",
 * "SupplierPriceHistory" (SQL : docs/prix/sql/cercles-fournisseurs.sql).
 * Interface `Depot` : la logique (fournisseurs.ts) ne voit qu'elle, les tests
 * lui passent un dépôt en mémoire.
 */

import type { Sql } from "./cercles";

export type Ligne = Record<string, unknown>;

export interface FicheEcrite {
  id: string; fournisseurId: string; materiauCode: string; uniteVente: string; prixHT: number; tvaPct: number; prixRefHT: number;
  quantiteMin: number | null; degressifs: unknown[]; livraison: unknown[]; disponibilite: string; validiteJusquau: string | null;
  marque: string | null; note: string | null; statut: string; signalement: string | null; ecartRef: number | null;
}

export interface FournisseurEcrit {
  id: string; metier: string; raisonSociale: string; slug: string; contactNom: string | null; ice: string | null; ville: string;
  region: string | null; zonesLivraison: string[]; categories: string[]; telephone: string; email: string; logoUrl: string | null;
  siteWeb: string | null; description: string | null; idempotencyKey: string | null; events: unknown[]; meta: Ligne;
}

export interface ProfilModifiable {
  contactNom: string | null; ville: string; region: string | null; zonesLivraison: string[]; categories: string[];
  telephone: string; logoUrl: string | null; siteWeb: string | null; description: string | null; ice: string | null;
}

export interface Depot {
  fParId(id: string): Promise<Ligne | null>;
  fParEmail(email: string): Promise<Ligne | null>;
  fParIdempotence(cle: string): Promise<Ligne | null>;
  fSlugPris(slug: string): Promise<boolean>;
  fInserer(f: FournisseurEcrit): Promise<void>;
  fMajCode(id: string, hash: string | null, expire: string | null, meta?: Ligne): Promise<void>;
  fTentative(id: string): Promise<void>;
  fConnecte(id: string): Promise<void>;
  fMajProfil(id: string, p: ProfilModifiable): Promise<Ligne | null>;
  fModerer(id: string, statut: string, motif: string | null, commissionPct: number | null | undefined, evenement: Ligne): Promise<Ligne | null>;
  fLister(statut: string | null): Promise<Ligne[]>;

  pLister(fournisseurId: string): Promise<Ligne[]>;
  pParMateriau(fournisseurId: string, code: string): Promise<Ligne | null>;
  pEnregistrer(f: FicheEcrite): Promise<Ligne>;
  pSupprimer(fournisseurId: string, id: string): Promise<Ligne | null>;
  pHistoriser(h: { priceId: string; fournisseurId: string; materiauCode: string; action: string; auteur: string; prixHT: number | null; prixRefHT: number | null; uniteVente: string | null; donnees: Ligne | null }): Promise<void>;
  pHistorique(priceId: string): Promise<Ligne[]>;
  /** Fiches à modérer : PENDING ou signalées, avec la raison sociale du fournisseur. */
  pAModerer(): Promise<Ligne[]>;
  pModerer(id: string, statut: string, auteur: string): Promise<Ligne | null>;
}

const j = (v: unknown) => JSON.stringify(v ?? null);
const nouvelIdH = () => `sph_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function depotNeon(sql: Sql): Depot {
  const un = async (p: Promise<Ligne[]>) => (await p)[0] ?? null;
  return {
    fParId: (id) => un(sql`SELECT * FROM "Fournisseur" WHERE "id" = ${id} LIMIT 1`),
    fParEmail: (email) => un(sql`SELECT * FROM "Fournisseur" WHERE "email" = ${email} LIMIT 1`),
    fParIdempotence: (cle) => un(sql`SELECT * FROM "Fournisseur" WHERE "idempotencyKey" = ${cle} LIMIT 1`),
    fSlugPris: async (slug) => (await sql`SELECT 1 FROM "Fournisseur" WHERE "slug" = ${slug} LIMIT 1`).length > 0,
    fInserer: async (f) => {
      await sql`INSERT INTO "Fournisseur" ("id", "metier", "raisonSociale", "slug", "contactNom", "ice", "ville", "region",
          "zonesLivraison", "categories", "telephone", "email", "logoUrl", "siteWeb", "description", "idempotencyKey", "events", "meta")
        VALUES (${f.id}, ${f.metier}, ${f.raisonSociale}, ${f.slug}, ${f.contactNom}, ${f.ice}, ${f.ville}, ${f.region},
          ${f.zonesLivraison}::text[], ${f.categories}::text[], ${f.telephone}, ${f.email}, ${f.logoUrl}, ${f.siteWeb}, ${f.description},
          ${f.idempotencyKey}, ${j(f.events)}::jsonb, ${j(f.meta)}::jsonb)`;
    },
    fMajCode: async (id, hash, expire, meta) => {
      await sql`UPDATE "Fournisseur" SET "codeHash" = ${hash}, "codeExpire" = ${expire}::timestamp(3), "codeTentatives" = 0,
        "meta" = COALESCE("meta", '{}'::jsonb) || ${j(meta || {})}::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
    },
    fTentative: async (id) => { await sql`UPDATE "Fournisseur" SET "codeTentatives" = "codeTentatives" + 1 WHERE "id" = ${id}`; },
    fConnecte: async (id) => {
      await sql`UPDATE "Fournisseur" SET "codeHash" = NULL, "codeExpire" = NULL, "codeTentatives" = 0,
        "derniereConnexion" = CURRENT_TIMESTAMP, "meta" = COALESCE("meta", '{}'::jsonb) - 'codeDemandeLe' WHERE "id" = ${id}`;
    },
    fMajProfil: (id, p) => un(sql`UPDATE "Fournisseur" SET "contactNom" = ${p.contactNom}, "ville" = ${p.ville}, "region" = ${p.region},
        "zonesLivraison" = ${p.zonesLivraison}::text[], "categories" = ${p.categories}::text[], "telephone" = ${p.telephone},
        "logoUrl" = ${p.logoUrl}, "siteWeb" = ${p.siteWeb}, "description" = ${p.description}, "ice" = ${p.ice},
        "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING *`),
    fModerer: (id, statut, motif, commissionPct, evenement) => un(sql`UPDATE "Fournisseur" SET "statut" = ${statut}, "motifRejet" = ${motif},
        "commissionPct" = CASE WHEN ${commissionPct === undefined}::boolean THEN "commissionPct" ELSE ${commissionPct ?? null}::double precision END,
        "events" = COALESCE("events", '[]'::jsonb) || ${j([evenement])}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} RETURNING *`),
    fLister: (statut) => statut
      ? sql`SELECT f.*, (SELECT count(*)::int FROM "SupplierPrice" p WHERE p."fournisseurId" = f."id") AS "nbFiches"
            FROM "Fournisseur" f WHERE f."statut" = ${statut} ORDER BY f."createdAt" DESC LIMIT 500`
      : sql`SELECT f.*, (SELECT count(*)::int FROM "SupplierPrice" p WHERE p."fournisseurId" = f."id") AS "nbFiches"
            FROM "Fournisseur" f ORDER BY f."createdAt" DESC LIMIT 500`,

    pLister: (fid) => sql`SELECT * FROM "SupplierPrice" WHERE "fournisseurId" = ${fid} ORDER BY "materiauCode"`,
    pParMateriau: (fid, code) => un(sql`SELECT * FROM "SupplierPrice" WHERE "fournisseurId" = ${fid} AND "materiauCode" = ${code} LIMIT 1`),
    pEnregistrer: async (f) => (await sql`INSERT INTO "SupplierPrice" ("id", "fournisseurId", "materiauCode", "uniteVente", "prixHT", "tvaPct",
          "prixRefHT", "quantiteMin", "degressifs", "livraison", "disponibilite", "validiteJusquau", "marque", "note", "statut", "signalement", "ecartRef")
        VALUES (${f.id}, ${f.fournisseurId}, ${f.materiauCode}, ${f.uniteVente}, ${f.prixHT}, ${f.tvaPct}, ${f.prixRefHT}, ${f.quantiteMin},
          ${j(f.degressifs)}::jsonb, ${j(f.livraison)}::jsonb, ${f.disponibilite}, ${f.validiteJusquau}::date, ${f.marque}, ${f.note},
          ${f.statut}, ${f.signalement}, ${f.ecartRef})
        ON CONFLICT ("fournisseurId", "materiauCode") DO UPDATE SET "uniteVente" = EXCLUDED."uniteVente", "prixHT" = EXCLUDED."prixHT",
          "tvaPct" = EXCLUDED."tvaPct", "prixRefHT" = EXCLUDED."prixRefHT", "quantiteMin" = EXCLUDED."quantiteMin",
          "degressifs" = EXCLUDED."degressifs", "livraison" = EXCLUDED."livraison", "disponibilite" = EXCLUDED."disponibilite",
          "validiteJusquau" = EXCLUDED."validiteJusquau", "marque" = EXCLUDED."marque", "note" = EXCLUDED."note",
          "statut" = EXCLUDED."statut", "signalement" = EXCLUDED."signalement", "ecartRef" = EXCLUDED."ecartRef",
          "moderePar" = NULL, "modereLe" = NULL, "updatedAt" = CURRENT_TIMESTAMP
        RETURNING *`)[0],
    pSupprimer: (fid, id) => un(sql`DELETE FROM "SupplierPrice" WHERE "id" = ${id} AND "fournisseurId" = ${fid} RETURNING *`),
    pHistoriser: async (h) => {
      await sql`INSERT INTO "SupplierPriceHistory" ("id", "priceId", "fournisseurId", "materiauCode", "action", "auteur", "prixHT", "prixRefHT", "uniteVente", "donnees")
        VALUES (${nouvelIdH()}, ${h.priceId}, ${h.fournisseurId}, ${h.materiauCode}, ${h.action}, ${h.auteur}, ${h.prixHT}, ${h.prixRefHT}, ${h.uniteVente}, ${j(h.donnees)}::jsonb)`;
    },
    pHistorique: (priceId) => sql`SELECT * FROM "SupplierPriceHistory" WHERE "priceId" = ${priceId} ORDER BY "at" DESC LIMIT 100`,
    pAModerer: () => sql`SELECT p.*, f."raisonSociale", f."ville", f."statut" AS "statutFournisseur"
        FROM "SupplierPrice" p JOIN "Fournisseur" f ON f."id" = p."fournisseurId"
        WHERE p."statut" = 'PENDING' OR (p."signalement" IS NOT NULL AND p."moderePar" IS NULL)
        ORDER BY p."updatedAt" DESC LIMIT 500`,
    pModerer: (id, statut, auteur) => un(sql`UPDATE "SupplierPrice" SET "statut" = ${statut}, "moderePar" = ${auteur}, "modereLe" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} RETURNING *`),
  };
}

/**
 * Exécute une action sur le dépôt Neon : base non configurée, table absente
 * (SQL pas encore collé) ou erreur → 503 propre, jamais de CREATE TABLE.
 */
export async function avecDepot(
  env: { DATABASE_URL?: string },
  action: (depot: Depot, sql: Sql) => Promise<import("./cercles").Reponse>,
  nom: string,
): Promise<import("./cercles").Reponse> {
  if (!env.DATABASE_URL) return { status: 503, json: { ok: false, error: "storage_unavailable" } };
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(env.DATABASE_URL) as unknown as Sql;
  try {
    return await action(depotNeon(sql), sql);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    console.error(`[${nom}] base indisponible (${code || "sans code"})`);
    return { status: 503, json: { ok: false, error: code === "42P01" ? "not_installed" : "storage_unavailable" } };
  }
}
