CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA public;
SET search_path = public;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'OPERATOR', 'OPS', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('DOCTRINE_BLOCK', 'BYPASS_RISK', 'DISINTERMEDIATION_RISK', 'STATE_TAMPER', 'PAYMENT_TAMPER', 'DATA_EXFILTRATION_RISK', 'OFF_PLATFORM_CHANNEL_RISK', 'IA_POLICY_VIOLATION', 'ENTITLEMENT_BYPASS', 'GEO_VIOLATION', 'CYCLE_OVERRUN');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('INFO', 'WARN', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('CLIENT', 'OPERATOR', 'OPS', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GeoLevel" AS ENUM ('REGION', 'PROVINCE', 'COMMUNE', 'ZONE');

-- CreateEnum
CREATE TYPE "SituationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'VVIP', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "DossierStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DossierAreaKind" AS ENUM ('DECLARED', 'ESTIMATED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DossierAreaMethod" AS ENUM ('CLIENT_DECLARED', 'HEURISTIC_V1', 'VERIFIED_DOC_V1');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "plan" "Plan" NOT NULL DEFAULT 'PRO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoUnit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "level" "GeoLevel" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "geom" geometry,

    CONSTRAINT "GeoUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "door" INTEGER NOT NULL,
    "geoId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'E0',
    "econStatus" TEXT NOT NULL DEFAULT 'NORMAL',
    "freezeReason" TEXT,
    "freezeOrigin" TEXT,
    "freezeAt" TIMESTAMP(3),
    "freezeScore" DOUBLE PRECISION,
    "modActivated" BOOLEAN NOT NULL DEFAULT false,
    "trustEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSituation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "amountDeclared" DOUBLE PRECISION NOT NULL,
    "platformFee5" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "architectOk" BOOLEAN NOT NULL DEFAULT false,
    "betOk" BOOLEAN NOT NULL DEFAULT false,
    "controlOk" BOOLEAN NOT NULL DEFAULT false,
    "topoOk" BOOLEAN NOT NULL DEFAULT false,
    "status" "SituationStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "WorkSituation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "stripeSession" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceOrderId" TEXT NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "ActorType",
    "freezeReason" TEXT,
    "freezeOrigin" TEXT,

    CONSTRAINT "StateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProbativeLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ProbativeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "errorCode" TEXT NOT NULL,
    "tomeRef" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "category" "IncidentCategory" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "projectId" TEXT,
    "actorId" TEXT,
    "actorType" "ActorType",
    "door" INTEGER,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "IncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "NotificationChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEntitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEntitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "contextKey" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "parcelRef" TEXT,
    "status" "DossierStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierArea" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "kind" "DossierAreaKind" NOT NULL,
    "valueM2" DECIMAL(12,2) NOT NULL,
    "method" "DossierAreaMethod" NOT NULL,
    "methodVersion" TEXT NOT NULL,
    "inputsHash" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "GeoUnit_level_idx" ON "GeoUnit"("level");

-- CreateIndex
CREATE INDEX "GeoUnit_parentId_idx" ON "GeoUnit"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoUnit_level_name_parentId_key" ON "GeoUnit"("level", "name", "parentId");

-- CreateIndex
CREATE INDEX "WorkSituation_projectId_idx" ON "WorkSituation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSession_key" ON "Order"("stripeSession");

-- CreateIndex
CREATE INDEX "Entitlement_projectId_type_status_idx" ON "Entitlement"("projectId", "type", "status");

-- CreateIndex
CREATE INDEX "StateHistory_projectId_createdAt_idx" ON "StateHistory"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProbativeLog_createdAt_idx" ON "ProbativeLog"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_projectId_idx" ON "Incident"("projectId");

-- CreateIndex
CREATE INDEX "Incident_category_severity_idx" ON "Incident"("category", "severity");

-- CreateIndex
CREATE INDEX "IncidentEvent_incidentId_createdAt_idx" ON "IncidentEvent"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_incidentId_idx" ON "NotificationDelivery"("incidentId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_channel_idx" ON "NotificationDelivery"("status", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "UserEntitlements_userId_key" ON "UserEntitlements"("userId");

-- CreateIndex
CREATE INDEX "OtpChallenge_contextKey_channel_createdAt_idx" ON "OtpChallenge"("contextKey", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_destination_channel_lastSentAt_idx" ON "OtpChallenge"("destination", "channel", "lastSentAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_status_expiresAt_idx" ON "OtpChallenge"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Dossier_ownerId_status_idx" ON "Dossier"("ownerId", "status");

-- CreateIndex
CREATE INDEX "DossierArea_dossierId_kind_computedAt_idx" ON "DossierArea"("dossierId", "kind", "computedAt");

-- AddForeignKey
ALTER TABLE "GeoUnit" ADD CONSTRAINT "GeoUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_geoId_fkey" FOREIGN KEY ("geoId") REFERENCES "GeoUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSituation" ADD CONSTRAINT "WorkSituation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateHistory" ADD CONSTRAINT "StateHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEntitlements" ADD CONSTRAINT "UserEntitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierArea" ADD CONSTRAINT "DossierArea_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
