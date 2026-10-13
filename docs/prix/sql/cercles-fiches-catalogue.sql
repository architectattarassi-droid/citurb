-- CITURBAREA — Cercles : fiches société par métier, fiches produit, fiches
-- service, codes du référentiel créés à la modération.
-- Prérequis : docs/prix/sql/cercles-fournisseurs.sql (table "Fournisseur").
-- À coller dans Neon : console.neon.tech → projet citurbarea → branche
-- production → SQL Editor → Run. Rejouable sans risque (IF NOT EXISTS) ;
-- n'efface ni ne modifie aucune donnée existante.
-- Modèles Prisma : prisma/schema.prisma (Fournisseur, ProduitFournisseur,
-- ServiceFournisseur, MateriauReferentiel).

-- 1. Fiche société détaillée (gabarit selon le métier) et documents ─────────
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "raisonSocialeAr" TEXT;
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "descriptionAr"   TEXT;
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "fiche"     JSONB NOT NULL DEFAULT '{}';  -- capacités, marques, références, horaires, délais, conditions
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "documents" JSONB NOT NULL DEFAULT '[]';  -- [{ id, type, url, statut: DEPOSE|VERIFIE|REFUSE, expireLe, … }]
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "formule"   TEXT  NOT NULL DEFAULT 'GRATUIT'; -- abonnement préparé (aucun paiement)

-- 2. Fiche produit (matériau / équipement listé par un fournisseur) ─────────
CREATE TABLE IF NOT EXISTS "ProduitFournisseur" (
  "id"                TEXT PRIMARY KEY,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fournisseurId"     TEXT NOT NULL REFERENCES "Fournisseur"("id") ON DELETE CASCADE,
  "slug"              TEXT NOT NULL UNIQUE,
  "statut"            TEXT NOT NULL DEFAULT 'PENDING',       -- PENDING | APPROVED | REJECTED | ARCHIVED
  "famille"           TEXT NOT NULL,                         -- gabarit technique (CARRELAGE, ACIER…)
  "categorie"         TEXT NOT NULL,                         -- catégorie du catalogue (REVETEMENT…)
  "designationFr"     TEXT,
  "designationAr"     TEXT,
  "descriptionFr"     TEXT,
  "descriptionAr"     TEXT,
  "marque"            TEXT,
  "modele"            TEXT,                                  -- modèle / référence fabricant
  "gamme"             TEXT,                                  -- ECO | MOYEN | HAUT | LUXE
  "caracteristiques"  JSONB NOT NULL DEFAULT '{}',
  "uniteVente"        TEXT NOT NULL,                         -- libellé : « Carton de 1,44 m² »
  "conditionnement"   TEXT,
  "uniteRef"          TEXT NOT NULL,                         -- unité d'ouvrage : kg, m2, m3, ml, u, l, t, ens
  "facteur"           DOUBLE PRECISION NOT NULL,             -- quantité d'uniteRef dans une unité de vente
  "prixHT"            DOUBLE PRECISION NOT NULL,             -- par unité de vente
  "tvaPct"            DOUBLE PRECISION NOT NULL DEFAULT 20,
  "prixRefHT"         DOUBLE PRECISION NOT NULL,             -- par uniteRef
  "quantiteMin"       DOUBLE PRECISION,
  "degressifs"        JSONB NOT NULL DEFAULT '[]',
  "delaiJours"        INTEGER,
  "zones"             TEXT[] NOT NULL DEFAULT '{}',          -- codes de région, ou 'national'
  "disponibilite"     TEXT NOT NULL DEFAULT 'EN_STOCK',
  "validiteJusquau"   DATE,
  "photos"            JSONB NOT NULL DEFAULT '[]',           -- adresses https
  "ficheTechniqueUrl" TEXT,
  "codePropose"       TEXT,                                  -- code CIT suggéré par le fournisseur
  "materiauCode"      TEXT,                                  -- code CIT rattaché à la modération
  "ecartRef"          DOUBLE PRECISION,
  "signalement"       TEXT,
  "motifRejet"        TEXT,
  "moderePar"         TEXT,
  "modereLe"          TIMESTAMP(3),
  "events"            JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS "ProduitFournisseur_statut_idx"      ON "ProduitFournisseur" ("statut");
CREATE INDEX IF NOT EXISTS "ProduitFournisseur_materiau_idx"    ON "ProduitFournisseur" ("materiauCode", "statut");
CREATE INDEX IF NOT EXISTS "ProduitFournisseur_fournisseur_idx" ON "ProduitFournisseur" ("fournisseurId");

-- 3. Fiche service (pose, fourni-posé, étude, essai, levé, location…) ───────
CREATE TABLE IF NOT EXISTS "ServiceFournisseur" (
  "id"                TEXT PRIMARY KEY,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fournisseurId"     TEXT NOT NULL REFERENCES "Fournisseur"("id") ON DELETE CASCADE,
  "statut"            TEXT NOT NULL DEFAULT 'PENDING',       -- PENDING | APPROVED | REJECTED | ARCHIVED
  "nature"            TEXT NOT NULL,                         -- POSE | FOURNI_POSE | ETUDE | ESSAI | TOPO | CONTROLE | LOCATION | TRANSPORT | AUTRE
  "ouvrageCode"       TEXT,                                  -- code d'ouvrage du chiffrage (RSO.02…)
  "prestationCode"    TEXT,                                  -- prestation hors ouvrage (ETUDE_BET_STRUCTURE…)
  "designationFr"     TEXT,
  "designationAr"     TEXT,
  "descriptionFr"     TEXT,
  "descriptionAr"     TEXT,
  "unite"             TEXT NOT NULL,
  "prixHT"            DOUBLE PRECISION NOT NULL,
  "tvaPct"            DOUBLE PRECISION NOT NULL DEFAULT 20,
  "zones"             TEXT[] NOT NULL DEFAULT '{}',
  "delaiJours"        INTEGER,
  "conditions"        TEXT,
  "validiteJusquau"   DATE,
  "photos"            JSONB NOT NULL DEFAULT '[]',
  "ecartRef"          DOUBLE PRECISION,
  "signalement"       TEXT,
  "motifRejet"        TEXT,
  "moderePar"         TEXT,
  "modereLe"          TIMESTAMP(3),
  "events"            JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS "ServiceFournisseur_statut_idx"      ON "ServiceFournisseur" ("statut");
CREATE INDEX IF NOT EXISTS "ServiceFournisseur_ouvrage_idx"     ON "ServiceFournisseur" ("ouvrageCode", "statut");
CREATE INDEX IF NOT EXISTS "ServiceFournisseur_fournisseur_idx" ON "ServiceFournisseur" ("fournisseurId");

-- 4. Codes du référentiel créés à la modération (CIT-<PFX>-9NN) ──────────────
CREATE TABLE IF NOT EXISTS "MateriauReferentiel" (
  "code"              TEXT PRIMARY KEY,                      -- CIT-REV-901…
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "libelleFr"         TEXT NOT NULL,
  "libelleAr"         TEXT,
  "libelleEn"         TEXT,
  "categorie"         TEXT NOT NULL,
  "famille"           TEXT NOT NULL,
  "uniteRef"          TEXT NOT NULL,
  "parent"            TEXT,                                  -- code générique : ses offres comptent aussi pour lui
  "lots"              TEXT[] NOT NULL DEFAULT '{}',
  "gamme"             TEXT,
  "actif"             BOOLEAN NOT NULL DEFAULT TRUE,
  "auteur"            TEXT,
  "origineProduitId"  TEXT
);
