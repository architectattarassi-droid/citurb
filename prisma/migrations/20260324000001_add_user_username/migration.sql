-- AddColumn username on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
