-- CITURBAREA — Cercles fournisseurs : inscriptions pro, fiches de prix,
-- demandes de prix (RFQ) et réponses, paramètres de la plateforme.
-- À coller dans Neon : console.neon.tech → projet citurbarea → branche production
-- → SQL Editor → Run. Rejouable sans risque (IF NOT EXISTS), ne touche à aucune
-- table existante. Modèles Prisma correspondants : prisma/schema.prisma
-- (Fournisseur, SupplierPrice, SupplierPriceHistory, DemandePrix, ReponsePrix,
-- ParametrePlateforme).

CREATE TABLE IF NOT EXISTS "Fournisseur" (
  "id"              TEXT PRIMARY KEY,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statut"          TEXT NOT NULL DEFAULT 'PENDING',          -- PENDING | APPROVED | REJECTED | SUSPENDED
  "metier"          TEXT NOT NULL,                            -- FOURNISSEUR_MATERIAUX, ENTREPRISE_GO, ARTISAN_QUALIFIE, BET_STRUCTURE…
  "raisonSociale"   TEXT NOT NULL,
  "slug"            TEXT NOT NULL UNIQUE,
  "contactNom"      TEXT,
  "ice"             TEXT,
  "ville"           TEXT NOT NULL,
  "region"          TEXT,
  "zonesLivraison"  TEXT[] NOT NULL DEFAULT '{}',             -- codes de région, ou 'national'
  "categories"      TEXT[] NOT NULL DEFAULT '{}',             -- catégories du catalogue (GROS_OEUVRE…)
  "telephone"       TEXT NOT NULL,
  "email"           TEXT NOT NULL UNIQUE,                     -- en minuscules
  "logoUrl"         TEXT,
  "siteWeb"         TEXT,
  "description"     TEXT,
  "commissionPct"   DOUBLE PRECISION,                         -- surcharge du taux par défaut
  "motifRejet"      TEXT,
  "codeHash"        TEXT,                                     -- code d'accès à usage unique (SHA-256)
  "codeExpire"      TIMESTAMP(3),
  "codeTentatives"  INTEGER NOT NULL DEFAULT 0,
  "derniereConnexion" TIMESTAMP(3),
  "idempotencyKey"  TEXT UNIQUE,
  "events"          JSONB NOT NULL DEFAULT '[]',
  "meta"            JSONB
);
CREATE INDEX IF NOT EXISTS "Fournisseur_statut_idx" ON "Fournisseur" ("statut");
CREATE INDEX IF NOT EXISTS "Fournisseur_region_idx" ON "Fournisseur" ("region");
CREATE INDEX IF NOT EXISTS "Fournisseur_metier_idx" ON "Fournisseur" ("metier");

CREATE TABLE IF NOT EXISTS "SupplierPrice" (
  "id"              TEXT PRIMARY KEY,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fournisseurId"   TEXT NOT NULL REFERENCES "Fournisseur"("id") ON DELETE CASCADE,
  "materiauCode"    TEXT NOT NULL,                            -- code CIT du catalogue
  "uniteVente"      TEXT NOT NULL,                            -- code d'unité de vente (sac50, barre12…)
  "prixHT"          DOUBLE PRECISION NOT NULL,                -- par unité de vente
  "tvaPct"          DOUBLE PRECISION NOT NULL DEFAULT 20,
  "prixRefHT"       DOUBLE PRECISION NOT NULL,                -- ramené à l'unité de référence du catalogue
  "quantiteMin"     DOUBLE PRECISION,
  "degressifs"      JSONB NOT NULL DEFAULT '[]',              -- [{ "aPartirDe": 100, "prixHT": 76 }]
  "livraison"       JSONB NOT NULL DEFAULT '[]',              -- [{ "zone": "rabat-sale-kenitra", "frais": 300, "delaiJours": 2 }]
  "disponibilite"   TEXT NOT NULL DEFAULT 'EN_STOCK',         -- EN_STOCK | SUR_COMMANDE | RUPTURE
  "validiteJusquau" DATE,
  "marque"          TEXT,
  "note"            TEXT,
  "statut"          TEXT NOT NULL DEFAULT 'PENDING',          -- PENDING | APPROVED | REJECTED
  "signalement"     TEXT,                                     -- ABERRANT_HAUT | ABERRANT_BAS
  "ecartRef"        DOUBLE PRECISION,                         -- 0.6 = +60 % / référence
  "moderePar"       TEXT,
  "modereLe"        TIMESTAMP(3),
  UNIQUE ("fournisseurId", "materiauCode")
);
CREATE INDEX IF NOT EXISTS "SupplierPrice_materiau_idx" ON "SupplierPrice" ("materiauCode", "statut");
CREATE INDEX IF NOT EXISTS "SupplierPrice_statut_idx" ON "SupplierPrice" ("statut");

CREATE TABLE IF NOT EXISTS "SupplierPriceHistory" (
  "id"              TEXT PRIMARY KEY,
  "at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priceId"         TEXT NOT NULL,
  "fournisseurId"   TEXT NOT NULL,
  "materiauCode"    TEXT NOT NULL,
  "action"          TEXT NOT NULL,                            -- CREATION | MISE_A_JOUR | SUPPRESSION | MODERATION
  "auteur"          TEXT NOT NULL,
  "prixHT"          DOUBLE PRECISION,
  "prixRefHT"       DOUBLE PRECISION,
  "uniteVente"      TEXT,
  "donnees"         JSONB
);
CREATE INDEX IF NOT EXISTS "SupplierPriceHistory_price_idx" ON "SupplierPriceHistory" ("priceId", "at");
CREATE INDEX IF NOT EXISTS "SupplierPriceHistory_fournisseur_idx" ON "SupplierPriceHistory" ("fournisseurId", "at");

CREATE TABLE IF NOT EXISTS "DemandePrix" (
  "id"              TEXT PRIMARY KEY,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statut"          TEXT NOT NULL DEFAULT 'OUVERTE',          -- OUVERTE | CLOTUREE | ANNULEE
  "leadId"          TEXT,                                     -- "Lead"."id"
  "clientNom"       TEXT NOT NULL,
  "clientTelephone" TEXT NOT NULL,
  "clientEmail"     TEXT,
  "ville"           TEXT NOT NULL,
  "region"          TEXT,
  "lot"             TEXT,                                     -- LOT_02_GO_BETON…
  "porte"           TEXT,                                     -- porte du client (P1…P6)
  "lignes"          JSONB NOT NULL,                           -- [{ "code": "CIT-GO-008", "quantite": 840, "uniteRef": "kg", "libelle": "…" }]
  "fournisseurIds"  TEXT[] NOT NULL DEFAULT '{}',
  "commissionPct"   DOUBLE PRECISION NOT NULL,
  "jetonHash"       TEXT NOT NULL,                            -- accès client au comparatif (SHA-256 du jeton)
  "idempotencyKey"  TEXT UNIQUE,
  "message"         TEXT,
  "meta"            JSONB
);
CREATE INDEX IF NOT EXISTS "DemandePrix_createdAt_idx" ON "DemandePrix" ("createdAt");

CREATE TABLE IF NOT EXISTS "ReponsePrix" (
  "id"              TEXT PRIMARY KEY,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "demandeId"       TEXT NOT NULL REFERENCES "DemandePrix"("id") ON DELETE CASCADE,
  "fournisseurId"   TEXT NOT NULL REFERENCES "Fournisseur"("id") ON DELETE CASCADE,
  "statut"          TEXT NOT NULL DEFAULT 'ENVOYEE',          -- ENVOYEE | ACCEPTEE | DECLINEE
  "lignes"          JSONB NOT NULL,                           -- [{ "code", "prixUnitaireHT" (par uniteRef), "disponible", "commentaire" }]
  "totalHT"         DOUBLE PRECISION NOT NULL,
  "fraisLivraisonHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "delaiJours"      INTEGER,
  "validiteJours"   INTEGER,
  "message"         TEXT,
  "commissionPct"   DOUBLE PRECISION NOT NULL,
  "contactInitieLe" TIMESTAMP(3),                             -- coordonnées dévoilées au client à partir de là
  UNIQUE ("demandeId", "fournisseurId")
);
CREATE INDEX IF NOT EXISTS "ReponsePrix_fournisseur_idx" ON "ReponsePrix" ("fournisseurId");

CREATE TABLE IF NOT EXISTS "ParametrePlateforme" (
  "cle"             TEXT PRIMARY KEY,
  "valeur"          JSONB NOT NULL,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "auteur"          TEXT
);
INSERT INTO "ParametrePlateforme" ("cle", "valeur", "auteur")
  VALUES ('commissionPctDefaut', '4', 'installation')
  ON CONFLICT ("cle") DO NOTHING;
