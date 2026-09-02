-- AlterTable
ALTER TABLE "otpAttempts" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);
