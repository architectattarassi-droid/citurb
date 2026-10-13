/**
 * Accès Neon de "ImageCatalogue" (docs/prix/sql/cercles-images.sql). Les
 * lectures de liste ne renvoient jamais les octets ; les octets sont lus un
 * par un, encodés en base64 par Postgres (driver HTTP sans type bytea natif).
 */
import type { Sql } from "./cercles";
import type { Ligne } from "./fournisseursDepot";

export interface ImageEcrite {
  id: string; fournisseurId: string; objetType: string; objetId: string; ordre: number; principale: boolean;
  legendeFr: string | null; legendeAr: string | null; type: string; largeur: number; hauteur: number; taille: number;
  octetsHex: string; vignetteType: string; vignetteTaille: number; vignetteHex: string; empreinte: string;
}

export interface OctetsImage { base64: string; type: string; empreinte: string }

export interface DepotImages {
  imInserer(i: ImageEcrite): Promise<Ligne>;
  imParId(id: string): Promise<Ligne | null>;
  imListerFournisseur(fournisseurId: string): Promise<Ligne[]>;
  imStats(fournisseurId: string): Promise<{ nb: number; octets: number }>;
  imMaj(id: string, p: { ordre: number; legendeFr: string | null; legendeAr: string | null }): Promise<Ligne | null>;
  /** Image principale de son objet (les autres images de l'objet perdent le drapeau). */
  imPrincipale(id: string): Promise<void>;
  imSupprimer(fournisseurId: string, id: string): Promise<Ligne | null>;
  imModerer(id: string, statut: string, motif: string | null, auteur: string): Promise<Ligne | null>;
  /** Approuve les images en attente d'un produit ou d'une prestation au moment où la fiche est approuvée. */
  imApprouverObjet(objetType: string, objetId: string, auteur: string): Promise<number>;
  imAModerer(statut: string | null): Promise<Ligne[]>;
  /** Métadonnées des images publiables : APPROVED, pro APPROVED (et non fictif sauf aperçu), objet approuvé. */
  imPubliques(fictifs: boolean): Promise<Ligne[]>;
  /** Octets d'une image publiable (mêmes règles), sinon null. */
  imOctetsPublics(id: string, vignette: boolean, fictifs: boolean): Promise<OctetsImage | null>;
  /** Octets sans condition de statut (propriétaire ou admin : le contrôle d'accès est fait avant). */
  imOctets(id: string, vignette: boolean): Promise<OctetsImage | null>;
}

export function depotImagesNeon(sql: Sql): DepotImages {
  const un = async (p: Promise<Ligne[]>) => (await p)[0] ?? null;
  const octets = (r: Ligne | null): OctetsImage | null => (r ? { base64: String(r.b64 || "").replace(/\s/g, ""), type: String(r.type), empreinte: String(r.empreinte) } : null);
  return {
    imInserer: async (i) => (await sql`INSERT INTO "ImageCatalogue" ("id", "fournisseurId", "objetType", "objetId", "ordre", "principale", "legendeFr", "legendeAr",
          "type", "largeur", "hauteur", "taille", "octets", "vignetteType", "vignetteTaille", "vignette", "empreinte")
        VALUES (${i.id}, ${i.fournisseurId}, ${i.objetType}, ${i.objetId}, ${i.ordre}, ${i.principale}, ${i.legendeFr}, ${i.legendeAr},
          ${i.type}, ${i.largeur}, ${i.hauteur}, ${i.taille}, decode(${i.octetsHex}, 'hex'), ${i.vignetteType}, ${i.vignetteTaille}, decode(${i.vignetteHex}, 'hex'), ${i.empreinte})
        RETURNING "id", "createdAt", "updatedAt", "fournisseurId", "objetType", "objetId", "ordre", "principale", "legendeFr", "legendeAr",
          "statut", "type", "largeur", "hauteur", "taille", "vignetteType", "vignetteTaille", "empreinte", "motifRejet"`)[0],
    imParId: (id) => un(sql`SELECT i."id", i."fournisseurId", i."objetType", i."objetId", i."ordre", i."principale", i."legendeFr", i."legendeAr", i."statut",
        i."type", i."largeur", i."hauteur", i."taille", i."vignetteTaille", i."empreinte", i."motifRejet", i."createdAt", i."updatedAt"
        FROM "ImageCatalogue" i WHERE i."id" = ${id} LIMIT 1`),
    imListerFournisseur: (fid) => sql`SELECT "id", "objetType", "objetId", "ordre", "principale", "legendeFr", "legendeAr", "statut", "type", "largeur", "hauteur",
        "taille", "vignetteTaille", "empreinte", "motifRejet", "createdAt", "updatedAt", "fournisseurId"
        FROM "ImageCatalogue" WHERE "fournisseurId" = ${fid} ORDER BY "objetType", "objetId", "principale" DESC, "ordre", "createdAt"`,
    imStats: async (fid) => {
      const r = (await sql`SELECT count(*)::int AS "nb", COALESCE(sum("taille" + "vignetteTaille"), 0)::int AS "octets" FROM "ImageCatalogue" WHERE "fournisseurId" = ${fid}`)[0];
      return { nb: Number(r?.nb ?? 0), octets: Number(r?.octets ?? 0) };
    },
    imMaj: (id, p) => un(sql`UPDATE "ImageCatalogue" SET "ordre" = ${p.ordre}, "legendeFr" = ${p.legendeFr}, "legendeAr" = ${p.legendeAr}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} RETURNING "id", "objetType", "objetId", "ordre", "principale", "legendeFr", "legendeAr", "statut", "type", "largeur", "hauteur",
          "taille", "vignetteTaille", "empreinte", "motifRejet", "fournisseurId"`),
    imPrincipale: async (id) => {
      await sql`UPDATE "ImageCatalogue" i SET "principale" = (i."id" = ${id}), "updatedAt" = CURRENT_TIMESTAMP
        FROM "ImageCatalogue" c WHERE c."id" = ${id} AND i."objetType" = c."objetType" AND i."objetId" = c."objetId"`;
    },
    imSupprimer: (fid, id) => un(sql`DELETE FROM "ImageCatalogue" WHERE "id" = ${id} AND "fournisseurId" = ${fid} RETURNING "id", "objetType", "objetId", "principale"`),
    imModerer: (id, statut, motif, auteur) => un(sql`UPDATE "ImageCatalogue" SET "statut" = ${statut}, "motifRejet" = ${motif}, "moderePar" = ${auteur},
        "modereLe" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}
        RETURNING "id", "objetType", "objetId", "statut", "motifRejet", "fournisseurId", "empreinte"`),
    imApprouverObjet: async (objetType, objetId, auteur) => (await sql`UPDATE "ImageCatalogue" SET "statut" = 'APPROVED', "moderePar" = ${auteur},
        "modereLe" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "objetType" = ${objetType} AND "objetId" = ${objetId} AND "statut" = 'PENDING' RETURNING "id"`).length,
    imAModerer: (statut) => sql`SELECT i."id", i."fournisseurId", i."objetType", i."objetId", i."ordre", i."principale", i."legendeFr", i."legendeAr", i."statut",
        i."type", i."largeur", i."hauteur", i."taille", i."vignetteTaille", i."empreinte", i."motifRejet", i."createdAt",
        f."raisonSociale", f."ville", f."statut" AS "statutFournisseur",
        COALESCE(p."designationFr", p."designationAr", s."designationFr", s."designationAr", f."raisonSociale") AS "objetLibelle",
        COALESCE(p."statut", s."statut", f."statut") AS "statutObjet"
        FROM "ImageCatalogue" i JOIN "Fournisseur" f ON f."id" = i."fournisseurId"
        LEFT JOIN "ProduitFournisseur" p ON i."objetType" = 'PRODUIT' AND p."id" = i."objetId"
        LEFT JOIN "ServiceFournisseur" s ON i."objetType" = 'SERVICE' AND s."id" = i."objetId"
        WHERE i."statut" = ${statut || "PENDING"} ORDER BY i."createdAt" DESC LIMIT 300`,
    imPubliques: (fictifs) => sql`SELECT i."id", i."fournisseurId", i."objetType", i."objetId", i."ordre", i."principale", i."legendeFr", i."legendeAr",
        i."largeur", i."hauteur", i."empreinte"
        FROM "ImageCatalogue" i JOIN "Fournisseur" f ON f."id" = i."fournisseurId"
        WHERE i."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
          AND (i."objetType" = 'SOCIETE'
            OR (i."objetType" = 'PRODUIT' AND EXISTS (SELECT 1 FROM "ProduitFournisseur" p WHERE p."id" = i."objetId" AND p."statut" = 'APPROVED'))
            OR (i."objetType" = 'SERVICE' AND EXISTS (SELECT 1 FROM "ServiceFournisseur" s WHERE s."id" = i."objetId" AND s."statut" = 'APPROVED')))
        ORDER BY i."objetId", i."principale" DESC, i."ordre", i."createdAt" LIMIT 5000`,
    imOctetsPublics: async (id, vignette, fictifs) => octets(await un(vignette
      ? sql`SELECT encode(i."vignette", 'base64') AS "b64", i."vignetteType" AS "type", i."empreinte" FROM "ImageCatalogue" i JOIN "Fournisseur" f ON f."id" = i."fournisseurId"
          WHERE i."id" = ${id} AND i."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
            AND (i."objetType" = 'SOCIETE'
              OR (i."objetType" = 'PRODUIT' AND EXISTS (SELECT 1 FROM "ProduitFournisseur" p WHERE p."id" = i."objetId" AND p."statut" = 'APPROVED'))
              OR (i."objetType" = 'SERVICE' AND EXISTS (SELECT 1 FROM "ServiceFournisseur" s WHERE s."id" = i."objetId" AND s."statut" = 'APPROVED')))`
      : sql`SELECT encode(i."octets", 'base64') AS "b64", i."type", i."empreinte" FROM "ImageCatalogue" i JOIN "Fournisseur" f ON f."id" = i."fournisseurId"
          WHERE i."id" = ${id} AND i."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
            AND (i."objetType" = 'SOCIETE'
              OR (i."objetType" = 'PRODUIT' AND EXISTS (SELECT 1 FROM "ProduitFournisseur" p WHERE p."id" = i."objetId" AND p."statut" = 'APPROVED'))
              OR (i."objetType" = 'SERVICE' AND EXISTS (SELECT 1 FROM "ServiceFournisseur" s WHERE s."id" = i."objetId" AND s."statut" = 'APPROVED')))`)),
    imOctets: async (id, vignette) => octets(await un(vignette
      ? sql`SELECT encode("vignette", 'base64') AS "b64", "vignetteType" AS "type", "empreinte" FROM "ImageCatalogue" WHERE "id" = ${id}`
      : sql`SELECT encode("octets", 'base64') AS "b64", "type", "empreinte" FROM "ImageCatalogue" WHERE "id" = ${id}`)),
  };
}
