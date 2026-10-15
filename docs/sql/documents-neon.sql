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
