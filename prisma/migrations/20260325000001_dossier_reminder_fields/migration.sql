-- Sprint S-NOTIF1: champs rappel automatique sur Dossier
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;
