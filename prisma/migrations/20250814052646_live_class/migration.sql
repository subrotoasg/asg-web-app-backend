/*
  Warnings:

  - You are about to drop the `liveClass` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "liveClass";

-- CreateTable
CREATE TABLE "liveClasses" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "adminId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "subjectId" UUID,
    "chapterId" UUID NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "url" TEXT,
    "videoId" TEXT,
    "hostingType" TEXT,
    "yt" TEXT,
    "vimeo" TEXT,
    "raw" TEXT,
    "rec" TEXT,
    "stream" TEXT,
    "libraryId" TEXT,
    "thumbnail" TEXT,
    "thumbnailPath" TEXT,
    "thumbnail256x144Path" TEXT,
    "slidesUrl" TEXT,
    "hotspotUrl" TEXT,
    "lectureSheet" TEXT,
    "practiceSheet" TEXT,
    "solutionSheet" TEXT,
    "noteUrl" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numberOfRatings" INTEGER NOT NULL DEFAULT 0,
    "notify" BOOLEAN NOT NULL DEFAULT false,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "liveClasses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liveClasses_id_key" ON "liveClasses"("id");

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveClasses" ADD CONSTRAINT "liveClasses_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
