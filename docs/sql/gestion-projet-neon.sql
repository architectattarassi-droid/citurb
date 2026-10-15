-- Gestion de projet (lots GP2 à GP4) — docs/gestion-projet/audit-et-ameliorations.md.
-- Rejouable : n'efface ni ne modifie aucune donnée. Après dossiers-neon.sql (Dossier),
-- espace-projet-neon.sql (ProjetJalon) et devis-facturation-neon.sql (DossierEvenement).
-- Tant que ce fichier n'est pas collé, les écrans affichent les pièces « Document manquant »
-- en lecture seule et refusent le dépôt avec un message clair (aucune erreur 500).

-- 1. Dépôt de documents commun (contrat docs/architecture/contrat-depot-fichiers.md) :
--    PDF et images, octets dans Neon (bytea) en attendant R2 ; nom de fichier sans coordonnées.
CREATE TABLE IF NOT EXISTS "DocumentDepose" (
    "id" TEXT NOT NULL,
    -- dossier | appel | messagerie | cercles | projet …
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- admin:<email> | client:<userId> | membre:<membreId> | fournisseur:<id>
    "proprietaire" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "octets" BYTEA,
    "cleR2" TEXT,
    "empreinte" TEXT NOT NULL,
    -- PRIVE | PENDING | APPROVED | REJECTED
    "statut" TEXT NOT NULL DEFAULT 'PRIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentDepose_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DocumentDepose_contexte_objet_idx" ON "DocumentDepose"("contexte", "objetId");

-- 2. Pièces attendues d'un dossier, phase par phase (exigence A du fondateur).
--    Une pièce sans ligne est « MANQUANT » : la liste attendue vient du référentiel
--    (packages/contracts/src/gestion/pieces.ts), seules les pièces traitées sont écrites ici.
CREATE TABLE IF NOT EXISTS "DossierPiece" (
    "dossierId" TEXT NOT NULL,
    -- « <phase P..>:<code du document> », ex. P04_AUTORISATION:VISA_ORDRE_REGIONAL
    "cle" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    -- motif d'un refus ou d'un « sans objet »
    "motif" TEXT,
    -- identifiants "DocumentDepose"
    "documentIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "deposePar" TEXT,
    "deposeLe" TIMESTAMP(3),
    "validePar" TEXT,
    "valideLe" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DossierPiece_pkey" PRIMARY KEY ("dossierId", "cle")
);
DO $$ BEGIN
  ALTER TABLE "DossierPiece" ADD CONSTRAINT "DossierPiece_statut_check" CHECK ("statut" IN ('DEPOSE', 'VALIDE', 'REFUSE', 'SANS_OBJET'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierPiece" ADD CONSTRAINT "DossierPiece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
