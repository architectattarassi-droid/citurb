-- Sprint S-FIRM — Multi-tenant Firm table
CREATE TABLE IF NOT EXISTS "Firm" (
  "id"           TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "ownerEmail"   TEXT NOT NULL,
  "ownerPhone"   TEXT,
  "logoUrl"      TEXT,
  "smtpUser"     TEXT,
  "smtpPass"     TEXT,
  "stripeKey"    TEXT,
  "planType"     TEXT NOT NULL DEFAULT 'STARTER',
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Firm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Firm_slug_key" UNIQUE ("slug")
);
