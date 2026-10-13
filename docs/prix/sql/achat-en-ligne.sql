-- Achat en ligne de matériaux (PHASE 2) — NE PAS EXÉCUTER avant le lancement.
-- Modèle : apps/web/src/domain/materiaux/achat.ts ; architecture : docs/achat-en-ligne.md.
-- Prérequis : tables Cercles (docs/prix/sql/cercles-fournisseurs.sql).

CREATE TABLE IF NOT EXISTS "Commande" (
  "id"                TEXT PRIMARY KEY,
  "reference"         TEXT NOT NULL UNIQUE,              -- CMD-2027-000123
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statut"            TEXT NOT NULL DEFAULT 'BROUILLON', -- BROUILLON | DEVIS_CONFIRME | PAIEMENT_EN_COURS | PAYEE | EN_PREPARATION | EXPEDIEE | LIVREE | CLOTUREE | LITIGE | ANNULEE | REMBOURSEE
  "leadId"            TEXT,                              -- "Lead"."id" (demande de prix d'origine)
  "demandePrixId"     TEXT REFERENCES "DemandePrix"("id") ON DELETE SET NULL,
  "fournisseurId"     TEXT NOT NULL REFERENCES "Fournisseur"("id"),
  "clientNom"         TEXT NOT NULL,
  "clientTelephone"   TEXT NOT NULL,
  "clientEmail"       TEXT,
  "villeLivraison"    TEXT NOT NULL,
  "adresseLivraison"  TEXT NOT NULL,
  "creneauLivraison"  TEXT,
  "fraisLivraisonHT"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalHT"           DOUBLE PRECISION NOT NULL,
  "totalTVA"          DOUBLE PRECISION NOT NULL,
  "totalTTC"          DOUBLE PRECISION NOT NULL,
  "commissionPct"     DOUBLE PRECISION NOT NULL,         -- figé à la commande (ParametrePlateforme / Fournisseur."commissionPct")
  "commissionHT"      DOUBLE PRECISION NOT NULL,
  "paiement"          JSONB NOT NULL DEFAULT '{}'::jsonb, -- { prestataire, transactionId, payeLe } — jamais de numéro de carte
  "livraison"         JSONB NOT NULL DEFAULT '{}'::jsonb, -- { transporteur, suivi, livreLe, preuve }
  "evenements"        JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ at, statut, auteur, note }]
  "idempotencyKey"    TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS "Commande_fournisseur_idx" ON "Commande" ("fournisseurId", "createdAt");
CREATE INDEX IF NOT EXISTS "Commande_statut_idx" ON "Commande" ("statut");

CREATE TABLE IF NOT EXISTS "LigneCommande" (
  "id"              TEXT PRIMARY KEY,
  "commandeId"      TEXT NOT NULL REFERENCES "Commande"("id") ON DELETE CASCADE,
  "materiauCode"    TEXT NOT NULL,                       -- code CIT
  "libelle"         TEXT NOT NULL,
  "uniteVente"      TEXT NOT NULL,
  "quantite"        DOUBLE PRECISION NOT NULL,
  "prixUnitaireHT"  DOUBLE PRECISION NOT NULL,           -- confirmé par le fournisseur
  "tvaPct"          DOUBLE PRECISION NOT NULL DEFAULT 20,
  "totalHT"         DOUBLE PRECISION NOT NULL,
  "totalTTC"        DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS "LigneCommande_commande_idx" ON "LigneCommande" ("commandeId");
