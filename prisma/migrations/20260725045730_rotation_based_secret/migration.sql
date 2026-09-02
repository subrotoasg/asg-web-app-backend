-- CreateEnum
CREATE TYPE "MediaApp" AS ENUM ('FRB', 'ACADEMIC', 'ADMISSION');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "MediaCredential" (
    "id" TEXT NOT NULL,
    "app" "MediaApp" NOT NULL,
    "keyId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaCredential_keyId_key" ON "MediaCredential"("keyId");

-- CreateIndex
CREATE INDEX "MediaCredential_app_status_idx" ON "MediaCredential"("app", "status");
