-- CITURBAREA — Cercles : images des fiches produit, prestation et société.
-- Prérequis : docs/prix/sql/cercles-fournisseurs.sql et cercles-fiches-catalogue.sql.
-- À coller dans Neon : console.neon.tech → projet citurbarea → branche
-- production → SQL Editor → Run. Rejouable sans risque (IF NOT EXISTS).
-- Images redimensionnées dans le navigateur (WebP, 1600 px max, vignette
-- 400 px), métadonnées EXIF retirées par la Function, stockées en bytea en
-- attendant R2 (docs/architecture/contrat-catalogue.md, « Images »).
-- Modèle Prisma : prisma/schema.prisma (ImageCatalogue).

CREATE TABLE IF NOT EXISTS "ImageCatalogue" (
  "id"              TEXT PRIMARY KEY,                       -- img_… (128 bits aléatoires, non devinable)
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fournisseurId"   TEXT NOT NULL REFERENCES "Fournisseur"("id") ON DELETE CASCADE,
  "objetType"       TEXT NOT NULL,                          -- PRODUIT | SERVICE | SOCIETE
  "objetId"         TEXT NOT NULL,                          -- id du produit, de la prestation, ou du fournisseur (SOCIETE)
  "ordre"           INTEGER NOT NULL DEFAULT 0,
  "principale"      BOOLEAN NOT NULL DEFAULT FALSE,
  "legendeFr"       TEXT,
  "legendeAr"       TEXT,
  "statut"          TEXT NOT NULL DEFAULT 'PENDING',        -- PENDING | APPROVED | REJECTED
  "type"            TEXT NOT NULL,                          -- image/webp | image/jpeg
  "largeur"         INTEGER NOT NULL,
  "hauteur"         INTEGER NOT NULL,
  "taille"          INTEGER NOT NULL,
  "octets"          BYTEA NOT NULL,
  "vignetteType"    TEXT NOT NULL,
  "vignetteTaille"  INTEGER NOT NULL,
  "vignette"        BYTEA NOT NULL,
  "empreinte"       TEXT NOT NULL,                          -- SHA-256 (32 hex) : ETag et clé de cache
  "motifRejet"      TEXT,
  "moderePar"       TEXT,
  "modereLe"        TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "ImageCatalogue_objet_idx"       ON "ImageCatalogue" ("objetType", "objetId", "statut");
CREATE INDEX IF NOT EXISTS "ImageCatalogue_fournisseur_idx" ON "ImageCatalogue" ("fournisseurId");
CREATE INDEX IF NOT EXISTS "ImageCatalogue_statut_idx"      ON "ImageCatalogue" ("statut");
