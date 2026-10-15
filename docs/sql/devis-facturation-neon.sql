-- Devis & Facturation — étape « création de dossier par l'admin »
-- (spec docs/specs/CITURBAREA_SPEC_Devis_Facturation_v1.md ; mapping : docs/architecture/contrat-devis-facturation.md).
-- Rejouable : n'efface ni ne modifie aucune donnée. Après dossiers-neon.sql (User, Dossier).
-- Les tables Devis / Facture / Encaissement viendront dans ce même fichier à l'étape suivante.

-- 1. Cabinets d'architecture (ARC-BATI et autres) : architecte du projet et répartition interne des honoraires.
--    L'ÉMETTEUR des devis et factures est CITURBAREA / HSE DECO (décision du 15/10/2026), jamais le cabinet ;
--    téléphone, e-mail et adresse d'un cabinet ne figurent sur aucun document ni écran public.
CREATE TABLE IF NOT EXISTS "Cabinet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "architecte" TEXT,
    "titre" TEXT,
    "numeroOrdre" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "rc" TEXT,
    "patente" TEXT,
    "logoUrl" TEXT,
    "charte" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "grilleId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Cabinet" ("id", "nom", "architecte", "titre", "ville", "grilleId", "charte")
VALUES ('cab_arc_bati', 'ARC-BATI ARCHITECTURE', 'Yassine ATTARASSI', 'Architecte DENA, Ordre des Architectes du Maroc', 'Kénitra',
        'arc-bati-2026-10', '{"police":"Calibri","bleuNuit":"#1F3864","fondClair":"#EEF1F7"}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- 2. Dossier = « Projet » de la spec (§1.3) ; le client (§1.2) = User CLIENT + colonnes client* du dossier.
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "cabinetId" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "origine" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "creePar" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientCivilite" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientPrenom" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientVille" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "clientIdentifiantFiscal" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "typologie" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "gabarit" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "lot" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "lotissement" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "prefecture" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "titreFoncier" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationNum" TEXT;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationDate" DATE;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "autorisationExpiration" DATE;
ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "etatChantier" TEXT;
CREATE INDEX IF NOT EXISTS "Dossier_cabinetId_idx" ON "Dossier"("cabinetId");
CREATE INDEX IF NOT EXISTS "Dossier_autorisationExpiration_idx" ON "Dossier"("autorisationExpiration");

-- 3. Étapes du dossier (codes de packages/contracts/src/phases.catalog.ts) : phases antérieures
--    « faites hors plateforme », phase en cours. Lu par la fiche dossier admin (lot 3c) et l'espace client.
CREATE TABLE IF NOT EXISTS "DossierEtape" (
    "dossierId" TEXT NOT NULL,
    "phaseCode" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "dateRealisation" DATE,
    "note" TEXT,
    "documentIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "saisiPar" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierEtape_pkey" PRIMARY KEY ("dossierId", "phaseCode")
);

-- 4. Journal des actions admin sur un dossier (append-only).
CREATE TABLE IF NOT EXISTS "DossierEvenement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierEvenement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DossierEvenement_dossierId_idx" ON "DossierEvenement"("dossierId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DossierEtape" ADD CONSTRAINT "DossierEtape_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierEvenement" ADD CONSTRAINT "DossierEvenement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Numérotation légale DEV / FAC / AVO (spec §6.1) : un compteur par type et par année,
--    incrémenté dans la MÊME instruction que l'émission du document (pas de numéro au brouillon).
CREATE TABLE IF NOT EXISTS "SequenceDocument" (
    "type" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SequenceDocument_pkey" PRIMARY KEY ("type", "annee")
);

-- 6. Devis (spec §1.7, §6.2). `entree` = saisie de l'éditeur ; à l'émission le serveur recalcule,
--    fige `document` (modèle rendu en PDF et DOCX), `hashContenu` (SHA-256) et les montants.
--    Une modification après émission crée une RÉVISION (DEV-2026-0043-R2), jamais une écriture en place.
CREATE TABLE IF NOT EXISTS "Devis" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" TEXT,
    "numeroBase" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "devisOrigineId" TEXT,
    "remplacePar" TEXT,
    "type" TEXT NOT NULL,
    "presentation" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "grilleVersionId" TEXT NOT NULL,
    "dateEmission" DATE,
    "validiteJours" INTEGER NOT NULL DEFAULT 30,
    "coutPrevisionnelTravaux" NUMERIC(14,2),
    "tauxHonoraires" NUMERIC(6,3),
    "assietteHonoraires" NUMERIC(14,2),
    "montantTotal" NUMERIC(14,2),
    "modalitesPaiement" TEXT,
    "entree" JSONB NOT NULL,
    "document" JSONB,
    "hashContenu" TEXT,
    "packChoisi" TEXT,
    "dateAcceptation" TIMESTAMP(3),
    "preuveAcceptation" JSONB,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Devis_numero_key" ON "Devis"("numero");
CREATE INDEX IF NOT EXISTS "Devis_dossierId_idx" ON "Devis"("dossierId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "Devis" ADD CONSTRAINT "Devis_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
