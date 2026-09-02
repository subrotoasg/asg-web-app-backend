-- AlterTable
ALTER TABLE "cycleContents" ADD COLUMN     "instructor" TEXT,
ADD COLUMN     "libraryId" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
