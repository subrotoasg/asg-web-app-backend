-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "courseSubjectChapterImage" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "cycleSubjectChapters" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "cycleSubjects" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "courseSubjectImage" TEXT;
