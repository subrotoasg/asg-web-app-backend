-- DropForeignKey
ALTER TABLE "featured" DROP CONSTRAINT "featured_courseId_fkey";

-- DropForeignKey
ALTER TABLE "noticeORroutine" DROP CONSTRAINT "noticeORroutine_courseId_fkey";

-- AlterTable
ALTER TABLE "featured" ADD COLUMN     "cycleId" UUID,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "noticeORroutine" ADD COLUMN     "cycleId" UUID,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "featured" ADD CONSTRAINT "featured_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured" ADD CONSTRAINT "featured_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticeORroutine" ADD CONSTRAINT "noticeORroutine_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticeORroutine" ADD CONSTRAINT "noticeORroutine_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
