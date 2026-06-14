-- ═══════════════════════════════════════════════════════════
-- SPRINT 0 — PURGE ET FONDATIONS
-- CITURBAREA — 27/03/2026
-- ═══════════════════════════════════════════════════════════

-- ── ÉTAPE 2A : Purge doublons RokhasDossier ─────────────────
-- Garde le plus récent par refRokhas, supprime les doublons

DELETE FROM "RokhasDossier"
WHERE id NOT IN (
  SELECT DISTINCT ON ("refRokhas") id
  FROM "RokhasDossier"
  WHERE "refRokhas" != ''
  ORDER BY "refRokhas", "createdAt" DESC
);

-- ── ÉTAPE 2B : Supprime les Dossiers orphelins ──────────────
-- Préserve les 4 dossiers de test importants

DELETE FROM "Dossier"
WHERE id NOT IN (
  SELECT "dossierId" FROM "RokhasDossier"
)
AND "projectId" IS NULL
AND status = 'DRAFT'
AND id NOT IN (
  'cmn14hoaw0003tcr35nls5v8i',
  'cmn3wqufp0001z6rwp895kru1',
  'cmn5fbjyo0001k892q6tgf5gx',
  'cmn4qozwo0001yz10nu6o22ci'
);

-- ── ÉTAPE 2C : Rattacher firmId arcbati ─────────────────────

UPDATE "Dossier"
SET "firmId" = (
  SELECT id FROM "Firm" WHERE slug = 'arcbati'
)
WHERE id IN (
  SELECT "dossierId" FROM "RokhasDossier"
)
AND "firmId" IS NULL;

-- ── ÉTAPE 2D : Vérifications ─────────────────────────────────

SELECT
  COUNT(*)                                    AS total_dossiers,
  COUNT(CASE WHEN "firmId" IS NOT NULL THEN 1 END) AS avec_firmId,
  COUNT(CASE WHEN "firmId" IS NULL THEN 1 END)     AS sans_firmId
FROM "Dossier";

SELECT COUNT(*) AS total_rokhas FROM "RokhasDossier";
SELECT COUNT(DISTINCT "refRokhas") AS refs_uniques
FROM "RokhasDossier"
WHERE "refRokhas" != '';
