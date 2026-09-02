-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('EMAIL_PASSWORD', 'PHONE_OTP', 'GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "appleId" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isOAuthUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "studentAuthLog" ADD COLUMN     "authMethod" "AuthMethod" NOT NULL DEFAULT 'EMAIL_PASSWORD',
ADD COLUMN     "providerUid" TEXT;

-- CreateTable
CREATE TABLE "studentOAuthProvider" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerUid" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studentOAuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studentOAuthProvider_id_key" ON "studentOAuthProvider"("id");

-- CreateIndex
CREATE INDEX "studentOAuthProvider_studentId_idx" ON "studentOAuthProvider"("studentId");

-- CreateIndex
CREATE INDEX "studentOAuthProvider_provider_providerUid_idx" ON "studentOAuthProvider"("provider", "providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "studentOAuthProvider_provider_providerUid_key" ON "studentOAuthProvider"("provider", "providerUid");

-- AddForeignKey
ALTER TABLE "studentOAuthProvider" ADD CONSTRAINT "studentOAuthProvider_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
