/*
  Warnings:

  - Added the required column `superAdminId` to the `courseAdmin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courseAdmin" ADD COLUMN     "superAdminId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "superAdmin" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "courseAdmin" ADD CONSTRAINT "courseAdmin_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
