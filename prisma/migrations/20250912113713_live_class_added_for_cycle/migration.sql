-- AlterTable
ALTER TABLE "liveClasses" ADD COLUMN     "cycleSubjectChapterId" UUID,
ALTER COLUMN "courseSubjectChapterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_cycleSubjectChapterId_fkey" FOREIGN KEY ("cycleSubjectChapterId") REFERENCES "cycleSubjectChapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
