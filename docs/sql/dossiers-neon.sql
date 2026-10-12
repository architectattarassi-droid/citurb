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
