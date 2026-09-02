-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "archieveCourseId" UUID,
ADD COLUMN     "markAsArchieve" BOOLEAN DEFAULT false;
