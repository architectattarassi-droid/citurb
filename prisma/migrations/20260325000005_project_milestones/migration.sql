-- Sprint S14 — Jalons de projet E7→E12
CREATE TABLE IF NOT EXISTS "ProjectMilestone" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "phase"       TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt"   TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes"       TEXT,
  "triggeredBy" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectMilestone_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
);
