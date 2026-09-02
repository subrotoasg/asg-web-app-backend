-- AlterTable
ALTER TABLE "quoras" ADD COLUMN     "duplicateCount" INTEGER DEFAULT 0,
ADD COLUMN     "isDuplicate" BOOLEAN DEFAULT false;
