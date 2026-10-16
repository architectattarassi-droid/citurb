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

-- 7. Acceptation du devis (spec §6.2) : pack retenu, prestations commandées et montant engagé.
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "montantAccepte" NUMERIC(14,2);
ALTER TABLE "Devis" ADD COLUMN IF NOT EXISTS "lignesAcceptees" JSONB;

-- 8. Échéancier par phase (décision du 15/10/2026 : chaque phase P00…P14 démarre après paiement).
--    Une échéance déjà facturée est figée ; les autres sont modifiables par l'admin (journalisé).
CREATE TABLE IF NOT EXISTS "EcheancePaiement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "phaseCode" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantHT" NUMERIC(14,2) NOT NULL,
    "declencheur" TEXT NOT NULL DEFAULT 'DEBUT_PHASE',
    "prestations" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EcheancePaiement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EcheancePaiement_dossier_idx" ON "EcheancePaiement"("dossierId", "phaseCode");

-- 9. Factures et avoirs (spec §1.9, §6.1) : FAC-AAAA-NNNN / AVO-AAAA-NNNN alloués dans l'instruction
--    même qui crée la facture émise (jamais au brouillon) ; immuables, correction par avoir.
CREATE TABLE IF NOT EXISTS "Facture" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "devisId" TEXT,
    "echeanceId" TEXT,
    "factureOrigineId" TEXT,
    "numero" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EMISE',
    "dateEmission" DATE NOT NULL,
    "dateEcheance" DATE NOT NULL,
    "montantHT" NUMERIC(14,2) NOT NULL,
    "tauxTVA" NUMERIC(6,3) NOT NULL,
    "montantTVA" NUMERIC(14,2) NOT NULL,
    "montantTTC" NUMERIC(14,2) NOT NULL,
    "retenueSource" NUMERIC(14,2),
    "netAPayer" NUMERIC(14,2) NOT NULL,
    "lignes" JSONB NOT NULL,
    "motif" TEXT,
    "document" JSONB,
    "hashContenu" TEXT,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Facture_numero_key" ON "Facture"("numero");
CREATE INDEX IF NOT EXISTS "Facture_dossier_idx" ON "Facture"("dossierId", "dateEmission");
-- Une seule facture active par échéance (une facture annulée par avoir libère l'échéance).
CREATE UNIQUE INDEX IF NOT EXISTS "Facture_echeance_active_key" ON "Facture"("echeanceId") WHERE "type" <> 'AVOIR' AND "statut" <> 'ANNULEE';

-- 10. Encaissements (spec §1.9) : virement, chèque, espèces, effet ; justificatif dans le dépôt commun (DocumentDepose).
CREATE TABLE IF NOT EXISTS "Encaissement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "montant" NUMERIC(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "justificatifId" TEXT,
    "saisiPar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Encaissement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Encaissement_facture_idx" ON "Encaissement"("factureId");

-- 11. Déblocage motivé d'une phase non payée (point d'arrêt levé par l'admin, motif écrit obligatoire).
CREATE TABLE IF NOT EXISTS "DeblocagePaiement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "phaseCode" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "par" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeblocagePaiement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DeblocagePaiement_dossier_idx" ON "DeblocagePaiement"("dossierId", "phaseCode");

DO $$ BEGIN
  ALTER TABLE "EcheancePaiement" ADD CONSTRAINT "EcheancePaiement_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Facture" ADD CONSTRAINT "Facture_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═════ docs/sql/gestion-projet-neon.sql ═════
-- Gestion de projet (lots GP2 à GP4) — docs/gestion-projet/audit-et-ameliorations.md.
-- Rejouable : n'efface ni ne modifie aucune donnée. Après dossiers-neon.sql (Dossier),
-- espace-projet-neon.sql (ProjetJalon) et devis-facturation-neon.sql (DossierEvenement).
-- Tant que ce fichier n'est pas collé, les écrans affichent les pièces « Document manquant »
-- en lecture seule et refusent le dépôt avec un message clair (aucune erreur 500).

-- 1. Dépôt de documents commun (contrat docs/architecture/contrat-depot-fichiers.md) :
--    PDF et images, octets dans Neon (bytea) en attendant R2 ; nom de fichier sans coordonnées.
CREATE TABLE IF NOT EXISTS "DocumentDepose" (
    "id" TEXT NOT NULL,
    -- dossier | appel | messagerie | cercles | projet …
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- admin:<email> | client:<userId> | membre:<membreId> | fournisseur:<id>
    "proprietaire" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "octets" BYTEA,
    "cleR2" TEXT,
    "empreinte" TEXT NOT NULL,
    -- PRIVE | PENDING | APPROVED | REJECTED
    "statut" TEXT NOT NULL DEFAULT 'PRIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentDepose_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DocumentDepose_contexte_objet_idx" ON "DocumentDepose"("contexte", "objetId");

-- 2. Pièces attendues d'un dossier, phase par phase (exigence A du fondateur).
--    Une pièce sans ligne est « MANQUANT » : la liste attendue vient du référentiel
--    (packages/contracts/src/gestion/pieces.ts), seules les pièces traitées sont écrites ici.
CREATE TABLE IF NOT EXISTS "DossierPiece" (
    "dossierId" TEXT NOT NULL,
    -- « <phase P..>:<code du document> », ex. P04_AUTORISATION:VISA_ORDRE_REGIONAL
    "cle" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    -- motif d'un refus ou d'un « sans objet »
    "motif" TEXT,
    -- identifiants "DocumentDepose"
    "documentIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "deposePar" TEXT,
    "deposeLe" TIMESTAMP(3),
    "validePar" TEXT,
    "valideLe" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierPiece_pkey" PRIMARY KEY ("dossierId", "cle")
);
DO $$ BEGIN
  ALTER TABLE "DossierPiece" ADD CONSTRAINT "DossierPiece_statut_check" CHECK ("statut" IN ('DEPOSE', 'VALIDE', 'REFUSE', 'SANS_OBJET'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierPiece" ADD CONSTRAINT "DossierPiece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Points d'arrêt de chantier débloqués par l'administrateur (GP3) : { par, le, motif, pvManquants }.
--    Sans cette colonne, le déblocage fonctionne et le motif reste dans le journal du projet.
DO $$ BEGIN
  IF to_regclass('public."ProjetJalon"') IS NOT NULL THEN
    ALTER TABLE "ProjetJalon" ADD COLUMN IF NOT EXISTS "deblocage" JSONB;
  END IF;
END $$;

-- ═════ docs/sql/documents-neon.sql ═════
-- Dépôt de documents commun (images, PDF, plans, vidéos) — EXTENSION de la table
-- "DocumentDepose" créée par docs/sql/gestion-projet-neon.sql (pièces du dossier).
-- Une seule table pour toute la plateforme. Contrat : docs/architecture/contrat-depot-fichiers.md ;
-- logique : functions/_lib/depot*.ts. Rejouable : n'efface ni ne modifie aucune donnée existante.

-- Même définition de base que gestion-projet-neon.sql (sans effet si la table existe déjà).
CREATE TABLE IF NOT EXISTS "DocumentDepose" (
    "id" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    "proprietaire" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "octets" BYTEA,
    "cleR2" TEXT,
    "empreinte" TEXT NOT NULL,
    -- PRIVE | PENDING (à modérer) | APPROVED (visible) | REJECTED | EN_COURS (envoi) | SUPPRIME (suppression logique)
    "statut" TEXT NOT NULL DEFAULT 'PRIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentDepose_pkey" PRIMARY KEY ("id")
);

-- Vidéos jusqu'à 5 Go (R2) : taille sur 64 bits.
ALTER TABLE "DocumentDepose" ALTER COLUMN "taille" TYPE BIGINT;

ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "deposantNom" TEXT;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "nomNormalise" TEXT NOT NULL DEFAULT '';
-- NEON (octets en base) | R2 (binding FICHIERS)
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "support" TEXT NOT NULL DEFAULT 'NEON';
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "vignette" BYTEA;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "largeur" INTEGER;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "hauteur" INTEGER;
-- Métadonnées libres : phase, categorie, niveau, version, legende (coordonnées masquées)
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "meta" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "motif" TEXT;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "moderePar" TEXT;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "modereLe" TIMESTAMPTZ(3);
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "supprimePar" TEXT;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "supprimeLe" TIMESTAMPTZ(3);
-- Envoi en cours : plan (mode, morceaux), identifiant multipart R2, morceaux reçus
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "televersement" JSONB;
-- Copie d'archive dans Google Drive
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "driveId" TEXT;
ALTER TABLE "DocumentDepose" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "DocumentDepose_contexte_statut_idx" ON "DocumentDepose"("contexte", "objetId", "statut", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentDepose_version_idx" ON "DocumentDepose"("contexte", "objetId", "nomNormalise");
CREATE INDEX IF NOT EXISTS "DocumentDepose_proprietaire_idx" ON "DocumentDepose"("proprietaire", "createdAt");
CREATE INDEX IF NOT EXISTS "DocumentDepose_statut_idx" ON "DocumentDepose"("statut", "createdAt");

-- ═════ docs/sql/materiaux-referentiel-amorcage.sql ═════
-- Amorçage du référentiel des matériaux en base — GÉNÉRÉ par scripts/sql-referentiel-materiaux.mjs
-- depuis apps/web/src/domain/materiaux/catalogue.ts (version 2026-10.1, 280 codes). Ne pas modifier à la main.
-- Idempotent : ON CONFLICT DO NOTHING (un code déjà présent, ou créé en modération, n'est jamais modifié).
-- Prérequis : docs/prix/sql/cercles-fiches-catalogue.sql (table "MateriauReferentiel").

INSERT INTO "MateriauReferentiel" ("code", "libelleFr", "categorie", "famille", "uniteRef", "parent", "lots", "actif", "auteur") VALUES
  ('CIT-GO-001', 'Acier HA Fe E500 (tous diamètres)', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-021', 'Acier HA Fe E500 Ø6', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-022', 'Acier HA Fe E500 Ø8', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-023', 'Acier HA Fe E500 Ø10', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-024', 'Acier HA Fe E500 Ø12', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-025', 'Acier HA Fe E500 Ø14', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-026', 'Acier HA Fe E500 Ø16', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-027', 'Acier HA Fe E500 Ø20', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-028', 'Acier HA Fe E500 Ø25', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', 'CIT-GO-001', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-020', 'Treillis soudé (toutes mailles)', 'GROS_OEUVRE', 'Aciers d''armature', 'm2', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-029', 'Treillis soudé ST10', 'GROS_OEUVRE', 'Aciers d''armature', 'm2', 'CIT-GO-020', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-030', 'Treillis soudé ST25', 'GROS_OEUVRE', 'Aciers d''armature', 'm2', 'CIT-GO-020', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-031', 'Treillis soudé ST50', 'GROS_OEUVRE', 'Aciers d''armature', 'm2', 'CIT-GO-020', ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-032', 'Fil d''attache recuit', 'GROS_OEUVRE', 'Aciers d''armature', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-008', 'Ciment CPJ 45', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_02_GO_BETON', 'LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-033', 'Ciment CPJ 35', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-034', 'Ciment CPJ 55', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-035', 'Ciment CPA (vrac)', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-036', 'Ciment résistant aux sulfates (CRS)', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-037', 'Ciment blanc', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_03_MACONNERIE', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-007', 'Chaux hydraulique', 'GROS_OEUVRE', 'Liants', 'kg', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-014', 'Mortier bâtard prêt à l''emploi', 'GROS_OEUVRE', 'Mortiers', 'kg', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-015', 'Mortier de ciment prêt à l''emploi', 'GROS_OEUVRE', 'Mortiers', 'kg', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-038', 'Mortier de réparation R4', 'GROS_OEUVRE', 'Mortiers', 'kg', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-039', 'Enduit monocouche de façade', 'GROS_OEUVRE', 'Enduits', 'kg', NULL, ARRAY['LOT_03_MACONNERIE', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-011', 'Sable concassé 0/4 (rendu chantier)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_02_GO_BETON', 'LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-040', 'Sable de mer lavé (rendu)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-041', 'Sable de rivière / oued (rendu)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_02_GO_BETON', 'LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-012', 'Gravier 5/15 – 8/15 (rendu)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-042', 'Gravette 3/8', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-043', 'Gravier 15/25 (rendu)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-019', 'Tout-venant 0/40 (rendu)', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_01_TERRASSEMENT', 'LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-018', 'Grave / remblai d''apport', 'GROS_OEUVRE', 'Granulats', 'm3', NULL, ARRAY['LOT_01_TERRASSEMENT']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-016', 'Pierre sèche (hérisson, moellons)', 'GROS_OEUVRE', 'Pierres', 'm3', NULL, ARRAY['LOT_02_GO_BETON', 'LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-005', 'Béton de propreté / BPE B15', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-044', 'Béton prêt à l''emploi B20 (C20/25)', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-004', 'Béton prêt à l''emploi B25 (C25/30)', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-045', 'Béton prêt à l''emploi B30 (C30/37)', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-046', 'Béton prêt à l''emploi B35 (C35/45)', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-047', 'Pompage du béton', 'GROS_OEUVRE', 'Bétons', 'm3', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-002', 'Agglo creux ciment 10×20×40', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-048', 'Agglo creux ciment 15×20×40', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-003', 'Agglo creux ciment 20×20×40', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-049', 'Agglo plein 20', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-050', 'Agglo creux ciment 25×20×40', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-006', 'Brique creuse 8 trous', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-051', 'Brique creuse 6 trous', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-052', 'Brique creuse 12 trous', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-053', 'Brique pleine', 'GROS_OEUVRE', 'Blocs & briques', 'u', NULL, ARRAY['LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-013', 'Hourdis béton 16', 'GROS_OEUVRE', 'Planchers', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-054', 'Hourdis béton 12', 'GROS_OEUVRE', 'Planchers', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-055', 'Hourdis béton 20', 'GROS_OEUVRE', 'Planchers', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-056', 'Hourdis béton 25', 'GROS_OEUVRE', 'Planchers', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-057', 'Hourdis terre cuite 16', 'GROS_OEUVRE', 'Planchers', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-017', 'Poutrelle béton précontrainte', 'GROS_OEUVRE', 'Planchers', 'ml', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-009', 'Coffrage (fourniture / location au m²)', 'GROS_OEUVRE', 'Coffrages', 'm2', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-058', 'Contreplaqué de coffrage CTBX 18 mm', 'GROS_OEUVRE', 'Coffrages', 'm2', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-059', 'Bois de coffrage (planches)', 'GROS_OEUVRE', 'Coffrages', 'm2', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-060', 'Étai métallique réglable', 'GROS_OEUVRE', 'Coffrages', 'u', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-061', 'Huile de décoffrage', 'GROS_OEUVRE', 'Coffrages', 'l', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-GO-010', 'Film polyane', 'GROS_OEUVRE', 'Films & accessoires', 'm2', NULL, ARRAY['LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-004', 'Membrane bitumineuse SBS 4 mm', 'ETANCHEITE', 'Membranes', 'm2', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-006', 'Membrane bitumineuse 3 mm', 'ETANCHEITE', 'Membranes', 'm2', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-007', 'Membrane autoprotégée ardoisée 4 mm', 'ETANCHEITE', 'Membranes', 'm2', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-005', 'Membrane synthétique (EPDM, PVC)', 'ETANCHEITE', 'Membranes', 'm2', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-008', 'Système d''étanchéité liquide (résine PU)', 'ETANCHEITE', 'Membranes', 'kg', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-009', 'Primaire d''accrochage bitumineux', 'ETANCHEITE', 'Primaires & enduits', 'l', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-010', 'Enduit hydrofuge de cuvelage', 'ETANCHEITE', 'Primaires & enduits', 'kg', NULL, ARRAY['LOT_04_ETANCHEITE', 'LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-014', 'Bitume oxydé', 'ETANCHEITE', 'Primaires & enduits', 'kg', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-011', 'Bande d''arase', 'ETANCHEITE', 'Accessoires', 'ml', NULL, ARRAY['LOT_04_ETANCHEITE', 'LOT_03_MACONNERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-012', 'Mastic d''étanchéité (cartouche)', 'ETANCHEITE', 'Accessoires', 'u', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-013', 'Relevé d''étanchéité', 'ETANCHEITE', 'Accessoires', 'ml', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-001', 'Drain agricole / géodrain', 'ETANCHEITE', 'Drainage', 'ml', NULL, ARRAY['LOT_04_ETANCHEITE', 'LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-002', 'Forme de pente (béton léger)', 'ETANCHEITE', 'Formes de pente', 'm3', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-ET-003', 'Isolant de toiture-terrasse', 'ETANCHEITE', 'Isolants', 'm2', NULL, ARRAY['LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-001', 'Polystyrène expansé PSE 40 mm', 'ISOLATION', 'Thermique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-002', 'Polystyrène extrudé XPS 40 mm', 'ISOLATION', 'Thermique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-003', 'Laine de verre 100 mm', 'ISOLATION', 'Thermique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-004', 'Laine de roche 100 mm', 'ISOLATION', 'Thermique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-005', 'Mousse polyuréthane projetée', 'ISOLATION', 'Thermique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-006', 'Panneau acoustique 50 mm', 'ISOLATION', 'Acoustique', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-007', 'Sous-couche acoustique de sol', 'ISOLATION', 'Acoustique', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-008', 'Pare-vapeur', 'ISOLATION', 'Accessoires', 'm2', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES', 'LOT_04_ETANCHEITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-IS-009', 'Adhésif d''étanchéité à l''air (rouleau)', 'ISOLATION', 'Accessoires', 'u', NULL, ARRAY['LOT_10_CLOISONS_DOUBLAGES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-001', 'Bordure béton T2', 'VRD', 'Éléments béton VRD', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-008', 'Bordure béton T3', 'VRD', 'Éléments béton VRD', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-002', 'Caniveau béton', 'VRD', 'Éléments béton VRD', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-003', 'Enrobé bitumineux à chaud', 'VRD', 'Enrobés', 't', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-009', 'Enrobé à froid', 'VRD', 'Enrobés', 't', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-004', 'Grave non traitée (GNT)', 'VRD', 'Granulats VRD', 'm3', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-005', 'Pavé autobloquant', 'VRD', 'Pavage', 'm2', NULL, ARRAY['LOT_26_VRD_VOIRIE', 'LOT_21_ESPACES_VERTS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-010', 'Dalle gazon', 'VRD', 'Pavage', 'm2', NULL, ARRAY['LOT_26_VRD_VOIRIE', 'LOT_21_ESPACES_VERTS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-006', 'Regard de visite béton', 'VRD', 'Regards & ouvrages', 'u', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-011', 'Tampon fonte de voirie', 'VRD', 'Regards & ouvrages', 'u', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-017', 'Regard de visite PVC', 'VRD', 'Regards & ouvrages', 'u', NULL, ARRAY['LOT_26_VRD_VOIRIE', 'LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-007', 'Tube PVC assainissement Ø200 SN4', 'VRD', 'Canalisations', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-012', 'Tube PVC assainissement Ø315', 'VRD', 'Canalisations', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-013', 'Tube PVC assainissement Ø160', 'VRD', 'Canalisations', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-014', 'Grillage simple torsion', 'VRD', 'Clôture & extérieur', 'ml', NULL, ARRAY['LOT_26_VRD_VOIRIE', 'LOT_21_ESPACES_VERTS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-015', 'Gabion (cage métallique)', 'VRD', 'Clôture & extérieur', 'u', NULL, ARRAY['LOT_26_VRD_VOIRIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-VRD-016', 'Géotextile', 'VRD', 'Clôture & extérieur', 'm2', NULL, ARRAY['LOT_26_VRD_VOIRIE', 'LOT_01_TERRASSEMENT']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-001', 'Appareillage électrique (générique)', 'ELECTRICITE', 'Appareillage', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-015', 'Prise 2P+T 16 A encastrée', 'ELECTRICITE', 'Appareillage', 'u', 'CIT-EL-001', ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-019', 'Interrupteur simple allumage', 'ELECTRICITE', 'Appareillage', 'u', 'CIT-EL-001', ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-020', 'Interrupteur va-et-vient', 'ELECTRICITE', 'Appareillage', 'u', 'CIT-EL-001', ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-021', 'Prise RJ45', 'ELECTRICITE', 'Courants faibles', 'u', NULL, ARRAY['LOT_20_VDI_COURANTS_FAIBLES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-003', 'Fil H07V-U 1,5 mm²', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-004', 'Fil H07V-U 2,5 mm²', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-022', 'Câble U1000 R2V 3G1,5', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-023', 'Câble U1000 R2V 3G2,5', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-007', 'Câble U1000 R2V 6 mm²', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-024', 'Câble VGV 2×1,5', 'ELECTRICITE', 'Câbles', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-005', 'Câble RJ45 cat. 6', 'ELECTRICITE', 'Courants faibles', 'ml', NULL, ARRAY['LOT_20_VDI_COURANTS_FAIBLES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-006', 'Câble de terre cuivre nu', 'ELECTRICITE', 'Mise à la terre', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-002', 'Barrette de coupure de terre', 'ELECTRICITE', 'Mise à la terre', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-014', 'Piquet de terre', 'ELECTRICITE', 'Mise à la terre', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-008', 'Coffret de brassage VDI', 'ELECTRICITE', 'Courants faibles', 'u', NULL, ARRAY['LOT_20_VDI_COURANTS_FAIBLES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-009', 'Tableau général basse tension (TGBT)', 'ELECTRICITE', 'Tableaux', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-025', 'Coffret de distribution modulaire (12–42 modules)', 'ELECTRICITE', 'Tableaux', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-010', 'Interrupteur différentiel 30 mA', 'ELECTRICITE', 'Protection', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-011', 'Disjoncteur modulaire 10–32 A', 'ELECTRICITE', 'Protection', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-026', 'Parafoudre', 'ELECTRICITE', 'Protection', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-012', 'Gaine ICTA Ø16–20', 'ELECTRICITE', 'Conduits', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-027', 'Goulotte 40×40', 'ELECTRICITE', 'Conduits', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-013', 'Panneau LED 60×60', 'ELECTRICITE', 'Luminaires', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-028', 'Réglette LED 1,2 m', 'ELECTRICITE', 'Luminaires', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-016', 'Projecteur LED', 'ELECTRICITE', 'Luminaires', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-017', 'Rail d''éclairage', 'ELECTRICITE', 'Luminaires', 'ml', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-018', 'Spot LED encastré', 'ELECTRICITE', 'Luminaires', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-EL-029', 'Ampoule LED E27', 'ELECTRICITE', 'Luminaires', 'u', NULL, ARRAY['LOT_15_ELECTRICITE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-008', 'Tube PPR PN20 Ø25', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-009', 'Tube PVC évacuation (Ø40–125)', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-011', 'Tube PVC évacuation Ø40', 'PLOMBERIE', 'Canalisations', 'ml', 'CIT-PL-009', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-012', 'Tube PVC évacuation Ø100', 'PLOMBERIE', 'Canalisations', 'ml', 'CIT-PL-009', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-013', 'Tube PVC évacuation Ø125', 'PLOMBERIE', 'Canalisations', 'ml', 'CIT-PL-009', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-014', 'Tube PER Ø12', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-015', 'Tube PER Ø16', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-016', 'Tube PER Ø20', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-017', 'Tube multicouche Ø16', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-018', 'Tube cuivre Ø14', 'PLOMBERIE', 'Canalisations', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-019', 'Raccord PVC Ø100 (coude, té)', 'PLOMBERIE', 'Canalisations', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-006', 'Robinetterie (générique)', 'PLOMBERIE', 'Robinetterie', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-020', 'Mitigeur lavabo', 'PLOMBERIE', 'Robinetterie', 'u', 'CIT-PL-006', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-021', 'Mitigeur de douche', 'PLOMBERIE', 'Robinetterie', 'u', 'CIT-PL-006', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-022', 'Mitigeur d''évier', 'PLOMBERIE', 'Robinetterie', 'u', 'CIT-PL-006', ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-023', 'Robinet d''arrêt', 'PLOMBERIE', 'Robinetterie', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-010', 'WC complet à poser', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-024', 'WC suspendu avec bâti-support', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-025', 'Lavabo céramique', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-026', 'Vasque à poser', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-027', 'Receveur de douche', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-028', 'Baignoire acrylique', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-004', 'Évier inox', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-005', 'Lave-mains', 'PLOMBERIE', 'Sanitaires', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-007', 'Siphon de sol inox', 'PLOMBERIE', 'Évacuation', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-029', 'Bonde de douche', 'PLOMBERIE', 'Évacuation', 'u', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-002', 'Caniveau de douche inox', 'PLOMBERIE', 'Évacuation', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-001', 'Calorifuge de tuyauterie', 'PLOMBERIE', 'Isolation', 'ml', NULL, ARRAY['LOT_14_PLOMBERIE_SANITAIRE', 'LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-003', 'Chauffe-eau électrique (générique)', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', NULL, ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-030', 'Chauffe-eau électrique 50 L', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', 'CIT-PL-003', ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-031', 'Chauffe-eau électrique 100 L', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', 'CIT-PL-003', ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-032', 'Chauffe-eau électrique 200 L', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', 'CIT-PL-003', ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-033', 'Chauffe-eau solaire 200 L', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', NULL, ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PL-034', 'Chauffe-bain à gaz 10 L', 'PLOMBERIE', 'Eau chaude sanitaire', 'u', NULL, ARRAY['LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-012', 'Climatiseur split 9 000 BTU', 'CVC', 'Production froid', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-013', 'Climatiseur split 12 000 BTU', 'CVC', 'Production froid', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-006', 'Climatiseur gainable inverter', 'CVC', 'Production froid', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-008', 'Groupe frigorifique (froid positif)', 'CVC', 'Production froid', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-004', 'Liaison frigorifique cuivre', 'CVC', 'Liaisons frigorifiques', 'ml', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-001', 'Isolant frigorifique (Armaflex)', 'CVC', 'Isolation frigorifique', 'ml', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-007', 'Gaine galvanisée', 'CVC', 'Gaines', 'ml', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-005', 'Diffuseur / grille aluminium', 'CVC', 'Diffusion d''air', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-002', 'Caisson de traitement d''air neuf', 'CVC', 'Traitement d''air', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-003', 'Caisson d''extraction', 'CVC', 'Ventilation', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-009', 'Panneau isotherme (chambre froide)', 'CVC', 'Chambre froide', 'm2', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-010', 'Porte isotherme', 'CVC', 'Chambre froide', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-011', 'Support antivibratile', 'CVC', 'Supports', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-014', 'Radiateur électrique', 'CVC', 'Chauffage', 'u', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-015', 'Plancher chauffant (kit)', 'CVC', 'Chauffage', 'm2', NULL, ARRAY['LOT_16_CLIMATISATION']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-CVC-016', 'Chaudière murale gaz', 'CVC', 'Chauffage', 'u', NULL, ARRAY['LOT_16_CLIMATISATION', 'LOT_17_PLOMBERIE_ECS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-009', 'Profilé acier (IPE, HEA, cornières)', 'STRUCTURE_METALLIQUE', 'Profilés acier', 'kg', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-011', 'Tube acier', 'STRUCTURE_METALLIQUE', 'Profilés acier', 'ml', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-001', 'Bac acier collaborant', 'STRUCTURE_METALLIQUE', 'Planchers collaborants', 'm2', NULL, ARRAY['LOT_09_METALLERIE', 'LOT_02_GO_BETON']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-002', 'Boulonnerie haute résistance', 'STRUCTURE_METALLIQUE', 'Boulonnerie', 'kg', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-003', 'Cheville chimique', 'STRUCTURE_METALLIQUE', 'Fixations', 'u', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-004', 'Garde-corps acier', 'STRUCTURE_METALLIQUE', 'Garde-corps', 'ml', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-007', 'Platine acier', 'STRUCTURE_METALLIQUE', 'Platines & assemblages', 'u', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-010', 'Tôle larmée (marches, paliers)', 'STRUCTURE_METALLIQUE', 'Tôlerie', 'm2', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-006', 'Panneau CTBH', 'STRUCTURE_METALLIQUE', 'Panneaux', 'm2', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-008', 'Primaire époxy (pot)', 'STRUCTURE_METALLIQUE', 'Protection & peinture', 'u', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-SM-005', 'Laque polyuréthane (pot)', 'STRUCTURE_METALLIQUE', 'Protection & peinture', 'u', NULL, ARRAY['LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-004', 'Profilé aluminium', 'MENUISERIE_ALU', 'Profilés alu', 'ml', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-008', 'Fenêtre aluminium coulissante (fournie)', 'MENUISERIE_ALU', 'Fenêtres', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-009', 'Fenêtre aluminium RPT double vitrage (fournie)', 'MENUISERIE_ALU', 'Fenêtres', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-010', 'Porte-fenêtre aluminium', 'MENUISERIE_ALU', 'Fenêtres', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-012', 'Châssis fixe aluminium', 'MENUISERIE_ALU', 'Fenêtres', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-011', 'Porte d''entrée aluminium', 'MENUISERIE_ALU', 'Portes', 'u', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-013', 'Fenêtre PVC', 'MENUISERIE_ALU', 'Fenêtres', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-014', 'Volet roulant PVC', 'MENUISERIE_ALU', 'Fermetures', 'u', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-005', 'Rideau métallique', 'MENUISERIE_ALU', 'Fermetures', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU', 'LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-001', 'Moteur de rideau / volet', 'MENUISERIE_ALU', 'Motorisation', 'u', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-006', 'Vitrage feuilleté 44.2', 'MENUISERIE_ALU', 'Vitrage', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-002', 'Ossature de façade aluminium', 'MENUISERIE_ALU', 'Ossatures façade', 'ml', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-003', 'Panneau composite aluminium (ACM)', 'MENUISERIE_ALU', 'Bardage', 'm2', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-AL-007', 'Garde-corps aluminium', 'MENUISERIE_ALU', 'Garde-corps', 'ml', NULL, ARRAY['LOT_07_MENUISERIE_EXT_ALU', 'LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-001', 'Bloc-porte intérieur bois', 'MENUISERIE_BOIS', 'Portes', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-011', 'Porte isoplane', 'MENUISERIE_BOIS', 'Portes', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-012', 'Porte blindée', 'MENUISERIE_BOIS', 'Portes', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-013', 'Plinthe bois / MDF', 'MENUISERIE_BOIS', 'Finitions', 'ml', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-014', 'Lambris bois', 'MENUISERIE_BOIS', 'Finitions', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-003', 'Panneau d''agencement', 'MENUISERIE_BOIS', 'Panneaux', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-004', 'Panneau mélaminé', 'MENUISERIE_BOIS', 'Panneaux', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-005', 'Panneau plaqué bois', 'MENUISERIE_BOIS', 'Panneaux', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-006', 'Plan de travail', 'MENUISERIE_BOIS', 'Plans de travail', 'ml', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-002', 'Plan composite époxy / marbre reconstitué', 'MENUISERIE_BOIS', 'Plans & composites', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-009', 'Tablette bois', 'MENUISERIE_BOIS', 'Tablettes', 'ml', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-010', 'Tasseau bois massif', 'MENUISERIE_BOIS', 'Bois massif', 'ml', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-007', 'Quincaillerie de menuiserie (ensemble)', 'MENUISERIE_BOIS', 'Quincaillerie', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MB-008', 'Quincaillerie de meuble', 'MENUISERIE_BOIS', 'Quincaillerie', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-007', 'Plâtre de construction', 'FAUX_PLAFOND', 'Plâtres', 'kg', NULL, ARRAY['LOT_19_STAFF_STUC', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-004', 'Plaque de plâtre BA13', 'FAUX_PLAFOND', 'Plaques', 'm2', NULL, ARRAY['LOT_18_FAUX_PLAFONDS', 'LOT_10_CLOISONS_DOUBLAGES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-005', 'Plaque de plâtre BA13 hydrofuge', 'FAUX_PLAFOND', 'Plaques', 'm2', NULL, ARRAY['LOT_18_FAUX_PLAFONDS', 'LOT_10_CLOISONS_DOUBLAGES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-002', 'Ossature métallique plaque de plâtre', 'FAUX_PLAFOND', 'Ossatures', 'ml', NULL, ARRAY['LOT_18_FAUX_PLAFONDS', 'LOT_10_CLOISONS_DOUBLAGES']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-003', 'Ossature T (dalles)', 'FAUX_PLAFOND', 'Ossatures', 'ml', NULL, ARRAY['LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-001', 'Dalle minérale 60×60', 'FAUX_PLAFOND', 'Dalles', 'm2', NULL, ARRAY['LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-006', 'Profilé de gorge lumineuse', 'FAUX_PLAFOND', 'Profilés lumineux', 'ml', NULL, ARRAY['LOT_18_FAUX_PLAFONDS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-FP-008', 'Corniche staff', 'FAUX_PLAFOND', 'Staff', 'ml', NULL, ARRAY['LOT_19_STAFF_STUC']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-019', 'Grès cérame 30×30 / 45×45', 'REVETEMENT', 'Carrelage', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-020', 'Grès cérame 60×60', 'REVETEMENT', 'Carrelage', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-004', 'Grès cérame grand format (60×120 et plus)', 'REVETEMENT', 'Carrelage', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-005', 'Grès cérame antidérapant R11', 'REVETEMENT', 'Carrelage', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-003', 'Faïence murale', 'REVETEMENT', 'Faïence', 'm2', NULL, ARRAY['LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-021', 'Plinthe carrelage', 'REVETEMENT', 'Plinthes', 'ml', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-013', 'Plinthe à gorge', 'REVETEMENT', 'Plinthes', 'ml', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-027', 'Granito 30×30', 'REVETEMENT', 'Carrelage', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-018', 'Parquet stratifié', 'REVETEMENT', 'Parquet', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-022', 'Parquet contrecollé', 'REVETEMENT', 'Parquet', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-023', 'Parquet massif', 'REVETEMENT', 'Parquet', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-024', 'Revêtement PVC en lés', 'REVETEMENT', 'Sols souples', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-025', 'Dalle PVC clipsable', 'REVETEMENT', 'Sols souples', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-026', 'Moquette', 'REVETEMENT', 'Sols souples', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-001', 'Colle à carrelage C2', 'REVETEMENT', 'Colles & joints', 'kg', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-007', 'Joint ciment CG2', 'REVETEMENT', 'Colles & joints', 'kg', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-008', 'Joint époxy', 'REVETEMENT', 'Colles & joints', 'kg', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-015', 'Ragréage autolissant', 'REVETEMENT', 'Préparation', 'kg', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-014', 'Primaire de sol (pot)', 'REVETEMENT', 'Préparation', 'u', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-016', 'Résine époxy murale', 'REVETEMENT', 'Résines', 'kg', NULL, ARRAY['LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-017', 'Résine époxy de sol', 'REVETEMENT', 'Résines', 'kg', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-009', 'Miroir argenté', 'REVETEMENT', 'Miroiterie', 'm2', NULL, ARRAY['LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-010', 'Panneau contreplaqué', 'REVETEMENT', 'Panneaux', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-011', 'Panneau MDF', 'REVETEMENT', 'Panneaux', 'm2', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-001', 'Marbre local (beige, Sahara, Tafraout…)', 'MARBRERIE', 'Marbre', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-002', 'Marbre importé (Carrare, Crema Marfil…)', 'MARBRERIE', 'Marbre', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-003', 'Marbre noir', 'MARBRERIE', 'Marbre', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-004', 'Granit', 'MARBRERIE', 'Granit', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-005', 'Travertin', 'MARBRERIE', 'Pierre', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-006', 'Pierre de taille', 'MARBRERIE', 'Pierre', 'm2', NULL, ARRAY['LOT_03_MACONNERIE', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-007', 'Zellige', 'MARBRERIE', 'Zellige', 'm2', NULL, ARRAY['LOT_12_REVETEMENTS_MURS', 'LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-008', 'Bejmat (terre cuite émaillée)', 'MARBRERIE', 'Zellige', 'm2', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-009', 'Plan de travail en marbre', 'MARBRERIE', 'Plans & escaliers', 'ml', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-MA-010', 'Marche d''escalier en marbre', 'MARBRERIE', 'Plans & escaliers', 'ml', NULL, ARRAY['LOT_11_REVETEMENTS_SOLS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-001', 'Peinture vinylique intérieure (économique)', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-002', 'Peinture vinylique / acrylique mate', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-012', 'Peinture satinée / velours lavable', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-003', 'Peinture acrylique haut de gamme', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-004', 'Peinture glycérophtalique', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-005', 'Peinture de façade', 'PEINTURE', 'Peintures', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-006', 'Peinture antirouille', 'PEINTURE', 'Peintures', 'l', NULL, ARRAY['LOT_13_PEINTURE', 'LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-007', 'Vernis bois', 'PEINTURE', 'Peintures', 'l', NULL, ARRAY['LOT_13_PEINTURE', 'LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-006', 'Impression / sous-couche (pot)', 'PEINTURE', 'Enduits & sous-couches', 'u', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-REV-002', 'Enduit de lissage', 'PEINTURE', 'Enduits & sous-couches', 'kg', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-008', 'Enduit décoratif / tadelakt', 'PEINTURE', 'Enduits & sous-couches', 'kg', NULL, ARRAY['LOT_13_PEINTURE', 'LOT_12_REVETEMENTS_MURS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-PE-009', 'Mastic de rebouchage', 'PEINTURE', 'Enduits & sous-couches', 'u', NULL, ARRAY['LOT_13_PEINTURE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-001', 'Visserie & chevilles (boîte)', 'QUINCAILLERIE', 'Visserie & fixation', 'u', NULL, ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_09_METALLERIE']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-002', 'Clous', 'QUINCAILLERIE', 'Visserie & fixation', 'kg', NULL, ARRAY['LOT_02_GO_BETON', 'LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-003', 'Serrure à encastrer', 'QUINCAILLERIE', 'Serrurerie', 'u', 'CIT-MB-007', ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-004', 'Cylindre de sécurité', 'QUINCAILLERIE', 'Serrurerie', 'u', 'CIT-MB-007', ARRAY['LOT_08_MENUISERIE_INT_BOIS', 'LOT_07_MENUISERIE_EXT_ALU']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-005', 'Paumelle / charnière', 'QUINCAILLERIE', 'Serrurerie', 'u', 'CIT-MB-007', ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-006', 'Verrou de sûreté', 'QUINCAILLERIE', 'Serrurerie', 'u', 'CIT-MB-007', ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1'),
  ('CIT-QU-007', 'Poignée de porte', 'QUINCAILLERIE', 'Serrurerie', 'u', 'CIT-MB-007', ARRAY['LOT_08_MENUISERIE_INT_BOIS']::text[], TRUE, 'catalogue 2026-10.1')
ON CONFLICT ("code") DO NOTHING;

-- ═════ docs/sql/carnet-materiaux-neon.sql ═════
-- Carnet des matériaux du projet (matériauthèque × gestion de projet) — idempotent.
-- Une ligne = un matériau proposé pour un dossier (par le client à partir de l'APD,
-- par l'architecte, ou depuis une page d'étape). Statuts :
--   PROPOSE → EN_ETUDE → VALIDE | REFUSE (motif obligatoire) | VARIANTE_PROPOSEE (varianteCode)
-- Seule l'équipe CITURBAREA / l'architecte maître d'œuvre (back-office /cc) statue.
-- Le « carnet » du projet = les lignes VALIDE : seule source pour le CPS, le DQE et le
-- planning d'achat. Aucune coordonnée (la note est masquée par functions/_lib/coordonnees.ts).
-- Contrat : docs/architecture/contrat-carnet-materiaux.md. Après devis-facturation-neon.sql (Dossier).

CREATE TABLE IF NOT EXISTS "DossierMateriau" (
  "id"            TEXT PRIMARY KEY,
  "dossierId"     TEXT NOT NULL,
  "etapeCode"     TEXT,                              -- code d'étape (phases.catalog / LOT_*) si ajouté depuis une page d'étape
  "source"        TEXT NOT NULL DEFAULT 'referentiel', -- referentiel | produit
  "refId"         TEXT NOT NULL,                     -- code CIT ou id de la variante fournisseur
  "code"          TEXT NOT NULL,                     -- code CIT (toujours renseigné : CPS, DQE)
  "nom"           TEXT NOT NULL,
  "categorie"     TEXT,
  "lot"           TEXT,                              -- lot du chiffrage (STR, RSO…)
  "emplacement"   TEXT,                              -- ex. « revêtement sol séjour »
  "unite"         TEXT,
  "quantite"      DOUBLE PRECISION,
  "prixIndicatif" DOUBLE PRECISION,                  -- DH HT par unité de référence au moment de la proposition
  "note"          TEXT,
  "origine"       TEXT NOT NULL DEFAULT 'CLIENT',    -- CLIENT | ARCHITECTE | ETAPE
  "proposePar"    TEXT NOT NULL DEFAULT 'CLIENT',    -- CLIENT | ARCHITECTE
  "auteur"        TEXT,                              -- id client ou e-mail admin (jamais affiché au client)
  "statut"        TEXT NOT NULL DEFAULT 'PROPOSE',
  "motif"         TEXT,
  "varianteCode"  TEXT,
  "decidePar"     TEXT,
  "decideLe"      TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DossierMateriau_dossier_idx" ON "DossierMateriau" ("dossierId", "createdAt");
CREATE INDEX IF NOT EXISTS "DossierMateriau_statut_idx" ON "DossierMateriau" ("statut");
DO $$ BEGIN
  ALTER TABLE "DossierMateriau" ADD CONSTRAINT "DossierMateriau_dossier_fk" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierMateriau" ADD CONSTRAINT "DossierMateriau_statut_chk" CHECK ("statut" IN ('PROPOSE', 'EN_ETUDE', 'VALIDE', 'REFUSE', 'VARIANTE_PROPOSEE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
