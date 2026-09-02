-- AlterTable
ALTER TABLE "liveClasses" ADD COLUMN     "freeClassUrl" TEXT,
ADD COLUMN     "isFreeClass" BOOLEAN DEFAULT false,
ADD COLUMN     "mediaServer" TEXT;
