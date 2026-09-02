/*
  Warnings:

  - Added the required column `cycleImage` to the `cycle` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "courses_title_key";

-- AlterTable
ALTER TABLE "chapter" ADD COLUMN     "chapterImage" TEXT;

-- AlterTable
ALTER TABLE "classContent" ADD COLUMN     "thumbneil" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "courseImage" TEXT;

-- AlterTable
ALTER TABLE "cycle" ADD COLUMN     "cycleImage" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "cycleContent" ADD COLUMN     "thumbneil" TEXT;

-- AlterTable
ALTER TABLE "cycleSubject" ADD COLUMN     "cycleSubjectImage" TEXT;

-- AlterTable
ALTER TABLE "cycleSubjectChapter" ADD COLUMN     "cycleSubjectChapterImage" TEXT;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "subjectImage" TEXT;
