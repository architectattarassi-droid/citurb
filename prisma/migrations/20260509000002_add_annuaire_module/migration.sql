-- ANNUAIRE PRO — réseau social BTP marocain (Sprint D1-D2)
-- Modèles : ProProfile, Connection, Notification

-- CreateEnum
CREATE TYPE "ProMetier" AS ENUM (
  'ARCHITECTE',
  'BET_STRUCTURE',
  'BET_FLUIDES',
  'BET_VRD',
  'TOPOGRAPHE',
  'GEOMETRE',
  'CONTROLE_TECHNIQUE',
  'LABORATOIRE',
  'ENTREPRISE_GO',
  'ENTREPRISE_SECOND_OEUVRE',
  'FOURNISSEUR_MATERIAUX',
  'PROMOTEUR',
  'MOA_PUBLIQUE',
  'MOA_PRIVEE',
  'ARTISAN_QUALIFIE'
);

-- CreateEnum
CREATE TYPE "ProClasseBTP" AS ENUM ('CL1', 'CL2', 'CL3', 'CL4', 'CL5', 'HC');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'CERCLE_INVITE',
  'CERCLE_REQUEST_APPROVED',
  'POST_REPLY',
  'POST_MENTION',
  'ROOM_STARTING',
  'ROOM_INVITE'
);

-- CreateTable
CREATE TABLE "ProProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "title" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "coverUrl" TEXT,
  "metier" "ProMetier" NOT NULL,
  "classeBTP" "ProClasseBTP",
  "agrements" TEXT[],
  "specialites" TEXT[],
  "regions" TEXT[],
  "villePrincipale" TEXT,
  "websiteUrl" TEXT,
  "linkedinUrl" TEXT,
  "phonePublic" TEXT,
  "emailPublic" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verifierNote" TEXT,
  "projectsCount" INTEGER NOT NULL DEFAULT 0,
  "connectionsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "actionUrl" TEXT,
  "refType" TEXT,
  "refId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_userId_key" ON "ProProfile"("userId");

-- CreateIndex
CREATE INDEX "ProProfile_metier_idx" ON "ProProfile"("metier");

-- CreateIndex
CREATE INDEX "ProProfile_classeBTP_idx" ON "ProProfile"("classeBTP");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_fromUserId_toUserId_key" ON "Connection"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "Connection_fromUserId_idx" ON "Connection"("fromUserId");

-- CreateIndex
CREATE INDEX "Connection_toUserId_idx" ON "Connection"("toUserId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
