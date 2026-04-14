CREATE TABLE IF NOT EXISTS "PhaseChat" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId" TEXT NOT NULL,
  "phaseRef" TEXT NOT NULL,
  "sousPhaseId" TEXT,
  "expediteurId" TEXT NOT NULL,
  "expediteurRole" TEXT NOT NULL,
  "expediteurNom" TEXT,
  "contenu" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'TEXT',
  "filePath" TEXT,
  "fileName" TEXT,
  "lu" BOOLEAN NOT NULL DEFAULT false,
  "luAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_dossier FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_dossier ON "PhaseChat"("dossierId");
CREATE INDEX IF NOT EXISTS idx_chat_phase ON "PhaseChat"("phaseRef");

CREATE TABLE IF NOT EXISTS "PhaseReunion" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId" TEXT NOT NULL,
  "phaseRef" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PRESENTIEL',
  "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
  "dateDebut" TIMESTAMPTZ NOT NULL,
  "dateFin" TIMESTAMPTZ,
  "dureeMinutes" INTEGER,
  "lieu" TEXT,
  "lienVisio" TEXT,
  "organisateurId" TEXT,
  "participants" TEXT[] NOT NULL DEFAULT '{}',
  "noteOrdreJour" TEXT,
  "noteCompteRendu" TEXT,
  "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_reu_dossier FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reu_dossier ON "PhaseReunion"("dossierId");
CREATE INDEX IF NOT EXISTS idx_reu_phase ON "PhaseReunion"("phaseRef");

CREATE TABLE IF NOT EXISTS "Devis" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId" TEXT NOT NULL,
  "phaseRef" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
  "montantHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tva" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "montantTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "devise" TEXT NOT NULL DEFAULT 'MAD',
  "lignes" JSONB NOT NULL DEFAULT '[]',
  "conditions" TEXT,
  "validiteJours" INTEGER NOT NULL DEFAULT 30,
  "dateEmission" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dateValidite" TIMESTAMPTZ,
  "dateAcceptation" TIMESTAMPTZ,
  "dateRefus" TIMESTAMPTZ,
  "noteRefus" TEXT,
  "emetteurId" TEXT NOT NULL,
  "filePath" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_dev_dossier FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dev_dossier ON "Devis"("dossierId");
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dev_num ON "Devis"("numero");

CREATE TABLE IF NOT EXISTS "Facture" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId" TEXT NOT NULL,
  "phaseRef" TEXT NOT NULL,
  "devisId" TEXT,
  "numero" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "statut" TEXT NOT NULL DEFAULT 'EMISE',
  "montantHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tva" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "montantTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "devise" TEXT NOT NULL DEFAULT 'MAD',
  "lignes" JSONB NOT NULL DEFAULT '[]',
  "dateEmission" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dateEcheance" TIMESTAMPTZ,
  "datePaiement" TIMESTAMPTZ,
  "modePaiement" TEXT,
  "reference" TEXT,
  "emetteurId" TEXT NOT NULL,
  "filePath" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fac_dossier FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fac_dossier ON "Facture"("dossierId");
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fac_num ON "Facture"("numero");

CREATE TABLE IF NOT EXISTS "PhaseHistorique" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId" TEXT NOT NULL,
  "phaseRef" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "acteurId" TEXT,
  "acteurRole" TEXT,
  "acteurNom" TEXT,
  "details" JSONB,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_hist_dossier FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hist_dossier ON "PhaseHistorique"("dossierId");
CREATE INDEX IF NOT EXISTS idx_hist_phase ON "PhaseHistorique"("phaseRef");

SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
AND table_name IN ('PhaseChat','PhaseReunion','Devis','Facture','PhaseHistorique')
ORDER BY table_name;
