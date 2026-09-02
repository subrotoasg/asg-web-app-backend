-- DropForeignKey
ALTER TABLE "classContents" DROP CONSTRAINT "classContents_adminId_fkey";

-- DropForeignKey
ALTER TABLE "courseAdmins" DROP CONSTRAINT "courseAdmins_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycleContents" DROP CONSTRAINT "cycleContents_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjectChapters" DROP CONSTRAINT "cycleSubjectChapters_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjects" DROP CONSTRAINT "cycleSubjects_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycles" DROP CONSTRAINT "cycles_adminId_fkey";

-- AlterTable
ALTER TABLE "classContents" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cycleContents" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cycleSubjectChapters" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cycleSubjects" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cycles" ALTER COLUMN "adminId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "classContents" ADD CONSTRAINT "classContents_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmins" ADD CONSTRAINT "courseAdmins_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjects" ADD CONSTRAINT "cycleSubjects_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapters" ADD CONSTRAINT "cycleSubjectChapters_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleContents" ADD CONSTRAINT "cycleContents_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
