-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "serial" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "classContents" ADD COLUMN     "serial" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "cycleContents" ADD COLUMN     "serial" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "cycleSubjectChapters" ADD COLUMN     "serial" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "cycleSubjects" ADD COLUMN     "serial" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "serial" INTEGER DEFAULT 1;
