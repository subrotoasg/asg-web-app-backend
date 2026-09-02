-- AlterTable
ALTER TABLE "grandCelebrationAuths" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0;
