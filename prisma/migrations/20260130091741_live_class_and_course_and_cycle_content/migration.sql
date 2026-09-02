-- AlterTable
ALTER TABLE "classContents" ADD COLUMN     "partIndex" INTEGER;

-- AlterTable
ALTER TABLE "cycleContents" ADD COLUMN     "partIndex" INTEGER;

-- AlterTable
ALTER TABLE "liveClasses" ADD COLUMN     "lastRecordingAt" TIMESTAMP(3),
ADD COLUMN     "partsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "roomClosedAt" TIMESTAMP(3);
