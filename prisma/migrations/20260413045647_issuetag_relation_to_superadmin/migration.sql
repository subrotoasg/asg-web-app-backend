/*
  Warnings:

  - You are about to drop the column `adminId` on the `issueTag` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."issueTag" DROP CONSTRAINT "issueTag_adminId_fkey";

-- AlterTable
ALTER TABLE "issueTag" DROP COLUMN "adminId",
ADD COLUMN     "superAdminId" UUID;

-- AddForeignKey
ALTER TABLE "issueTag" ADD CONSTRAINT "issueTag_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
