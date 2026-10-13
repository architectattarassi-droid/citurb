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
