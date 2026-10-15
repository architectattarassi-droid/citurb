-- CITURBAREA — Cercles : outils réservés aux pros agréés (accordés par l'admin, membre par membre).
-- Prérequis : docs/prix/sql/cercles-fournisseurs.sql (table "Fournisseur").
-- Rejouable sans risque (IF NOT EXISTS) ; n'efface ni ne modifie aucune donnée.
-- Contrat : docs/architecture/contrat-acces-pro.md. Modèle Prisma : Fournisseur.acces / accesDemandes.

-- { "MATERIAUTHEQUE_PRO": { "actif": true, "depuis": "2026-10-15T…", "par": "admin@…", "expireLe": null }, "CPS": … } — vide = membre de base.
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "acces"         JSONB NOT NULL DEFAULT '{}';
-- [{ "outil": "CPS", "le": "2026-10-15T…", "message": "…" }] — demandes en attente, effacées quand l'admin tranche.
ALTER TABLE "Fournisseur" ADD COLUMN IF NOT EXISTS "accesDemandes" JSONB NOT NULL DEFAULT '[]';
