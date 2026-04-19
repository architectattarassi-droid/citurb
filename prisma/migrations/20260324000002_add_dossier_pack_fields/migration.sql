-- Sprint S2: add pack selection fields to Dossier
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "packSelected"       TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "packPriceMAD"       DOUBLE PRECISION;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "projectType"        TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "constructionLevel"  TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "caseId"             TEXT;
