-- CITURBAREA — tout le SQL Neon en un seul collage (généré, ne pas éditer).
-- Source : docs/sql/A-COLLER-DANS-NEON.md · régénérer : node scripts/sql-neon.mjs
-- Rejouable sans risque : n'efface ni ne modifie aucune donnée existante.
-- ═════ docs/sql/dossiers-neon.sql ═════
-- Tables User et Dossier dans Neon, générées depuis prisma/schema.prisma (prisma migrate diff 5.22.0).
-- But : /api/intake (Pages Function) crée les dossiers des portes P1 à P6 en production,
-- visibles dans admin.citurbarea.com (/cc/dossiers).
-- Idempotent : peut être exécuté plusieurs fois dans la console SQL de Neon, ne modifie rien d'existant.
-- Clés étrangères vers Firm et Project omises (tables non nécessaires ici) ; un futur prisma db push les ajoutera.

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'OPERATOR', 'OPS', 'OWNER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'VVIP', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DossierStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "plan" "Plan" NOT NULL DEFAULT 'PRO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "firmId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Dossier" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "parcelRef" TEXT,
    "status" "DossierStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packSelected" TEXT,
    "packPriceMAD" DOUBLE PRECISION,
    "projectType" TEXT,
    "constructionLevel" TEXT,
    "caseId" TEXT,
    "projectId" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "disclaimerAcceptedAt" TIMESTAMP(3),
    "opsNote" TEXT,
    "firmId" TEXT,
    "porteType" TEXT NOT NULL DEFAULT 'P1',
    "gestionMode" TEXT NOT NULL DEFAULT 'AUTONOME',
    "phase" TEXT NOT NULL DEFAULT '00_BRIEF',
    "refInterne" TEXT,
    "mandatSigne" BOOLEAN NOT NULL DEFAULT false,
    "mandatSigneAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "clientNom" TEXT,
    "clientCin" TEXT,
    "clientTel" TEXT,
    "clientEmail" TEXT,
    "clientAdresse" TEXT,
    "raisonSociale" TEXT,
    "rc" TEXT,
    "ice" TEXT,
    "representant" TEXT,
    "sousTypeP2" TEXT,
    "lambertX" DOUBLE PRECISION,
    "lambertY" DOUBLE PRECISION,
    "lambertSystem" TEXT DEFAULT 'Lambert_Maroc_Nord',
    "wgs84Lat" DOUBLE PRECISION,
    "wgs84Lng" DOUBLE PRECISION,
    "surfaceTerrain" DOUBLE PRECISION,
    "surfacePlancher" DOUBLE PRECISION,
    "nbNiveaux" INTEGER,
    "nbLogements" INTEGER,
    "natureProjet" TEXT,
    "usageBien" TEXT,
    "budgetEstime" DOUBLE PRECISION,
    "adresseTerrain" TEXT,
    "arrondissement" TEXT,
    "nbSousSols" INTEGER,
    "nbEtagesHorsSol" INTEGER,
    "typeOperationFoncier" TEXT,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "Dossier_projectId_key" ON "Dossier"("projectId");
CREATE INDEX IF NOT EXISTS "Dossier_ownerId_status_idx" ON "Dossier"("ownerId", "status");

DO $$ BEGIN
  ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═════ docs/sql/rendezvous-neon.sql ═════
-- Rendez-vous en visio avec l'architecte (/rendez-vous, /rdv/<jeton>, /cc/rendez-vous).
-- Aligné sur prisma/schema.prisma (models RendezVous et Parametre).
-- Idempotent : à exécuter une fois dans la console SQL de Neon (rien d'existant n'est modifié).
-- Les Pages Functions ne créent jamais ces tables : absentes → 503.

CREATE TABLE IF NOT EXISTS "RendezVous" (
    "id" TEXT NOT NULL,
    -- SHA-256 (hex) du jeton d'accès client : le jeton lui-même n'est jamais stocké.
    "jetonHash" TEXT NOT NULL,
    -- Salle visio JaaS non devinable (« rdv- » + 24 caractères aléatoires).
    "salle" TEXT NOT NULL,
    -- Instant UTC ; affiché à l'heure du Maroc (Africa/Casablanca).
    "debut" TIMESTAMPTZ(3) NOT NULL,
    "dureeMin" INTEGER NOT NULL DEFAULT 30,
    -- CONFIRME | ANNULE | TERMINE | ABSENT
    "statut" TEXT NOT NULL DEFAULT 'CONFIRME',
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "porte" TEXT,
    -- MAISON | PERMIS | CHIFFRAGE | TERRAIN | AUTRE
    "objet" TEXT,
    "message" TEXT,
    "dossierId" TEXT,
    "userId" TEXT,
    "leadId" TEXT,
    "leadSource" TEXT,
    "utm" JSONB,
    -- Réponses du dossier rempli pendant l'appel (liste blanche), avec majLe.
    "dossierRdv" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "noteArchitecte" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RendezVous_jetonHash_key" ON "RendezVous"("jetonHash");
CREATE UNIQUE INDEX IF NOT EXISTS "RendezVous_salle_key" ON "RendezVous"("salle");
CREATE INDEX IF NOT EXISTS "RendezVous_debut_idx" ON "RendezVous"("debut");
CREATE INDEX IF NOT EXISTS "RendezVous_statut_debut_idx" ON "RendezVous"("statut", "debut");
-- Anti double réservation : un seul rendez-vous CONFIRME par heure de début.
-- (Index partiel : Prisma ne sait pas le décrire ; à conserver lors d'un éventuel prisma db push.)
CREATE UNIQUE INDEX IF NOT EXISTS "RendezVous_debut_confirme_key" ON "RendezVous"("debut") WHERE "statut" = 'CONFIRME';

CREATE TABLE IF NOT EXISTS "Parametre" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("cle")
);

-- ═════ docs/sql/terrains-neon.sql ═════
-- Table des annonces de terrains (porte P4), générée depuis prisma/schema.prisma (prisma migrate diff 5.22.0).
-- Idempotente : à exécuter une fois dans la console SQL de Neon.

CREATE TABLE IF NOT EXISTS "TerrainAnnonce" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "deposant" TEXT NOT NULL,
    "mandat" BOOLEAN NOT NULL DEFAULT false,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "ville" TEXT NOT NULL,
    "quartier" TEXT,
    "surface" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION,
    "titre" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "description" TEXT,
    "noteAdmin" TEXT,
    "publieAt" TIMESTAMP(3),
    "leadId" TEXT,

    CONSTRAINT "TerrainAnnonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TerrainAnnonce_slug_key" ON "TerrainAnnonce"("slug");
CREATE INDEX IF NOT EXISTS "TerrainAnnonce_statut_createdAt_idx" ON "TerrainAnnonce"("statut", "createdAt");
CREATE INDEX IF NOT EXISTS "TerrainAnnonce_ville_idx" ON "TerrainAnnonce"("ville");

-- ═════ docs/sql/espace-projet-neon.sql ═════
-- Espace projet (lot 1) : projet décomposé en jalons, membres invités par lien,
-- checklist avec preuves, discussion, fichiers (R2), PV / documents types, journal.
-- Aligné sur prisma/schema.prisma (models Projet, ProjetMembre, ProjetJalon,
-- ProjetMessage, ProjetFichier, ProjetDocument, ProjetEvenement).
-- Idempotent : à exécuter une fois dans la console SQL de Neon (rien d'existant n'est modifié).
-- Les Pages Functions ne créent jamais ces tables : absentes → 503.

CREATE TABLE IF NOT EXISTS "Projet" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT,
    "titre" TEXT NOT NULL,
    -- { type, sousSols, etagesHorsSol, hauteurM, zoneSismique, erp, ascenseur, piscine }
    "caracteristiques" JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- « domaine@version » des fichiers du référentiel au moment de la création
    "referentielVersion" TEXT NOT NULL,
    -- Instantané des exigences, normes, modèles et phases utilisés par les jalons du projet
    "referentiel" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Projet_dossierId_idx" ON "Projet"("dossierId");

CREATE TABLE IF NOT EXISTS "ProjetMembre" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    -- Role de apps/web/src/domain/referentiel/types.ts (CLIENT, ARCHITECTE, BET_STRUCTURE…)
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "entreprise" TEXT,
    -- SHA-256 (hex) du jeton d'accès (256 bits) : le jeton n'est jamais stocké
    "jetonHash" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "invitePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dernierAcces" TIMESTAMP(3),
    CONSTRAINT "ProjetMembre_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjetMembre_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjetMembre_jetonHash_key" ON "ProjetMembre"("jetonHash");
CREATE INDEX IF NOT EXISTS "ProjetMembre_projetId_idx" ON "ProjetMembre"("projetId");

CREATE TABLE IF NOT EXISTS "ProjetJalon" (
    "projetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "rang" INTEGER NOT NULL DEFAULT 0,
    -- Définition figée à la création (titre, objectif, acteurs, validateurs, checklist, prérequis, pointArret…)
    "definition" JSONB NOT NULL,
    -- A_FAIRE | EN_COURS | EN_ATTENTE_VALIDATION | VALIDE | BLOQUE | SANS_OBJET
    "statut" TEXT NOT NULL DEFAULT 'A_FAIRE',
    -- { pointId: { fait, par, role, le, preuveIds[], commentaire } }
    "checklist" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "validePar" TEXT,
    "valideLe" TIMESTAMP(3),
    -- Salle visio JaaS (« chantier- » + 24 caractères aléatoires), créée à la première réunion
    "salle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetJalon_pkey" PRIMARY KEY ("projetId", "code"),
    CONSTRAINT "ProjetJalon_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjetJalon_projetId_rang_idx" ON "ProjetJalon"("projetId", "rang");

CREATE TABLE IF NOT EXISTS "ProjetMessage" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "jalonCode" TEXT NOT NULL,
    -- NULL quand l'auteur est l'administration (back-office)
    "auteurMembreId" TEXT,
    "auteurNom" TEXT NOT NULL,
    "auteurRole" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "pieceIds" JSONB,
    -- Append-only : une « suppression » est un masquage par l'administration
    "masque" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjetMessage_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjetMessage_projet_jalon_date_idx" ON "ProjetMessage"("projetId", "jalonCode", "createdAt");

CREATE TABLE IF NOT EXISTS "ProjetFichier" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "jalonCode" TEXT,
    "pointId" TEXT,
    "auteurMembreId" TEXT,
    "auteurNom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" BIGINT NOT NULL,
    -- Clé de l'objet dans le bucket R2 (binding FICHIERS) : projets/<projetId>/<id>
    "cleR2" TEXT NOT NULL,
    -- PHOTO | VIDEO | DOCUMENT | PLAN | PV
    "nature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetFichier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjetFichier_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjetFichier_projet_jalon_idx" ON "ProjetFichier"("projetId", "jalonCode", "createdAt");

CREATE TABLE IF NOT EXISTS "ProjetDocument" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "jalonCode" TEXT NOT NULL,
    "modeleId" TEXT NOT NULL,
    "valeurs" JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- BROUILLON | SIGNE
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    -- [{ membreId, nom, role, le }]
    "signatures" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "auteurNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjetDocument_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjetDocument_projet_jalon_idx" ON "ProjetDocument"("projetId", "jalonCode");

-- Journal (traçabilité) : une ligne par action, jamais modifiée.
CREATE TABLE IF NOT EXISTS "ProjetEvenement" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjetEvenement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjetEvenement_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjetEvenement_projet_date_idx" ON "ProjetEvenement"("projetId", "createdAt");

-- ═════ docs/prix/sql/cercles-fournisseurs.sql ═════
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

-- ═════ docs/prix/sql/cercles-fiches-catalogue.sql ═════
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

-- ═════ docs/prix/sql/cercles-images.sql ═════
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

-- ═════ docs/prix/sql/cercles-acces-pro.sql ═════
-- CITURBAREA — Cercles : outils réservés aux pros agréés (accordés par l'admin, membre par membre).
-- Prérequis : docs/prix/sql/cercles-fournisseurs.sql (table "Fournisseur").
-- Rejouable sans risque (IF NOT EXISTS) ; n'efface ni ne modifie aucune donnée.
-- Contrat : docs/architecture/contrat-acces-pro.md. Modèle Prisma : Fournisseur.acces / accesDemandes.

-- { "MATERIAUTHEQUE_PRO": { "actif": true, "depuis": "2026-10-15T…", "par": "admin@…", "expireLe": null }, "CPS": … } — vide = membre de base.
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "acces"         JSONB NOT NULL DEFAULT '{}';
-- [{ "outil": "CPS", "le": "2026-10-15T…", "message": "…" }] — demandes en attente, effacées quand l'admin tranche.
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "accesDemandes" JSONB NOT NULL DEFAULT '[]';

-- ═════ docs/prix/sql/prix-reference-manuel.sql ═════
-- Matériauthèque — mises à jour manuelles des prix de référence (back-office /cc/materiaux).
-- Table append-only : chaque correction est une nouvelle ligne (historique complet).
-- À coller dans Neon (console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run). Idempotent : peut être relancé sans risque.
-- Prix en DH HT par unité de référence du catalogue (kg, m³, m², ml, u, l).

CREATE TABLE IF NOT EXISTS "PrixReferenceManuel" (
  "id"          TEXT PRIMARY KEY,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "code"        TEXT NOT NULL,                 -- code CIT du catalogue (CIT-GO-008…)
  "prixHT"      DOUBLE PRECISION NOT NULL,
  "prixMinHT"   DOUBLE PRECISION NOT NULL,
  "prixMaxHT"   DOUBLE PRECISION NOT NULL,
  "source"      TEXT NOT NULL,                 -- obligatoire : devis, mercuriale, distributeur…
  "sourceUrl"   TEXT,
  "datePrix"    DATE NOT NULL,
  "note"        TEXT,
  "auteur"      TEXT NOT NULL,                 -- e-mail de l'administrateur
  "prixAvantHT" DOUBLE PRECISION              -- prix de référence remplacé (traçabilité)
);
CREATE INDEX IF NOT EXISTS "PrixReferenceManuel_code_idx" ON "PrixReferenceManuel" ("code", "createdAt");

-- ═════ docs/prix/sql/achat-en-ligne.sql ═════
-- Achat en ligne de matériaux (PHASE 2) — NE PAS EXÉCUTER avant le lancement.
-- Modèle : apps/web/src/domain/materiaux/achat.ts ; architecture : docs/achat-en-ligne.md.
-- Prérequis : tables Cercles (docs/prix/sql/cercles-fournisseurs.sql).
-- Deux modes : NEGOCE (CITURBAREA, société commerciale, vend en son nom) et MARKETPLACE (fournisseur partenaire, commission).

CREATE TABLE IF NOT EXISTS "Commande" (
  "id"                TEXT PRIMARY KEY,
  "reference"         TEXT NOT NULL UNIQUE,              -- CMD-2027-000123
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statut"            TEXT NOT NULL DEFAULT 'BROUILLON', -- BROUILLON | DEVIS_CONFIRME | PAIEMENT_EN_COURS | PAYEE | EN_PREPARATION | EXPEDIEE | LIVREE | CLOTUREE | LITIGE | ANNULEE | REMBOURSEE
  "leadId"            TEXT,                              -- "Lead"."id" (demande de prix d'origine)
  "demandePrixId"     TEXT REFERENCES "DemandePrix"("id") ON DELETE SET NULL,
  "mode"              TEXT NOT NULL,                     -- NEGOCE (CITURBAREA vend et facture) | MARKETPLACE (le fournisseur vend, commission)
  "fournisseurId"     TEXT REFERENCES "Fournisseur"("id"), -- vendeur en MARKETPLACE ; NULL en NEGOCE (vendeur = CITURBAREA)
  "clientNom"         TEXT NOT NULL,
  "clientTelephone"   TEXT NOT NULL,
  "clientEmail"       TEXT,
  "villeLivraison"    TEXT NOT NULL,
  "adresseLivraison"  TEXT NOT NULL,
  "creneauLivraison"  TEXT,
  "fraisLivraisonHT"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalHT"           DOUBLE PRECISION NOT NULL,
  "totalTVA"          DOUBLE PRECISION NOT NULL,
  "totalTTC"          DOUBLE PRECISION NOT NULL,
  "commissionPct"     DOUBLE PRECISION NOT NULL DEFAULT 0, -- MARKETPLACE : figé à la commande (ParametrePlateforme / Fournisseur."commissionPct")
  "commissionHT"      DOUBLE PRECISION NOT NULL DEFAULT 0, -- MARKETPLACE seulement
  "margeHT"           DOUBLE PRECISION,                  -- NEGOCE : ventes HT − achats HT
  "paiement"          JSONB NOT NULL DEFAULT '{}'::jsonb, -- { prestataire, transactionId, payeLe } — jamais de numéro de carte
  "livraison"         JSONB NOT NULL DEFAULT '{}'::jsonb, -- { transporteur, suivi, livreLe, preuve }
  "evenements"        JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ at, statut, auteur, note }]
  "idempotencyKey"    TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS "Commande_fournisseur_idx" ON "Commande" ("fournisseurId", "createdAt");
CREATE INDEX IF NOT EXISTS "Commande_statut_idx" ON "Commande" ("statut");

CREATE TABLE IF NOT EXISTS "LigneCommande" (
  "id"              TEXT PRIMARY KEY,
  "commandeId"      TEXT NOT NULL REFERENCES "Commande"("id") ON DELETE CASCADE,
  "materiauCode"    TEXT NOT NULL,                       -- code CIT
  "libelle"         TEXT NOT NULL,
  "uniteVente"      TEXT NOT NULL,
  "quantite"        DOUBLE PRECISION NOT NULL,
  "prixUnitaireHT"  DOUBLE PRECISION NOT NULL,           -- confirmé par le fournisseur
  "tvaPct"          DOUBLE PRECISION NOT NULL DEFAULT 20,
  "totalHT"         DOUBLE PRECISION NOT NULL,
  "totalTTC"        DOUBLE PRECISION NOT NULL,
  "prixAchatHT"     DOUBLE PRECISION,                    -- NEGOCE : coût d'achat de CITURBAREA (interne)
  "approvisionnementFournisseurId" TEXT REFERENCES "Fournisseur"("id")  -- NEGOCE : négociant d'approvisionnement
);
CREATE INDEX IF NOT EXISTS "LigneCommande_commande_idx" ON "LigneCommande" ("commandeId");

-- ═════ docs/sql/appels-video-neon.sql ═════
-- Appels vidéo sur demande (accord de toutes les parties) — tables Neon.
-- À coller dans console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run. Idempotent (IF NOT EXISTS) : peut être relancé sans risque.
-- Logique : functions/_lib/appels.ts ; contrat : docs/architecture/contrat-appels-video.md.

CREATE TABLE IF NOT EXISTS "DemandeAppel" (
    "id" TEXT NOT NULL,
    -- dossier | chantier | reunion | cercles | fournisseur | rdv
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- Identité stable du demandeur : admin:cabinet, frn:<id>, usr:<id>, membre:<id>, rdv:<id>, vis:<empreinte>
    "demandeurCle" TEXT NOT NULL,
    -- EN_ATTENTE | CONFIRMEE | REFUSEE | ANNULEE | EXPIREE | TERMINEE
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    -- Rempli seulement à la confirmation (tous d'accord sur ce créneau), instant UTC.
    "creneauRetenu" TIMESTAMPTZ(3),
    "expireLe" TIMESTAMPTZ(3) NOT NULL,
    -- Clés des participants (listes « mes appels », débit anti-harcèlement).
    "cles" TEXT[] NOT NULL DEFAULT '{}',
    -- Empreintes SHA-256 des liens personnels : les liens ne sont jamais stockés.
    "jetons" TEXT[] NOT NULL DEFAULT '{}',
    -- Demande complète : participants (statut, créneaux acceptés, coordonnées réservées au back-office),
    -- créneaux proposés, message (coordonnées masquées), salle (créée à la confirmation), historique horodaté.
    "donnees" JSONB NOT NULL,
    -- Écriture optimiste : deux réponses simultanées ne s'écrasent pas.
    "version" INTEGER NOT NULL DEFAULT 1,
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeAppel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemandeAppel_demandeur_idx" ON "DemandeAppel"("demandeurCle", "createdAt");
CREATE INDEX IF NOT EXISTS "DemandeAppel_statut_idx" ON "DemandeAppel"("statut", "creneauRetenu");
CREATE INDEX IF NOT EXISTS "DemandeAppel_cles_idx" ON "DemandeAppel" USING GIN ("cles");
CREATE INDEX IF NOT EXISTS "DemandeAppel_jetons_idx" ON "DemandeAppel" USING GIN ("jetons");

-- « Ne plus recevoir de demandes de cette personne » (posé par le destinataire).
CREATE TABLE IF NOT EXISTS "BlocageAppel" (
    "destinataireCle" TEXT NOT NULL,
    "demandeurCle" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlocageAppel_pkey" PRIMARY KEY ("destinataireCle", "demandeurCle")
);

-- Vérification (doit renvoyer deux lignes) :
SELECT table_name FROM information_schema.tables WHERE table_name IN ('DemandeAppel', 'BlocageAppel');

-- ═════ docs/sql/messagerie-neon.sql ═════
-- Messagerie de la plateforme (tout passe par CITURBAREA) — tables Neon.
-- PRÉREQUIS : docs/sql/appels-video-neon.sql (table "BlocageAppel", partagée :
-- bloquer une personne bloque ses messages ET ses demandes d'appel).
-- À coller dans console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run. Idempotent (IF NOT EXISTS).
-- Logique : functions/_lib/messagerie.ts ; contrat : docs/architecture/contrat-messagerie.md.

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    -- dossier | chantier | reunion | cercles | fournisseur | rdv
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- OUVERTE | FERMEE | SIGNALEE
    "statut" TEXT NOT NULL DEFAULT 'OUVERTE',
    -- contexte|objetId|clés triées : un seul fil ouvert par groupe de personnes et par sujet
    "empreinte" TEXT NOT NULL,
    "createurCle" TEXT NOT NULL,
    -- Clés des participants (boîtes de réception) et empreintes SHA-256 des liens personnels
    "cles" TEXT[] NOT NULL DEFAULT '{}',
    "jetons" TEXT[] NOT NULL DEFAULT '{}',
    -- Fil complet : participants (coordonnées réservées au back-office et aux notifications), lu jusqu'à, signalements
    "donnees" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dernierMessageLe" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Conversation_empreinte_idx" ON "Conversation"("empreinte");
CREATE INDEX IF NOT EXISTS "Conversation_createur_idx" ON "Conversation"("createurCle", "createdAt");
CREATE INDEX IF NOT EXISTS "Conversation_statut_idx" ON "Conversation"("statut", "dernierMessageLe");
CREATE INDEX IF NOT EXISTS "Conversation_cles_idx" ON "Conversation" USING GIN ("cles");
CREATE INDEX IF NOT EXISTS "Conversation_jetons_idx" ON "Conversation" USING GIN ("jetons");

CREATE TABLE IF NOT EXISTS "MessageConversation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    -- Participant auteur, ou « systeme » (étapes d'un appel vidéo)
    "auteurId" TEXT NOT NULL,
    "auteurCle" TEXT NOT NULL,
    -- TEXTE | APPEL | SYSTEME
    "type" TEXT NOT NULL DEFAULT 'TEXTE',
    -- Texte déjà masqué (e-mails, numéros, liens, messageries, pseudos)
    "texte" TEXT NOT NULL DEFAULT '',
    "masque" BOOLEAN NOT NULL DEFAULT false,
    -- APPEL : appelId, evenement, creneau, dureeMin, participants ; documents (étape 2) : références
    "meta" JSONB NOT NULL DEFAULT '{}',
    -- Retiré par la modération (jamais supprimé)
    "modere" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageConversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MessageConversation_conversation_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "MessageConversation_fil_idx" ON "MessageConversation"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageConversation_auteur_idx" ON "MessageConversation"("auteurCle", "createdAt");

-- Vérification (doit renvoyer trois lignes, BlocageAppel compris) :
SELECT table_name FROM information_schema.tables WHERE table_name IN ('Conversation', 'MessageConversation', 'BlocageAppel');

-- ═════ docs/sql/devis-facturation-neon.sql ═════
-- Devis & Facturation — étape « création de dossier par l'admin »
-- (spec docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md ; mapping : docs/architecture/contrat-devis-facturation.md).
-- Rejouable : n'efface ni ne modifie aucune donnée. Après dossiers-neon.sql (User, Dossier).
-- Les tables Devis / Facture / Encaissement viendront dans ce même fichier à l'étape suivante.

-- 1. Cabinets d'architecture (ARC-BATI et autres) : architecte du projet et répartition interne des honoraires.
--    L'ÉMETTEUR des devis et factures est CITURBAREA / HSE DECO (décision du 15/10/2026), jamais le cabinet ;
--    téléphone, e-mail et adresse d'un cabinet ne figurent sur aucun document ni écran public.
CREATE TABLE IF NOT EXISTS "Cabinet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "architecte" TEXT,
    "titre" TEXT,
    "numeroOrdre" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "rc" TEXT,
    "patente" TEXT,
    "logoUrl" TEXT,
    "charte" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "grilleId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Cabinet" ("id", "nom", "architecte", "titre", "ville", "grilleId", "charte")
VALUES ('cab_arc_bati', 'ARC-BATI ARCHITECTURE', 'Yassine ATTARASSI', 'Architecte DENA, Ordre des Architectes du Maroc', 'Kénitra',
        'arc-bati-2026-10', '{"police":"Calibri","bleuNuit":"#1F3864","fondClair":"#EEF1F7"}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- 2. Dossier = « Projet » de la spec (§1.3) ; le client (§1.2) = User CLIENT + colonnes client* du dossier.
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "cabinetId" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "origine" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "creePar" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientCivilite" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientPrenom" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientVille" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientIdentifiantFiscal" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "typologie" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "gabarit" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "lot" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "lotissement" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "prefecture" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "titreFoncier" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationNum" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationDate" DATE;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationExpiration" DATE;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "etatChantier" TEXT;
CREATE INDEX IF NOT EXISTS "Dossier_cabinetId_idx" ON "Dossier"("cabinetId");
CREATE INDEX IF NOT EXISTS "Dossier_autorisationExpiration_idx" ON "Dossier"("autorisationExpiration");

-- 3. Étapes du dossier (codes de packages/contracts/src/phases.catalog.ts) : phases antérieures
--    « faites hors plateforme », phase en cours. Lu par la fiche dossier admin (lot 3c) et l'espace client.
CREATE TABLE IF NOT EXISTS "DossierEtape" (
    "dossierId" TEXT NOT NULL,
    "phaseCode" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "dateRealisation" DATE,
    "note" TEXT,
    "documentIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "saisiPar" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierEtape_pkey" PRIMARY KEY ("dossierId", "phaseCode")
);

-- 4. Journal des actions admin sur un dossier (append-only).
CREATE TABLE IF NOT EXISTS "DossierEvenement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierEvenement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DossierEvenement_dossierId_idx" ON "DossierEvenement"("dossierId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DossierEtape" ADD CONSTRAINT "DossierEtape_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierEvenement" ADD CONSTRAINT "DossierEvenement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Numérotation légale DEV / FAC / AVO (spec §6.1) : un compteur par type et par année,
--    incrémenté dans la MÊME instruction que l'émission du document (pas de numéro au brouillon).
CREATE TABLE IF NOT EXISTS "SequenceDocument" (
    "type" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SequenceDocument_pkey" PRIMARY KEY ("type", "annee")
);

-- 6. Devis (spec §1.7, §6.2). `entree` = saisie de l'éditeur ; à l'émission le serveur recalcule,
--    fige `document` (modèle rendu en PDF et DOCX), `hashContenu` (SHA-256) et les montants.
--    Une modification après émission crée une RÉVISION (DEV-2026-0043-R2), jamais une écriture en place.
CREATE TABLE IF NOT EXISTS "Devis" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" TEXT,
    "numeroBase" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "devisOrigineId" TEXT,
    "remplacePar" TEXT,
    "type" TEXT NOT NULL,
    "presentation" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "grilleVersionId" TEXT NOT NULL,
    "dateEmission" DATE,
    "validiteJours" INTEGER NOT NULL DEFAULT 30,
    "coutPrevisionnelTravaux" NUMERIC(14,2),
    "tauxHonoraires" NUMERIC(6,3),
    "assietteHonoraires" NUMERIC(14,2),
    "montantTotal" NUMERIC(14,2),
    "modalitesPaiement" TEXT,
    "entree" JSONB NOT NULL,
    "document" JSONB,
    "hashContenu" TEXT,
    "packChoisi" TEXT,
    "dateAcceptation" TIMESTAMP(3),
    "preuveAcceptation" JSONB,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Devis_numero_key" ON "Devis"("numero");
CREATE INDEX IF NOT EXISTS "Devis_dossierId_idx" ON "Devis"("dossierId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "Devis" ADD CONSTRAINT "Devis_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
