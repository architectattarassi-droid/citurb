-- ═══════════════════════════════════════════════════════════════════════════
-- Migration Vague C — legacy PHASE_NN_xxx → codes v7
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️  À EXÉCUTER MANUELLEMENT EN PROD (Railway) APRÈS BACKUP.
--     NE PAS lancer depuis ts-node-dev ou un script automatisé.
--
-- Pré-requis :
--   1. Backup Railway récent (onglet Backups du dashboard, ou pg_dump manuel).
--      Audit pré-vague C : 28 dossiers, 10 records DossierPhaseRecord (codes
--      legacy uniquement PHASE_00_BRIEF). Migration triviale.
--   2. Décision Yassine actée : mapping FIXE 13 codes (pas de branche
--      conditionnelle sur le statut — PHASE_05 n'a 0 record en prod).
--
-- Garanties :
--   - Idempotent : ne touche que les codes legacy. Relançable sans effet sur
--     les records déjà v7.
--   - Transactionnel : tout ou rien. ROLLBACK silencieux possible si erreur.
--   - Préservation des données : aucune suppression, juste UPDATE phase.
--
-- Workflow conseillé :
--   (1) Lancer le SELECT initial pour capture des valeurs avant.
--   (2) Lancer le BEGIN ... COMMIT (lit le bloc complet d'un coup).
--   (3) Lancer les SELECT de vérif post-migration (doivent renvoyer 0 ligne).
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- Étape 1 — Capture des valeurs AVANT migration (pour rollback manuel)
-- ────────────────────────────────────────────────────────────────────────────
-- Garder le résultat de ces 2 SELECT dans un fichier local avant le UPDATE.
-- En cas de problème, ils permettent un rollback ciblé.

SELECT id, "dossierId", phase, statut, "createdAt"
FROM "DossierPhaseRecord"
WHERE phase LIKE 'PHASE_%'
ORDER BY "dossierId", "createdAt";

SELECT id, "ownerId", phase, "createdAt"
FROM "Dossier"
WHERE phase LIKE 'PHASE_%'
ORDER BY "createdAt";

-- ────────────────────────────────────────────────────────────────────────────
-- Étape 2 — Migration transactionnelle
-- ────────────────────────────────────────────────────────────────────────────

BEGIN;

-- DossierPhaseRecord.phase : 13 codes legacy → v7
UPDATE "DossierPhaseRecord" SET phase = '00_BRIEF'                  WHERE phase = 'PHASE_00_BRIEF';
UPDATE "DossierPhaseRecord" SET phase = '10_ESQUISSE'               WHERE phase = 'PHASE_01_ESQUISSE';
UPDATE "DossierPhaseRecord" SET phase = '12_APS'                    WHERE phase = 'PHASE_02_APS';
UPDATE "DossierPhaseRecord" SET phase = '14_APD'                    WHERE phase = 'PHASE_03_APD';
UPDATE "DossierPhaseRecord" SET phase = '15_MANDAT_BET'             WHERE phase = 'PHASE_04_MANDAT_BET';
UPDATE "DossierPhaseRecord" SET phase = '30_DOSSIER_AUTORISATION'   WHERE phase = 'PHASE_05_AUTORISATION';
UPDATE "DossierPhaseRecord" SET phase = '40_DOSSIER_EXECUTION'      WHERE phase = 'PHASE_06_DOSSIER_EXECUTION';
UPDATE "DossierPhaseRecord" SET phase = '50_DCE'                    WHERE phase = 'PHASE_07_DCE';
UPDATE "DossierPhaseRecord" SET phase = '54_ATTRIBUTION_MARCHE'     WHERE phase = 'PHASE_08_MANDATS';
UPDATE "DossierPhaseRecord" SET phase = '80_OUVERTURE_CHANTIER'     WHERE phase = 'PHASE_09_OUVERTURE_CHANTIER';
UPDATE "DossierPhaseRecord" SET phase = '93_RECEPTION_PROVISOIRE'   WHERE phase = 'PHASE_RECEPTION_PROVISOIRE';
UPDATE "DossierPhaseRecord" SET phase = '97_RECEPTION_DEFINITIVE'   WHERE phase = 'PHASE_RECEPTION_DEFINITIVE';
UPDATE "DossierPhaseRecord" SET phase = '96_PERMIS_HABITER'         WHERE phase = 'PHASE_PERMIS_HABITER';

-- Dossier.phase : même mapping (phase courante du dossier)
UPDATE "Dossier" SET phase = '00_BRIEF'                  WHERE phase = 'PHASE_00_BRIEF';
UPDATE "Dossier" SET phase = '10_ESQUISSE'               WHERE phase = 'PHASE_01_ESQUISSE';
UPDATE "Dossier" SET phase = '12_APS'                    WHERE phase = 'PHASE_02_APS';
UPDATE "Dossier" SET phase = '14_APD'                    WHERE phase = 'PHASE_03_APD';
UPDATE "Dossier" SET phase = '15_MANDAT_BET'             WHERE phase = 'PHASE_04_MANDAT_BET';
UPDATE "Dossier" SET phase = '30_DOSSIER_AUTORISATION'   WHERE phase = 'PHASE_05_AUTORISATION';
UPDATE "Dossier" SET phase = '40_DOSSIER_EXECUTION'      WHERE phase = 'PHASE_06_DOSSIER_EXECUTION';
UPDATE "Dossier" SET phase = '50_DCE'                    WHERE phase = 'PHASE_07_DCE';
UPDATE "Dossier" SET phase = '54_ATTRIBUTION_MARCHE'     WHERE phase = 'PHASE_08_MANDATS';
UPDATE "Dossier" SET phase = '80_OUVERTURE_CHANTIER'     WHERE phase = 'PHASE_09_OUVERTURE_CHANTIER';
UPDATE "Dossier" SET phase = '93_RECEPTION_PROVISOIRE'   WHERE phase = 'PHASE_RECEPTION_PROVISOIRE';
UPDATE "Dossier" SET phase = '97_RECEPTION_DEFINITIVE'   WHERE phase = 'PHASE_RECEPTION_DEFINITIVE';
UPDATE "Dossier" SET phase = '96_PERMIS_HABITER'         WHERE phase = 'PHASE_PERMIS_HABITER';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- Étape 3 — Vérification post-migration (doit renvoyer 0 ligne sur les 2)
-- ────────────────────────────────────────────────────────────────────────────

-- Doit retourner 0 lignes : aucun code legacy résiduel
SELECT phase, COUNT(*) AS nb
FROM "DossierPhaseRecord"
WHERE phase LIKE 'PHASE_%'
GROUP BY phase;

-- Idem sur Dossier
SELECT phase, COUNT(*) AS nb
FROM "Dossier"
WHERE phase LIKE 'PHASE_%'
GROUP BY phase;

-- Distribution finale (visibilité après migration)
SELECT phase, COUNT(*) AS nb
FROM "DossierPhaseRecord"
GROUP BY phase
ORDER BY 2 DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- Fin du script. Si les 2 premiers SELECT renvoient 0 ligne → migration OK.
--
-- Note : le @default(...) de Dossier.phase est passé à "00_BRIEF" côté
-- prisma/schema.prisma (commit du même push). Les nouveaux dossiers créés
-- post-migration naîtront déjà au format v7 — pas de nouveau record legacy.
-- ═══════════════════════════════════════════════════════════════════════════
