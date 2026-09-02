/*
  Warnings:

  - You are about to drop the column `otpAttempts` on the `grandCelebrationAuths` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "grandCelebrationAuths" DROP COLUMN "otpAttempts",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isVerifyEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerifyPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpSendAt" TIMESTAMP(3);
