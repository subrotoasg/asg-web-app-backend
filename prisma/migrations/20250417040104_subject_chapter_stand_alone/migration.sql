/*
  Warnings:

  - You are about to drop the column `chapter` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `chapterImage` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `chapterName` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `chapters` table. All the data in the column will be lost.
  - You are about to drop the column `chapterId` on the `classContents` table. All the data in the column will be lost.
  - You are about to drop the column `subjectImage` on the `subjects` table. All the data in the column will be lost.
  - You are about to drop the column `superAdminId` on the `subjects` table. All the data in the column will be lost.
  - Added the required column `chapterId` to the `chapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseSubjectId` to the `chapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseSubjectChapterId` to the `classContents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `subjects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_courseId_fkey";

-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "classContents" DROP CONSTRAINT "classContents_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjectChapters" DROP CONSTRAINT "cycleSubjectChapters_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjects" DROP CONSTRAINT "cycleSubjects_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_superAdminId_fkey";

-- AlterTable
ALTER TABLE "chapters" DROP COLUMN "chapter",
DROP COLUMN "chapterImage",
DROP COLUMN "chapterName",
DROP COLUMN "courseId",
DROP COLUMN "subjectId",
ADD COLUMN     "chapterId" UUID NOT NULL,
ADD COLUMN     "courseSubjectId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "classContents" DROP COLUMN "chapterId",
ADD COLUMN     "courseSubjectChapterId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "subjectImage",
DROP COLUMN "superAdminId",
ADD COLUMN     "adminId" UUID,
ADD COLUMN     "subjectId" UUID NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;

-- CreateTable
CREATE TABLE "subject" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subjectImage" TEXT NOT NULL,
    "superAdminId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" UUID NOT NULL,
    "chapterName" TEXT NOT NULL,
    "chapterImage" TEXT,
    "subjectId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_id_key" ON "subject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_id_key" ON "chapter"("id");

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_courseSubjectId_fkey" FOREIGN KEY ("courseSubjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classContents" ADD CONSTRAINT "classContents_courseSubjectChapterId_fkey" FOREIGN KEY ("courseSubjectChapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjects" ADD CONSTRAINT "cycleSubjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapters" ADD CONSTRAINT "cycleSubjectChapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
