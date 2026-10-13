-- Matériauthèque — mises à jour manuelles des prix de référence (back-office /cc/materiaux).
-- Table append-only : chaque correction est une nouvelle ligne (historique complet).
-- À coller dans Neon (console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run). Idempotent : peut être relancé sans risque.
-- Prix en DH HT par unité de référence du catalogue (kg, m³, m², ml, u, l).

CREATE TABLE IF NOT EXISTS "PrixReferenceManuel" (
  "id"          TEXT PRIMARY KEY,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "code"        TEXT NOT NULL,                 -- code CIT du catalogue (CIT-GO-008…)
  "prixHT"      DOUBLE PRECISION NOT NULL,
  "prixMinHT"   DOUBLE PRECISION NOT NULL,
  "prixMaxHT"   DOUBLE PRECISION NOT NULL,
  "source"      TEXT NOT NULL,                 -- obligatoire : devis, mercuriale, distributeur…
  "sourceUrl"   TEXT,
  "datePrix"    DATE NOT NULL,
  "note"        TEXT,
  "auteur"      TEXT NOT NULL,                 -- e-mail de l'administrateur
  "prixAvantHT" DOUBLE PRECISION              -- prix de référence remplacé (traçabilité)
);
CREATE INDEX IF NOT EXISTS "PrixReferenceManuel_code_idx" ON "PrixReferenceManuel" ("code", "createdAt");
