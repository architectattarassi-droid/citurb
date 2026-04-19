-- Sprint S10 — Disclaimer acceptance persisted to DB
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "disclaimerAcceptedAt" TIMESTAMP(3);
