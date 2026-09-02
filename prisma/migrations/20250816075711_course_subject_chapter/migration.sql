/*
  Warnings:

  - You are about to drop the column `chapterId` on the `liveClasses` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `liveClasses` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `liveClasses` table. All the data in the column will be lost.
  - Added the required column `courseSubjectChapterId` to the `liveClasses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "liveClasses" DROP CONSTRAINT "liveClasses_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "liveClasses" DROP CONSTRAINT "liveClasses_courseId_fkey";

-- DropForeignKey
ALTER TABLE "liveClasses" DROP CONSTRAINT "liveClasses_subjectId_fkey";

-- AlterTable
ALTER TABLE "liveClasses" DROP COLUMN "chapterId",
DROP COLUMN "courseId",
DROP COLUMN "subjectId",
ADD COLUMN     "courseSubjectChapterId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_courseSubjectChapterId_fkey" FOREIGN KEY ("courseSubjectChapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
