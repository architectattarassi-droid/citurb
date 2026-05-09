-- CERCLES PROFESSIONNELS — réseau pro CITURBAREA (Sprint C0)
-- Spec : CERCLES-prompt-claude-code.md
-- Modèles : Cercle, CercleMembership, CercleModerator, CerclePost, PostAttachment,
--           LiveRoom, RoomParticipation, EgressTarget

-- CreateEnum
CREATE TYPE "CercleVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CercleRole" AS ENUM ('MEMBER', 'CONTRIBUTOR', 'MODERATOR', 'OWNER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING_REQUEST', 'PENDING_INVITE', 'ACTIVE', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StreamPlatform" AS ENUM ('YOUTUBE', 'FACEBOOK_PAGE', 'LINKEDIN_LIVE', 'CUSTOM_RTMP');

-- CreateEnum
CREATE TYPE "EgressStatus" AS ENUM ('IDLE', 'STARTING', 'ACTIVE', 'STOPPING', 'ENDED', 'FAILED');

-- CreateTable
CREATE TABLE "Cercle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CercleVisibility" NOT NULL DEFAULT 'MEMBERS_ONLY',
    "region" TEXT,
    "themes" TEXT[],
    "ownerId" TEXT NOT NULL,
    "firmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Cercle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CercleMembership" (
    "id" TEXT NOT NULL,
    "cercleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CercleRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CercleMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CercleModerator" (
    "id" TEXT NOT NULL,
    "cercleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CercleModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CerclePost" (
    "id" TEXT NOT NULL,
    "cercleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CerclePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveRoom" (
    "id" TEXT NOT NULL,
    "cercleId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "livekitRoomName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "maxParticipants" INTEGER NOT NULL DEFAULT 50,
    "isRecording" BOOLEAN NOT NULL DEFAULT false,
    "isLiveBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoomStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recordingUrl" TEXT,
    "recordingDurationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomParticipation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "durationSec" INTEGER,

    CONSTRAINT "RoomParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EgressTarget" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "platform" "StreamPlatform" NOT NULL,
    "rtmpUrl" TEXT NOT NULL,
    "streamKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "EgressStatus" NOT NULL DEFAULT 'IDLE',
    "livekitEgressId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EgressTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cercle_slug_key" ON "Cercle"("slug");

-- CreateIndex
CREATE INDEX "Cercle_firmId_idx" ON "Cercle"("firmId");

-- CreateIndex
CREATE INDEX "Cercle_visibility_deletedAt_idx" ON "Cercle"("visibility", "deletedAt");

-- CreateIndex
CREATE INDEX "CercleMembership_userId_idx" ON "CercleMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CercleMembership_cercleId_userId_key" ON "CercleMembership"("cercleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CercleModerator_cercleId_userId_key" ON "CercleModerator"("cercleId", "userId");

-- CreateIndex
CREATE INDEX "CerclePost_cercleId_createdAt_idx" ON "CerclePost"("cercleId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CerclePost_parentId_idx" ON "CerclePost"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveRoom_slug_key" ON "LiveRoom"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LiveRoom_livekitRoomName_key" ON "LiveRoom"("livekitRoomName");

-- CreateIndex
CREATE INDEX "LiveRoom_cercleId_scheduledAt_idx" ON "LiveRoom"("cercleId", "scheduledAt");

-- CreateIndex
CREATE INDEX "LiveRoom_status_idx" ON "LiveRoom"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoomParticipation_roomId_userId_key" ON "RoomParticipation"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "Cercle" ADD CONSTRAINT "Cercle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cercle" ADD CONSTRAINT "Cercle_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CercleMembership" ADD CONSTRAINT "CercleMembership_cercleId_fkey" FOREIGN KEY ("cercleId") REFERENCES "Cercle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CercleMembership" ADD CONSTRAINT "CercleMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CercleModerator" ADD CONSTRAINT "CercleModerator_cercleId_fkey" FOREIGN KEY ("cercleId") REFERENCES "Cercle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CercleModerator" ADD CONSTRAINT "CercleModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerclePost" ADD CONSTRAINT "CerclePost_cercleId_fkey" FOREIGN KEY ("cercleId") REFERENCES "Cercle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerclePost" ADD CONSTRAINT "CerclePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CerclePost" ADD CONSTRAINT "CerclePost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CerclePost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CerclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_cercleId_fkey" FOREIGN KEY ("cercleId") REFERENCES "Cercle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveRoom" ADD CONSTRAINT "LiveRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipation" ADD CONSTRAINT "RoomParticipation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipation" ADD CONSTRAINT "RoomParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EgressTarget" ADD CONSTRAINT "EgressTarget_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
