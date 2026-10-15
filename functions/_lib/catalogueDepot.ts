/**
 * Accès Neon du catalogue Cercles : "ProduitFournisseur", "ServiceFournisseur",
 * "MateriauReferentiel" (SQL : docs/prix/sql/cercles-fiches-catalogue.sql),
 * lectures publiques (offres approuvées, annuaire) et lead de contact
 * (table "Lead"). Interface `DepotCatalogue` : la logique (catalogue.ts) ne
 * voit qu'elle ; les tests passent un dépôt en mémoire.
 */
import type { Sql } from "./cercles";
import type { Ligne } from "./fournisseursDepot";

export interface ProduitEcrit {
  id: string; fournisseurId: string; slug: string; statut: string; famille: string; categorie: string;
  designationFr: string | null; designationAr: string | null; descriptionFr: string | null; descriptionAr: string | null;
  marque: string | null; modele: string | null; gamme: string | null; caracteristiques: Ligne; uniteVente: string; conditionnement: string | null;
  uniteRef: string; facteur: number; prixHT: number; tvaPct: number; prixRefHT: number; quantiteMin: number | null; degressifs: unknown[];
  delaiJours: number | null; zones: string[]; disponibilite: string; validiteJusquau: string | null; photos: string[]; ficheTechniqueUrl: string | null;
  codePropose: string | null; materiauCode: string | null; ecartRef: number | null; signalement: string | null; motifRejet: string | null;
}

export interface ServiceEcrit {
  id: string; fournisseurId: string; statut: string; nature: string; ouvrageCode: string | null; prestationCode: string | null;
  designationFr: string | null; designationAr: string | null; descriptionFr: string | null; descriptionAr: string | null;
  unite: string; prixHT: number; tvaPct: number; zones: string[]; delaiJours: number | null; conditions: string | null;
  validiteJusquau: string | null; photos: string[]; ecartRef: number | null; signalement: string | null; motifRejet: string | null;
}

export interface CodeReferentielEcrit {
  code: string; libelleFr: string; libelleAr: string | null; libelleEn: string | null; categorie: string; famille: string;
  uniteRef: string; parent: string | null; lots: string[]; gamme: string | null; auteur: string; origineProduitId: string | null;
}

export interface ModerationProduit {
  statut: string; materiauCode: string | null; uniteRef: string; facteur: number; prixRefHT: number; ecartRef: number | null;
  signalement: string | null; motifRejet: string | null; auteur: string;
}

export interface LeadContact {
  id: string; nom: string; telephone: string; email: string | null; ville: string | null; lang: string; pageContext: string; meta: Ligne; events: unknown[];
}

export interface DepotCatalogue {
  prLister(fournisseurId: string): Promise<Ligne[]>;
  prParId(id: string): Promise<Ligne | null>;
  prSlugPris(slug: string): Promise<boolean>;
  prEnregistrer(p: ProduitEcrit, evenement: Ligne): Promise<Ligne>;
  prSupprimer(fournisseurId: string, id: string): Promise<Ligne | null>;
  /** Produits à modérer (statut donné, sinon PENDING), avec la raison sociale. */
  prAModerer(statut: string | null): Promise<Ligne[]>;
  prModerer(id: string, m: ModerationProduit, evenement: Ligne): Promise<Ligne | null>;
  /**
   * Produits APPROVED de fournisseurs APPROVED, avec les colonnes publiques du fournisseur (préfixe f).
   * `fictifs` : inclure les fournisseurs marqués fictifs (meta.fictif, aperçu seulement).
   */
  prPublics(fictifs: boolean): Promise<Ligne[]>;

  svLister(fournisseurId: string): Promise<Ligne[]>;
  svParId(id: string): Promise<Ligne | null>;
  svEnregistrer(s: ServiceEcrit, evenement: Ligne): Promise<Ligne>;
  svSupprimer(fournisseurId: string, id: string): Promise<Ligne | null>;
  svAModerer(statut: string | null): Promise<Ligne[]>;
  svModerer(id: string, m: { statut: string; ouvrageCode: string | null; prestationCode: string | null; motifRejet: string | null; auteur: string }, evenement: Ligne): Promise<Ligne | null>;
  svPublics(fictifs: boolean): Promise<Ligne[]>;

  refLister(): Promise<Ligne[]>;
  refCreer(c: CodeReferentielEcrit): Promise<void>;

  /** Produits approuvés rattachés à un code : code, prix par uniteRef, zones (du produit, sinon du pro)… */
  offresProduits(fictifs: boolean): Promise<Ligne[]>;
  /** Fiches de prix approuvées (SupplierPrice) au même format que offresProduits. */
  offresFiches(fictifs: boolean): Promise<Ligne[]>;
  /** Offres de services approuvées rattachées à un ouvrage ou une prestation. */
  offresServices(fictifs: boolean): Promise<Ligne[]>;
  /** Fournisseurs APPROVED avec leurs codes couverts et le nombre d'offres approuvées. */
  annuaire(fictifs: boolean): Promise<Ligne[]>;
  fParSlug(slug: string): Promise<Ligne | null>;
  /** Fiches de prix approuvées d'un fournisseur. */
  fichesApprouvees(fournisseurId: string): Promise<Ligne[]>;
  activite(fournisseurId: string): Promise<{ offresApprouvees: number; plusRecente: string | null }>;
  leadInserer(l: LeadContact): Promise<void>;
}

const j = (v: unknown) => JSON.stringify(v ?? null);
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

export function depotCatalogueNeon(sql: Sql): DepotCatalogue {
  const un = async (p: Promise<Ligne[]>) => (await p)[0] ?? null;
  return {
    prLister: (fid) => sql`SELECT * FROM "ProduitFournisseur" WHERE "fournisseurId" = ${fid} ORDER BY "updatedAt" DESC LIMIT 1000`,
    prParId: (id) => un(sql`SELECT * FROM "ProduitFournisseur" WHERE "id" = ${id} LIMIT 1`),
    prSlugPris: async (slug) => (await sql`SELECT 1 FROM "ProduitFournisseur" WHERE "slug" = ${slug} LIMIT 1`).length > 0,
    prEnregistrer: async (p, ev) => (await sql`INSERT INTO "ProduitFournisseur" ("id", "fournisseurId", "slug", "statut", "famille", "categorie",
          "designationFr", "designationAr", "descriptionFr", "descriptionAr", "marque", "modele", "gamme", "caracteristiques", "uniteVente",
          "conditionnement", "uniteRef", "facteur", "prixHT", "tvaPct", "prixRefHT", "quantiteMin", "degressifs", "delaiJours", "zones",
          "disponibilite", "validiteJusquau", "photos", "ficheTechniqueUrl", "codePropose", "materiauCode", "ecartRef", "signalement", "motifRejet", "events")
        VALUES (${p.id}, ${p.fournisseurId}, ${p.slug}, ${p.statut}, ${p.famille}, ${p.categorie}, ${p.designationFr}, ${p.designationAr},
          ${p.descriptionFr}, ${p.descriptionAr}, ${p.marque}, ${p.modele}, ${p.gamme}, ${j(p.caracteristiques)}::jsonb, ${p.uniteVente},
          ${p.conditionnement}, ${p.uniteRef}, ${p.facteur}, ${p.prixHT}, ${p.tvaPct}, ${p.prixRefHT}, ${p.quantiteMin}, ${j(p.degressifs)}::jsonb,
          ${p.delaiJours}, ${p.zones}::text[], ${p.disponibilite}, ${p.validiteJusquau}::date, ${j(p.photos)}::jsonb, ${p.ficheTechniqueUrl},
          ${p.codePropose}, ${p.materiauCode}, ${p.ecartRef}, ${p.signalement}, ${p.motifRejet}, ${j([ev])}::jsonb)
        ON CONFLICT ("id") DO UPDATE SET "statut" = EXCLUDED."statut", "famille" = EXCLUDED."famille", "categorie" = EXCLUDED."categorie",
          "designationFr" = EXCLUDED."designationFr", "designationAr" = EXCLUDED."designationAr", "descriptionFr" = EXCLUDED."descriptionFr",
          "descriptionAr" = EXCLUDED."descriptionAr", "marque" = EXCLUDED."marque", "modele" = EXCLUDED."modele", "gamme" = EXCLUDED."gamme",
          "caracteristiques" = EXCLUDED."caracteristiques", "uniteVente" = EXCLUDED."uniteVente", "conditionnement" = EXCLUDED."conditionnement",
          "uniteRef" = EXCLUDED."uniteRef", "facteur" = EXCLUDED."facteur", "prixHT" = EXCLUDED."prixHT", "tvaPct" = EXCLUDED."tvaPct",
          "prixRefHT" = EXCLUDED."prixRefHT", "quantiteMin" = EXCLUDED."quantiteMin", "degressifs" = EXCLUDED."degressifs",
          "delaiJours" = EXCLUDED."delaiJours", "zones" = EXCLUDED."zones", "disponibilite" = EXCLUDED."disponibilite",
          "validiteJusquau" = EXCLUDED."validiteJusquau", "photos" = EXCLUDED."photos", "ficheTechniqueUrl" = EXCLUDED."ficheTechniqueUrl",
          "codePropose" = EXCLUDED."codePropose", "materiauCode" = EXCLUDED."materiauCode", "ecartRef" = EXCLUDED."ecartRef",
          "signalement" = EXCLUDED."signalement", "motifRejet" = EXCLUDED."motifRejet",
          "events" = COALESCE("ProduitFournisseur"."events", '[]'::jsonb) || EXCLUDED."events", "updatedAt" = CURRENT_TIMESTAMP
        WHERE "ProduitFournisseur"."fournisseurId" = EXCLUDED."fournisseurId"
        RETURNING *`)[0],
    prSupprimer: (fid, id) => un(sql`DELETE FROM "ProduitFournisseur" WHERE "id" = ${id} AND "fournisseurId" = ${fid} RETURNING *`),
    prAModerer: (statut) => sql`SELECT p.*, f."raisonSociale", f."ville", f."metier", f."statut" AS "statutFournisseur"
        FROM "ProduitFournisseur" p JOIN "Fournisseur" f ON f."id" = p."fournisseurId"
        WHERE p."statut" = ${statut || "PENDING"} ORDER BY p."updatedAt" DESC LIMIT 500`,
    prModerer: (id, m, ev) => un(sql`UPDATE "ProduitFournisseur" SET "statut" = ${m.statut}, "materiauCode" = ${m.materiauCode},
        "uniteRef" = ${m.uniteRef}, "facteur" = ${m.facteur}, "prixRefHT" = ${m.prixRefHT}, "ecartRef" = ${m.ecartRef},
        "signalement" = ${m.signalement}, "motifRejet" = ${m.motifRejet}, "moderePar" = ${m.auteur}, "modereLe" = CURRENT_TIMESTAMP,
        "events" = COALESCE("events", '[]'::jsonb) || ${j([ev])}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} RETURNING *`),
    prPublics: (fictifs) => sql`SELECT p.*, f."slug" AS "fSlug", f."raisonSociale" AS "fNom", f."raisonSocialeAr" AS "fNomAr", f."ville" AS "fVille",
          f."region" AS "fRegion", f."zonesLivraison" AS "fZones", f."metier" AS "fMetier", f."documents" AS "fDocuments"
        FROM "ProduitFournisseur" p JOIN "Fournisseur" f ON f."id" = p."fournisseurId"
        WHERE p."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
        ORDER BY p."updatedAt" DESC LIMIT 3000`,

    svLister: (fid) => sql`SELECT * FROM "ServiceFournisseur" WHERE "fournisseurId" = ${fid} ORDER BY "updatedAt" DESC LIMIT 500`,
    svParId: (id) => un(sql`SELECT * FROM "ServiceFournisseur" WHERE "id" = ${id} LIMIT 1`),
    svEnregistrer: async (s, ev) => (await sql`INSERT INTO "ServiceFournisseur" ("id", "fournisseurId", "statut", "nature", "ouvrageCode",
          "prestationCode", "designationFr", "designationAr", "descriptionFr", "descriptionAr", "unite", "prixHT", "tvaPct", "zones",
          "delaiJours", "conditions", "validiteJusquau", "photos", "ecartRef", "signalement", "motifRejet", "events")
        VALUES (${s.id}, ${s.fournisseurId}, ${s.statut}, ${s.nature}, ${s.ouvrageCode}, ${s.prestationCode}, ${s.designationFr},
          ${s.designationAr}, ${s.descriptionFr}, ${s.descriptionAr}, ${s.unite}, ${s.prixHT}, ${s.tvaPct}, ${s.zones}::text[],
          ${s.delaiJours}, ${s.conditions}, ${s.validiteJusquau}::date, ${j(s.photos)}::jsonb, ${s.ecartRef}, ${s.signalement},
          ${s.motifRejet}, ${j([ev])}::jsonb)
        ON CONFLICT ("id") DO UPDATE SET "statut" = EXCLUDED."statut", "nature" = EXCLUDED."nature", "ouvrageCode" = EXCLUDED."ouvrageCode",
          "prestationCode" = EXCLUDED."prestationCode", "designationFr" = EXCLUDED."designationFr", "designationAr" = EXCLUDED."designationAr",
          "descriptionFr" = EXCLUDED."descriptionFr", "descriptionAr" = EXCLUDED."descriptionAr", "unite" = EXCLUDED."unite",
          "prixHT" = EXCLUDED."prixHT", "tvaPct" = EXCLUDED."tvaPct", "zones" = EXCLUDED."zones", "delaiJours" = EXCLUDED."delaiJours",
          "conditions" = EXCLUDED."conditions", "validiteJusquau" = EXCLUDED."validiteJusquau", "photos" = EXCLUDED."photos",
          "ecartRef" = EXCLUDED."ecartRef", "signalement" = EXCLUDED."signalement", "motifRejet" = EXCLUDED."motifRejet",
          "events" = COALESCE("ServiceFournisseur"."events", '[]'::jsonb) || EXCLUDED."events", "updatedAt" = CURRENT_TIMESTAMP
        WHERE "ServiceFournisseur"."fournisseurId" = EXCLUDED."fournisseurId"
        RETURNING *`)[0],
    svSupprimer: (fid, id) => un(sql`DELETE FROM "ServiceFournisseur" WHERE "id" = ${id} AND "fournisseurId" = ${fid} RETURNING *`),
    svAModerer: (statut) => sql`SELECT s.*, f."raisonSociale", f."ville", f."metier", f."statut" AS "statutFournisseur"
        FROM "ServiceFournisseur" s JOIN "Fournisseur" f ON f."id" = s."fournisseurId"
        WHERE s."statut" = ${statut || "PENDING"} ORDER BY s."updatedAt" DESC LIMIT 500`,
    svModerer: (id, m, ev) => un(sql`UPDATE "ServiceFournisseur" SET "statut" = ${m.statut}, "ouvrageCode" = ${m.ouvrageCode},
        "prestationCode" = ${m.prestationCode}, "motifRejet" = ${m.motifRejet}, "moderePar" = ${m.auteur}, "modereLe" = CURRENT_TIMESTAMP,
        "events" = COALESCE("events", '[]'::jsonb) || ${j([ev])}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} RETURNING *`),
    svPublics: (fictifs) => sql`SELECT s.*, f."slug" AS "fSlug", f."raisonSociale" AS "fNom", f."raisonSocialeAr" AS "fNomAr", f."ville" AS "fVille",
          f."region" AS "fRegion", f."zonesLivraison" AS "fZones", f."metier" AS "fMetier", f."documents" AS "fDocuments"
        FROM "ServiceFournisseur" s JOIN "Fournisseur" f ON f."id" = s."fournisseurId"
        WHERE s."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
        ORDER BY s."updatedAt" DESC LIMIT 3000`,

    refLister: () => sql`SELECT * FROM "MateriauReferentiel" ORDER BY "code"`,
    refCreer: async (c) => {
      await sql`INSERT INTO "MateriauReferentiel" ("code", "libelleFr", "libelleAr", "libelleEn", "categorie", "famille", "uniteRef", "parent",
          "lots", "gamme", "auteur", "origineProduitId")
        VALUES (${c.code}, ${c.libelleFr}, ${c.libelleAr}, ${c.libelleEn}, ${c.categorie}, ${c.famille}, ${c.uniteRef}, ${c.parent},
          ${c.lots}::text[], ${c.gamme}, ${c.auteur}, ${c.origineProduitId})`;
    },

    offresFiches: (fictifs) => sql`SELECT p."materiauCode" AS "code", p."prixRefHT" AS "prix", p."fournisseurId", f."zonesLivraison" AS "zones",
          f."region" AS "regionFournisseur", p."updatedAt" AS "misAJour", p."validiteJusquau"
        FROM "SupplierPrice" p JOIN "Fournisseur" f ON f."id" = p."fournisseurId"
        WHERE p."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
          AND p."updatedAt" > now() - interval '120 days'`,
    offresProduits: (fictifs) => sql`SELECT r."materiauCode" AS "code", r."prixRefHT" AS "prix", r."fournisseurId",
          CASE WHEN cardinality(r."zones") > 0 THEN r."zones" ELSE f."zonesLivraison" END AS "zones", f."region" AS "regionFournisseur",
          r."updatedAt" AS "misAJour", r."validiteJusquau"
        FROM "ProduitFournisseur" r JOIN "Fournisseur" f ON f."id" = r."fournisseurId"
        WHERE r."statut" = 'APPROVED' AND r."materiauCode" IS NOT NULL AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
          AND r."updatedAt" > now() - interval '120 days'`,
    offresServices: (fictifs) => sql`SELECT s."ouvrageCode", s."prestationCode", s."nature", s."prixHT" AS "prix", s."fournisseurId",
          CASE WHEN cardinality(s."zones") > 0 THEN s."zones" ELSE f."zonesLivraison" END AS "zones", f."region" AS "regionFournisseur",
          s."updatedAt" AS "misAJour", s."validiteJusquau"
        FROM "ServiceFournisseur" s JOIN "Fournisseur" f ON f."id" = s."fournisseurId"
        WHERE s."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (s."ouvrageCode" IS NOT NULL OR s."prestationCode" IS NOT NULL)
          AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true') AND s."updatedAt" > now() - interval '120 days'`,
    annuaire: (fictifs) => sql`SELECT f.*,
          ARRAY(SELECT DISTINCT c FROM (
            SELECT p."materiauCode" AS c FROM "SupplierPrice" p WHERE p."fournisseurId" = f."id" AND p."statut" = 'APPROVED'
            UNION SELECT r."materiauCode" FROM "ProduitFournisseur" r WHERE r."fournisseurId" = f."id" AND r."statut" = 'APPROVED' AND r."materiauCode" IS NOT NULL
            UNION SELECT COALESCE(s."ouvrageCode", s."prestationCode") FROM "ServiceFournisseur" s
              WHERE s."fournisseurId" = f."id" AND s."statut" = 'APPROVED' AND COALESCE(s."ouvrageCode", s."prestationCode") IS NOT NULL
          ) x) AS "codes",
          (SELECT count(*)::int FROM "ProduitFournisseur" r WHERE r."fournisseurId" = f."id" AND r."statut" = 'APPROVED') AS "nbProduits",
          (SELECT count(*)::int FROM "ServiceFournisseur" s WHERE s."fournisseurId" = f."id" AND s."statut" = 'APPROVED') AS "nbServices",
          (SELECT count(*)::int FROM "SupplierPrice" p WHERE p."fournisseurId" = f."id" AND p."statut" = 'APPROVED') AS "nbFiches"
        FROM "Fournisseur" f WHERE f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
        ORDER BY f."raisonSociale" LIMIT 2000`,
    fParSlug: (slug) => un(sql`SELECT * FROM "Fournisseur" WHERE "slug" = ${slug} LIMIT 1`),
    fichesApprouvees: (fid) => sql`SELECT * FROM "SupplierPrice" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED' ORDER BY "materiauCode"`,
    activite: async (fid) => {
      const r = (await sql`SELECT
          ((SELECT count(*) FROM "SupplierPrice" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED')
            + (SELECT count(*) FROM "ProduitFournisseur" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED')
            + (SELECT count(*) FROM "ServiceFournisseur" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED'))::int AS "n",
          GREATEST((SELECT max("updatedAt") FROM "SupplierPrice" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED'),
            (SELECT max("updatedAt") FROM "ProduitFournisseur" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED'),
            (SELECT max("updatedAt") FROM "ServiceFournisseur" WHERE "fournisseurId" = ${fid} AND "statut" = 'APPROVED')) AS "d"`)[0];
      return { offresApprouvees: Number(r?.n ?? 0), plusRecente: iso(r?.d) };
    },
    leadInserer: async (l) => {
      const maintenant = new Date().toISOString();
      await sql`INSERT INTO "Lead" ("id", "createdAt", "updatedAt", "nom", "telephone", "email", "projetType", "budget", "ville", "surface",
          "delaiMois", "source", "lang", "pageContext", "utm", "score", "scoreBreakdown", "stage", "wizardStep", "returnVisitor",
          "nurtureLog", "convertedDossierId", "events", "meta")
        VALUES (${l.id}, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${l.nom}, ${l.telephone}, ${l.email}, 'P6_CONTACT_PRO',
          NULL, ${l.ville}, NULL, NULL, 'cercles-pro', ${l.lang}, ${l.pageContext}, NULL, 50, '{}'::jsonb, 'NEW', 0, false,
          '{}'::jsonb, NULL, ${j(l.events)}::jsonb, ${j(l.meta)}::jsonb)`;
    },
  };
}
