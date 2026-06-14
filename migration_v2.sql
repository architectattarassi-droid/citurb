-- ═══════════════════════════════════════════════════════════
-- MIGRATION V2 — SCHÉMA CITURBAREA COMPLET
-- CITURBAREA — 27/03/2026
-- ═══════════════════════════════════════════════════════════

-- ── TABLE Dossier — nouveaux champs ─────────────────────────

ALTER TABLE "Dossier"
ADD COLUMN IF NOT EXISTS "porteType"       TEXT NOT NULL DEFAULT 'P1',
ADD COLUMN IF NOT EXISTS "gestionMode"     TEXT NOT NULL DEFAULT 'AUTONOME',
ADD COLUMN IF NOT EXISTS "phase"           TEXT NOT NULL DEFAULT 'PHASE_01_ESQUISSE',
ADD COLUMN IF NOT EXISTS "refInterne"      TEXT,
ADD COLUMN IF NOT EXISTS "mandatSigne"     BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "mandatSigneAt"   TIMESTAMP,
ADD COLUMN IF NOT EXISTS "archivedAt"      TIMESTAMP,
ADD COLUMN IF NOT EXISTS "clientNom"       TEXT,
ADD COLUMN IF NOT EXISTS "clientCin"       TEXT,
ADD COLUMN IF NOT EXISTS "clientTel"       TEXT,
ADD COLUMN IF NOT EXISTS "clientEmail"     TEXT,
ADD COLUMN IF NOT EXISTS "clientAdresse"   TEXT,
ADD COLUMN IF NOT EXISTS "raisonSociale"   TEXT,
ADD COLUMN IF NOT EXISTS "rc"              TEXT,
ADD COLUMN IF NOT EXISTS "ice"             TEXT,
ADD COLUMN IF NOT EXISTS "representant"    TEXT,
ADD COLUMN IF NOT EXISTS "sousTypeP2"      TEXT,
ADD COLUMN IF NOT EXISTS "lambertX"        FLOAT,
ADD COLUMN IF NOT EXISTS "lambertY"        FLOAT,
ADD COLUMN IF NOT EXISTS "lambertSystem"   TEXT DEFAULT 'Lambert_Maroc_Nord',
ADD COLUMN IF NOT EXISTS "wgs84Lat"        FLOAT,
ADD COLUMN IF NOT EXISTS "wgs84Lng"        FLOAT,
ADD COLUMN IF NOT EXISTS "surfaceTerrain"  FLOAT,
ADD COLUMN IF NOT EXISTS "surfacePlancher" FLOAT,
ADD COLUMN IF NOT EXISTS "nbNiveaux"       INT,
ADD COLUMN IF NOT EXISTS "nbLogements"     INT,
ADD COLUMN IF NOT EXISTS "natureProjet"    TEXT,
ADD COLUMN IF NOT EXISTS "usageBien"       TEXT,
ADD COLUMN IF NOT EXISTS "budgetEstime"    FLOAT,
ADD COLUMN IF NOT EXISTS "adresseTerrain"  TEXT,
ADD COLUMN IF NOT EXISTS "arrondissement"  TEXT;

-- Générer références internes pour tous les dossiers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "Dossier"
  WHERE "refInterne" IS NULL
)
UPDATE "Dossier"
SET "refInterne" = 'CIT-2026-' || LPAD(numbered.rn::text, 5, '0')
FROM numbered
WHERE "Dossier".id = numbered.id;

-- Mettre à jour gestionMode selon porteType
UPDATE "Dossier" SET "gestionMode" = 'DELEGUE'    WHERE "porteType" = 'P3';
UPDATE "Dossier" SET "gestionMode" = 'ACCOMPAGNE'  WHERE "porteType" = 'P2';

-- ── TABLE RokhasDossier — champs miroir complets ─────────────

ALTER TABLE "RokhasDossier"
ADD COLUMN IF NOT EXISTS "typePermis"        TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "dateDemande"       TIMESTAMP,
ADD COLUMN IF NOT EXISTS "numArrete"         TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "dateArrete"        TIMESTAMP,
ADD COLUMN IF NOT EXISTS "clientIce"         TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "clientAdresse"     TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "douar"             TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "cercle"            TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "province"          TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "adresseBien"       TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "nbNiveaux"         INT,
ADD COLUMN IF NOT EXISTS "avecSousSol"       BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "nbSousSols"        INT,
ADD COLUMN IF NOT EXISTS "hauteurBatiment"   FLOAT,
ADD COLUMN IF NOT EXISTS "architecteNom"     TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "architecteOrdre"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "architecteTel"     TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "betStructureNom"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "betStructureAgr"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "betTechniquesNom"  TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "betTechniquesAgr"  TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "topographeNom"     TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "topographeOrdre"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "entrepreneurNom"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "entrepreneurIce"   TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "lastSyncAt"        TIMESTAMP,
ADD COLUMN IF NOT EXISTS "syncStatus"        TEXT DEFAULT 'PENDING';

-- ── TABLE RokhasPhaseHistory — champs complets ───────────────

ALTER TABLE "RokhasPhaseHistory"
ADD COLUMN IF NOT EXISTS "phaseNum"          INT,
ADD COLUMN IF NOT EXISTS "phaseLabel"        TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS "dateSaisie"        TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dateTraitement"    TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dateDecision"      TIMESTAMP,
ADD COLUMN IF NOT EXISTS "serviceTraitant"   TEXT,
ADD COLUMN IF NOT EXISTS "agentNom"          TEXT,
ADD COLUMN IF NOT EXISTS "motifRejet"        TEXT,
ADD COLUMN IF NOT EXISTS "pv"               TEXT;

-- ── TABLE RokhasDocument — champs complets ───────────────────

ALTER TABLE "RokhasDocument"
ADD COLUMN IF NOT EXISTS "code"              TEXT,
ADD COLUMN IF NOT EXISTS "categorie"         TEXT DEFAULT 'PIECE_DEPOSEE',
ADD COLUMN IF NOT EXISTS "phaseNum"          INT,
ADD COLUMN IF NOT EXISTS "dateDepot"         TIMESTAMP,
ADD COLUMN IF NOT EXISTS "dateValidation"    TIMESTAMP,
ADD COLUMN IF NOT EXISTS "motifRejet"        TEXT,
ADD COLUMN IF NOT EXISTS "filePath"          TEXT,
ADD COLUMN IF NOT EXISTS "fileSize"          INT,
ADD COLUMN IF NOT EXISTS "mimeType"          TEXT,
ADD COLUMN IF NOT EXISTS "source"            TEXT DEFAULT 'CLIENT',
ADD COLUMN IF NOT EXISTS "visibleClient"     BOOLEAN DEFAULT false;

-- ── NOUVELLE TABLE : DossierPhaseRecord ─────────────────────

CREATE TABLE IF NOT EXISTS "DossierPhaseRecord" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "phase"            TEXT NOT NULL,
  "statut"           TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "dateDebut"        TIMESTAMP,
  "dateFin"          TIMESTAMP,
  "acteurId"         TEXT,
  "note"             TEXT,
  "rokhasRef"        TEXT,
  "niveauRef"        TEXT,
  "lotsGO"           JSONB,
  "lotsSecondaires"  JSONB,
  "createdAt"        TIMESTAMP DEFAULT NOW(),
  "updatedAt"        TIMESTAMP DEFAULT NOW(),
  UNIQUE("dossierId", "phase")
);

-- ── NOUVELLE TABLE : DossierSousPhase ───────────────────────

CREATE TABLE IF NOT EXISTS "DossierSousPhase" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "phaseRecordId"    TEXT NOT NULL REFERENCES "DossierPhaseRecord"(id),
  "numero"           INT NOT NULL,
  "label"            TEXT NOT NULL,
  "type"             TEXT NOT NULL DEFAULT 'ITERATION',
  "statut"           TEXT NOT NULL DEFAULT 'EN_COURS',
  "dateCreation"     TIMESTAMP DEFAULT NOW(),
  "dateSoumission"   TIMESTAMP,
  "dateValidation"   TIMESTAMP,
  "valideParId"      TEXT,
  "validationMode"   TEXT,
  "motifRejet"       TEXT,
  "photos"           TEXT[],
  "pvPath"           TEXT,
  "notePrestataire"  TEXT,
  "noteAdmin"        TEXT,
  "noteClient"       TEXT,
  "semaine"          INT,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : SousPhaseDocument ──────────────────────

CREATE TABLE IF NOT EXISTS "SousPhaseDocument" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sousPhaseId"      TEXT NOT NULL REFERENCES "DossierSousPhase"(id) ON DELETE CASCADE,
  "nom"              TEXT NOT NULL,
  "filePath"         TEXT NOT NULL,
  "mimeType"         TEXT,
  "fileSize"         INT,
  "visibleClient"    BOOLEAN DEFAULT false,
  "uploadePar"       TEXT NOT NULL,
  "uploadeParRole"   TEXT NOT NULL,
  "statut"           TEXT DEFAULT 'EN_ATTENTE',
  "valideParId"      TEXT,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : DossierIntervenant ─────────────────────

CREATE TABLE IF NOT EXISTS "DossierIntervenant" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "role"             TEXT NOT NULL,
  "nom"              TEXT NOT NULL,
  "tel"              TEXT,
  "email"            TEXT,
  "rc"               TEXT,
  "patente"          TEXT,
  "ordreNum"         TEXT,
  "mandatPath"       TEXT,
  "mandatSigne"      BOOLEAN DEFAULT false,
  "mandatSigneAt"    TIMESTAMP,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : DossierGeoHistory ──────────────────────

CREATE TABLE IF NOT EXISTS "DossierGeoHistory" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "lambertX"         FLOAT NOT NULL,
  "lambertY"         FLOAT NOT NULL,
  "lambertSystem"    TEXT NOT NULL,
  "wgs84Lat"         FLOAT,
  "wgs84Lng"         FLOAT,
  "source"           TEXT NOT NULL,
  "acteur"           TEXT NOT NULL,
  "note"             TEXT,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : DossierNonConformite ───────────────────

CREATE TABLE IF NOT EXISTS "DossierNonConformite" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "intervenantId"    TEXT,
  "phase"            TEXT,
  "description"      TEXT NOT NULL,
  "gravite"          TEXT NOT NULL,
  "statut"           TEXT DEFAULT 'OUVERTE',
  "responsableId"    TEXT,
  "dateReleve"       TIMESTAMP DEFAULT NOW(),
  "dateResolution"   TIMESTAMP,
  "piecesJointes"    TEXT[],
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : DossierMessage ─────────────────────────

CREATE TABLE IF NOT EXISTS "DossierMessage" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "canal"            TEXT NOT NULL,
  "expediteurId"     TEXT NOT NULL,
  "expediteurRole"   TEXT NOT NULL,
  "type"             TEXT NOT NULL DEFAULT 'TEXT',
  "contenu"          TEXT,
  "filePath"         TEXT,
  "phaseRef"         TEXT,
  "sousPhaseRef"     TEXT,
  "visibleClient"    BOOLEAN DEFAULT true,
  "lu"               BOOLEAN DEFAULT false,
  "luAt"             TIMESTAMP,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : DossierVisio ────────────────────────────

CREATE TABLE IF NOT EXISTS "DossierVisio" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "organisateurId"   TEXT NOT NULL,
  "participants"     TEXT[],
  "lienVisio"        TEXT NOT NULL,
  "provider"         TEXT NOT NULL DEFAULT 'WHEREBY',
  "roomName"         TEXT NOT NULL,
  "dateHeure"        TIMESTAMP NOT NULL,
  "dureeEstimee"     INT,
  "statut"           TEXT DEFAULT 'PLANIFIEE',
  "phaseRef"         TEXT,
  "objet"            TEXT,
  "recordingPath"    TEXT,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : Prestataire ─────────────────────────────

CREATE TABLE IF NOT EXISTS "Prestataire" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "nom"              TEXT NOT NULL,
  "type"             TEXT NOT NULL,
  "specialites"      TEXT[],
  "communes"         TEXT[],
  "note"             FLOAT DEFAULT 0,
  "certifications"   TEXT[],
  "ice"              TEXT,
  "tel"              TEXT,
  "email"            TEXT,
  "actif"            BOOLEAN DEFAULT true,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : CommandePrestataire ─────────────────────

CREATE TABLE IF NOT EXISTS "CommandePrestataire" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dossierId"        TEXT NOT NULL REFERENCES "Dossier"(id) ON DELETE CASCADE,
  "prestataireId"    TEXT REFERENCES "Prestataire"(id),
  "phase"            TEXT NOT NULL,
  "lot"              TEXT,
  "type"             TEXT NOT NULL,
  "montant"          FLOAT,
  "statut"           TEXT DEFAULT 'EN_ATTENTE',
  "declencheTCE"     BOOLEAN DEFAULT false,
  "createdAt"        TIMESTAMP DEFAULT NOW()
);

-- ── NOUVELLE TABLE : ValidationPermission ────────────────────

CREATE TABLE IF NOT EXISTS "ValidationPermission" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "typeDocument"        TEXT NOT NULL,
  "mode"                TEXT NOT NULL DEFAULT 'MANUEL',
  "delaiAuto"           INT,
  "visibleClientAuto"   BOOLEAN DEFAULT true,
  "createdByOwnerId"    TEXT NOT NULL,
  "createdAt"           TIMESTAMP DEFAULT NOW()
);

-- ── DONNÉES INITIALES ────────────────────────────────────────

-- Initialiser DossierPhaseRecord pour les 223 dossiers Rokhas
INSERT INTO "DossierPhaseRecord" ("id", "dossierId", "phase", "statut", "dateFin", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d.id, ph.p, 'COMPLETE', NOW(), NOW(), NOW()
FROM "Dossier" d
CROSS JOIN (VALUES
  ('PHASE_01_ESQUISSE'),
  ('PHASE_02_APS'),
  ('PHASE_03_APD'),
  ('PHASE_04_MANDAT_BET')
) AS ph(p)
WHERE d.id IN (SELECT "dossierId" FROM "RokhasDossier" WHERE "refRokhas" != '')
ON CONFLICT ("dossierId", "phase") DO NOTHING;

INSERT INTO "DossierPhaseRecord" ("id", "dossierId", "phase", "statut", "dateDebut", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d.id, 'PHASE_05_AUTORISATION', 'EN_COURS', NOW(), NOW(), NOW()
FROM "Dossier" d
WHERE d.id IN (SELECT "dossierId" FROM "RokhasDossier" WHERE "refRokhas" != '')
ON CONFLICT ("dossierId", "phase") DO NOTHING;

-- Mettre à jour la phase courante des dossiers Rokhas
UPDATE "Dossier"
SET "phase" = 'PHASE_05_AUTORISATION'
WHERE id IN (SELECT "dossierId" FROM "RokhasDossier" WHERE "refRokhas" != '');

-- Initialiser 10 phases Rokhas pour tous les dossiers
INSERT INTO "RokhasPhaseHistory"
  ("id", "rokhasDossierId", "phaseNum", "phaseLabel", "statut", "phase")
SELECT
  gen_random_uuid()::text,
  rd.id,
  p.num,
  p.label,
  CASE
    WHEN p.num < COALESCE(rd."phaseActuelle", 1) THEN 'TERMINE'
    WHEN p.num = COALESCE(rd."phaseActuelle", 1) THEN 'EN_COURS'
    ELSE 'EN_ATTENTE'
  END,
  p.num
FROM "RokhasDossier" rd
CROSS JOIN (VALUES
  (1,  'Dépôt et enregistrement'),
  (2,  'Vérification de la complétude'),
  (3,  'Instruction technique'),
  (4,  'Avis des services consultés'),
  (5,  'Commission locale d''urbanisme'),
  (6,  'Délibération et décision'),
  (7,  'Signature de l''arrêté'),
  (8,  'Notification au demandeur'),
  (9,  'Retrait du permis'),
  (10, 'Clôture administrative')
) AS p(num, label)
ON CONFLICT DO NOTHING;

-- Initialiser pièces standard REQUISES pour chaque dossier
INSERT INTO "RokhasDocument"
  ("id", "rokhasDossierId", "phase", "nom", "categorie", "statut", "source", "phaseNum", "visibleClient")
SELECT
  gen_random_uuid()::text,
  rd.id,
  1,
  doc.nom,
  'PIECE_DEPOSEE',
  'REQUIS',
  'CLIENT',
  1,
  true
FROM "RokhasDossier" rd
CROSS JOIN (VALUES
  ('Formulaire de demande signé'),
  ('Copie CIN du maître d''ouvrage (x2)'),
  ('Titre de propriété ou réquisition d''inscription'),
  ('Plan de situation (1/5000 ou 1/2000)'),
  ('Plan de masse coté (1/500 ou 1/200)'),
  ('Plan d''implantation avec cotes de recul'),
  ('Plans de façades (toutes façades)'),
  ('Plans de coupe (longitudinale et transversale)'),
  ('Plans des niveaux (RDC + étages + terrasse)'),
  ('Note de calcul structure (si R+2 et plus)'),
  ('Devis descriptif et estimatif'),
  ('Contrat d''architecte (copie)'),
  ('Attestation inscription architecte à l''Ordre'),
  ('Extrait cadastral ou plan topographique'),
  ('Procuration si dépôt par mandataire')
) AS doc(nom)
ON CONFLICT DO NOTHING;

-- ── VÉRIFICATION FINALE ──────────────────────────────────────

SELECT 'Dossier'           AS table_name, COUNT(*) AS total FROM "Dossier"
UNION ALL
SELECT 'RokhasDossier',    COUNT(*) FROM "RokhasDossier"
UNION ALL
SELECT 'PhaseRecord',      COUNT(*) FROM "DossierPhaseRecord"
UNION ALL
SELECT 'RokhasPhaseHist',  COUNT(*) FROM "RokhasPhaseHistory"
UNION ALL
SELECT 'RokhasDocument',   COUNT(*) FROM "RokhasDocument"
UNION ALL
SELECT 'DossierMessage',   COUNT(*) FROM "DossierMessage"
UNION ALL
SELECT 'Prestataire',      COUNT(*) FROM "Prestataire"
ORDER BY table_name;
