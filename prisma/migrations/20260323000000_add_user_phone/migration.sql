-- Migration: add_user_phone
-- Adds phone (E.164) and phoneVerifiedAt to User model

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);
