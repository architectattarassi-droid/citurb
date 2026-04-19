-- Sprint S5: DossierDocument table
CREATE TABLE IF NOT EXISTS "DossierDocument" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "dossierId"    TEXT NOT NULL,
  "docType"      TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName"   TEXT NOT NULL,
  "mimeType"     TEXT,
  "sizeBytes"    INTEGER,
  "uploadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DossierDocument_dossierId_idx" ON "DossierDocument"("dossierId");
