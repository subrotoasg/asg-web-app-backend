/*
  Warnings:

  - Added the required column `adminId` to the `classContents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `cycleContents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `cycleSubjectChapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `cycleSubjects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "classContents" ADD COLUMN     "adminId" UUID NOT NULL,
ADD COLUMN     "lectureSheet" TEXT,
ADD COLUMN     "practiceSheet" TEXT,
ADD COLUMN     "solutionSheet" TEXT;

-- AlterTable
ALTER TABLE "cycleContents" ADD COLUMN     "adminId" UUID NOT NULL,
ADD COLUMN     "lectureSheet" TEXT,
ADD COLUMN     "practiceSheet" TEXT,
ADD COLUMN     "solutionSheet" TEXT;

-- AlterTable
ALTER TABLE "cycleSubjectChapters" ADD COLUMN     "adminId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "cycleSubjects" ADD COLUMN     "adminId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "cycles" ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "classContents" ADD CONSTRAINT "classContents_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjects" ADD CONSTRAINT "cycleSubjects_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapters" ADD CONSTRAINT "cycleSubjectChapters_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleContents" ADD CONSTRAINT "cycleContents_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
