-- Sprint S-ROKHAS: 3 tables suivi permis de construire
CREATE TABLE IF NOT EXISTS "RokhasDossier" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "dossierId"          TEXT NOT NULL UNIQUE,
  "refRokhas"          TEXT NOT NULL DEFAULT '',
  "numDossier"         TEXT NOT NULL DEFAULT '',
  "refFoncieres"       TEXT[] NOT NULL DEFAULT '{}',
  "typePermis"         TEXT NOT NULL DEFAULT 'construire',
  "consistance"        TEXT NOT NULL DEFAULT '',
  "naturProjet"        TEXT NOT NULL DEFAULT '',
  "typeProjet"         TEXT NOT NULL DEFAULT '',
  "niveaux"            TEXT NOT NULL DEFAULT '',
  "surfaceTerrain"     DOUBLE PRECISION,
  "surfaceBatie"       DOUBLE PRECISION,
  "surfacePlancher"    DOUBLE PRECISION,
  "cus"                DOUBLE PRECISION,
  "cos"                DOUBLE PRECISION,
  "adresse"            TEXT,
  "prefecture"         TEXT,
  "commune"            TEXT,
  "guichetDepot"       TEXT,
  "phaseActuelle"      INTEGER NOT NULL DEFAULT 1,
  "statut"             TEXT NOT NULL DEFAULT 'BROUILLON',
  "decisionCommission" TEXT,
  "dateDepot"          TIMESTAMP(3),
  "dateLivraison"      TIMESTAMP(3),
  "delaiGlobalJours"   INTEGER,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RokhasPhaseHistory" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "rokhasDossierId" TEXT NOT NULL,
  "phase"           INTEGER NOT NULL,
  "phaseLabel"      TEXT NOT NULL,
  "dateEntree"      TIMESTAMP(3),
  "dateSortie"      TIMESTAMP(3),
  "delaiJours"      INTEGER,
  "statut"          TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "remarques"       TEXT,
  "responsable"     TEXT,
  "declenchePar"    TEXT NOT NULL DEFAULT 'systeme',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RokhasDocument" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "rokhasDossierId"   TEXT NOT NULL,
  "phase"             INTEGER NOT NULL,
  "nom"               TEXT NOT NULL,
  "type"              TEXT NOT NULL DEFAULT 'AUTRE',
  "origine"           TEXT NOT NULL DEFAULT 'ARCHITECTE',
  "urlRokhas"         TEXT,
  "urlCiturbarea"     TEXT,
  "statut"            TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "visibleClient"     BOOLEAN NOT NULL DEFAULT false,
  "dateRecuperation"  TIMESTAMP(3),
  "dateValidation"    TIMESTAMP(3),
  "dateEnvoiClient"   TIMESTAMP(3),
  "validePar"         TEXT,
  "uploadePar"        TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "RokhasPhaseHistory_rokhasDossierId_idx"
  ON "RokhasPhaseHistory"("rokhasDossierId");
CREATE INDEX IF NOT EXISTS "RokhasDocument_rokhasDossierId_idx"
  ON "RokhasDocument"("rokhasDossierId");
