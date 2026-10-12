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
