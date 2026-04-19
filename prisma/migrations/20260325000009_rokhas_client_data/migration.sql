-- Sprint S-ROKHAS-CLIENT — Données client + flag sync
ALTER TABLE "RokhasDossier"
  ADD COLUMN IF NOT EXISTS "clientData" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "pendingRokhasSync" BOOLEAN DEFAULT false;
