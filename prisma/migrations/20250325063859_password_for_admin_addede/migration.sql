/*
  Warnings:

  - Added the required column `password` to the `admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cycleContent" DROP CONSTRAINT "cycleContent_cycleSubjectChapterId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjectChapter" DROP CONSTRAINT "cycleSubjectChapter_cycleSubjectId_fkey";

-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "password" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapter" ADD CONSTRAINT "cycleSubjectChapter_cycleSubjectId_fkey" FOREIGN KEY ("cycleSubjectId") REFERENCES "cycleSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleContent" ADD CONSTRAINT "cycleContent_cycleSubjectChapterId_fkey" FOREIGN KEY ("cycleSubjectChapterId") REFERENCES "cycleSubjectChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
