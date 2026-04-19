-- Sprint S4: Dossier ↔ Project bridge
ALTER TABLE "Dossier"  ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Project"  ADD COLUMN IF NOT EXISTS "dossierId" TEXT;
ALTER TABLE "Project"  ADD COLUMN IF NOT EXISTS "ownerId"   TEXT;
-- Make geoId nullable so P1 dossiers can promote without a GeoUnit yet
ALTER TABLE "Project"  ALTER COLUMN "geoId" DROP NOT NULL;
-- Unique constraint on dossierId (one project per dossier)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='Project' AND indexname='Project_dossierId_key'
  ) THEN
    CREATE UNIQUE INDEX "Project_dossierId_key" ON "Project"("dossierId");
  END IF;
END $$;
