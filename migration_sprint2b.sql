-- Nouvelles colonnes DossierSousPhase (sprint 2)
ALTER TABLE "DossierSousPhase"
  ALTER COLUMN "phaseRecordId" DROP NOT NULL,
  ALTER COLUMN "label" SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS "phaseRef"    TEXT,
  ADD COLUMN IF NOT EXISTS "titre"       TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "dateFin"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "remarques"   TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Nouvelles colonnes Dossier (relations Sprint 2 ne nécessitent pas de colonnes — OK)
-- Vérification
SELECT column_name FROM information_schema.columns
WHERE table_name = 'DossierSousPhase'
  AND column_name IN ('phaseRef','titre','createdById','dateFin','remarques','updatedAt')
ORDER BY column_name;
