-- Sprint S11 — Table Payment
CREATE TABLE IF NOT EXISTS "Payment" (
  "id"          TEXT NOT NULL,
  "dossierId"   TEXT NOT NULL,
  "mode"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "amount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"    TEXT NOT NULL DEFAULT 'MAD',
  "ref"         TEXT,
  "proofDocId"  TEXT,
  "confirmedAt" TIMESTAMP(3),
  "confirmedBy" TEXT,
  "ficheUrl"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_dossierId_fkey"
    FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id")
);
