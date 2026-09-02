-- AlterEnum
ALTER TYPE "RestrictionType" ADD VALUE 'MEDIA_COMMENT';

-- AlterTable
ALTER TABLE "studentRestriction" ADD COLUMN     "banned_by" TEXT,
ADD COLUMN     "banned_by_bot" TEXT,
ADD COLUMN     "banned_by_name" TEXT,
ADD COLUMN     "room_name" TEXT;
