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
