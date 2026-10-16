-- Carnet des matériaux du projet (matériauthèque × gestion de projet) — idempotent.
-- Une ligne = un matériau proposé pour un dossier (par le client à partir de l'APD,
-- par l'architecte, ou depuis une page d'étape). Statuts :
--   PROPOSE → EN_ETUDE → VALIDE | REFUSE (motif obligatoire) | VARIANTE_PROPOSEE (varianteCode)
-- Seule l'équipe CITURBAREA / l'architecte maître d'œuvre (back-office /cc) statue.
-- Le « carnet » du projet = les lignes VALIDE : seule source pour le CPS, le DQE et le
-- planning d'achat. Aucune coordonnée (la note est masquée par functions/_lib/coordonnees.ts).
-- Contrat : docs/architecture/contrat-carnet-materiaux.md. Après devis-facturation-neon.sql (Dossier).

CREATE TABLE IF NOT EXISTS "DossierMateriau" (
  "id"            TEXT PRIMARY KEY,
  "dossierId"     TEXT NOT NULL,
  "etapeCode"     TEXT,                              -- code d'étape (phases.catalog / LOT_*) si ajouté depuis une page d'étape
  "source"        TEXT NOT NULL DEFAULT 'referentiel', -- referentiel | produit
  "refId"         TEXT NOT NULL,                     -- code CIT ou id de la variante fournisseur
  "code"          TEXT NOT NULL,                     -- code CIT (toujours renseigné : CPS, DQE)
  "nom"           TEXT NOT NULL,
  "categorie"     TEXT,
  "lot"           TEXT,                              -- lot du chiffrage (STR, RSO…)
  "emplacement"   TEXT,                              -- ex. « revêtement sol séjour »
  "unite"         TEXT,
  "quantite"      DOUBLE PRECISION,
  "prixIndicatif" DOUBLE PRECISION,                  -- DH HT par unité de référence au moment de la proposition
  "note"          TEXT,
  "origine"       TEXT NOT NULL DEFAULT 'CLIENT',    -- CLIENT | ARCHITECTE | ETAPE
  "proposePar"    TEXT NOT NULL DEFAULT 'CLIENT',    -- CLIENT | ARCHITECTE
  "auteur"        TEXT,                              -- id client ou e-mail admin (jamais affiché au client)
  "statut"        TEXT NOT NULL DEFAULT 'PROPOSE',
  "motif"         TEXT,
  "varianteCode"  TEXT,
  "decidePar"     TEXT,
  "decideLe"      TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DossierMateriau_dossier_idx" ON "DossierMateriau" ("dossierId", "createdAt");
CREATE INDEX IF NOT EXISTS "DossierMateriau_statut_idx" ON "DossierMateriau" ("statut");
DO $$ BEGIN
  ALTER TABLE "DossierMateriau" ADD CONSTRAINT "DossierMateriau_dossier_fk" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DossierMateriau" ADD CONSTRAINT "DossierMateriau_statut_chk" CHECK ("statut" IN ('PROPOSE', 'EN_ETUDE', 'VALIDE', 'REFUSE', 'VARIANTE_PROPOSEE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
