-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "subject" DROP CONSTRAINT "subject_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_adminId_fkey";

-- AlterTable
ALTER TABLE "courses" ALTER COLUMN "superAdminId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
