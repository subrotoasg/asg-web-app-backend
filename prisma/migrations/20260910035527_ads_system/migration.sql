-- CreateEnum
CREATE TYPE "AdCreativeType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('PRE_ROLL', 'MID_ROLL', 'POST_ROLL', 'OVERLAY');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdTargetScope" AS ENUM ('GLOBAL', 'COURSE', 'COURSE_SUBJECT', 'COURSE_SUBJECT_CHAPTER', 'CLASS_CONTENT', 'CYCLE', 'CYCLE_SUBJECT', 'CYCLE_SUBJECT_CHAPTER', 'CYCLE_CONTENT', 'LIVE_CLASS', 'STUDENT', 'STUDENT_COURSE');

-- CreateEnum
CREATE TYPE "AdTargetMode" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'COMPLETE', 'SKIP', 'CLICK');

-- CreateTable
CREATE TABLE "ads" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creativeType" "AdCreativeType" NOT NULL DEFAULT 'VIDEO',
    "src" TEXT NOT NULL,
    "thumbnail" TEXT,
    "durationSec" INTEGER NOT NULL DEFAULT 15,
    "skipAfterSec" INTEGER,
    "clickUrl" TEXT,
    "cta" TEXT,
    "placement" "AdPlacement" NOT NULL DEFAULT 'PRE_ROLL',
    "atSec" INTEGER NOT NULL DEFAULT 0,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "maxImpressionsPerUser" INTEGER,
    "minGapSeconds" INTEGER,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "completeCount" INTEGER NOT NULL DEFAULT 0,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdBySuperAdminId" UUID,
    "createdByAdminId" UUID,
    "updatedBySuperAdminId" UUID,
    "updatedByAdminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_targets" (
    "id" UUID NOT NULL,
    "adId" UUID NOT NULL,
    "scope" "AdTargetScope" NOT NULL,
    "mode" "AdTargetMode" NOT NULL DEFAULT 'INCLUDE',
    "courseId" UUID,
    "courseSubjectId" UUID,
    "courseSubjectChapterId" UUID,
    "classContentId" UUID,
    "cycleId" UUID,
    "cycleSubjectId" UUID,
    "cycleSubjectChapterId" UUID,
    "cycleContentId" UUID,
    "liveClassId" UUID,
    "studentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_events" (
    "id" UUID NOT NULL,
    "adId" UUID NOT NULL,
    "type" "AdEventType" NOT NULL,
    "studentId" UUID,
    "contextScope" "AdTargetScope",
    "contextId" UUID,
    "positionSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ads_status_isDeleted_idx" ON "ads"("status", "isDeleted");

-- CreateIndex
CREATE INDEX "ads_status_startAt_endAt_idx" ON "ads"("status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ads_createdByAdminId_idx" ON "ads"("createdByAdminId");

-- CreateIndex
CREATE INDEX "ads_createdBySuperAdminId_idx" ON "ads"("createdBySuperAdminId");

-- CreateIndex
CREATE INDEX "ads_placement_status_idx" ON "ads"("placement", "status");

-- CreateIndex
CREATE INDEX "ad_targets_adId_idx" ON "ad_targets"("adId");

-- CreateIndex
CREATE INDEX "ad_targets_scope_mode_idx" ON "ad_targets"("scope", "mode");

-- CreateIndex
CREATE INDEX "ad_targets_courseId_idx" ON "ad_targets"("courseId");

-- CreateIndex
CREATE INDEX "ad_targets_courseSubjectId_idx" ON "ad_targets"("courseSubjectId");

-- CreateIndex
CREATE INDEX "ad_targets_courseSubjectChapterId_idx" ON "ad_targets"("courseSubjectChapterId");

-- CreateIndex
CREATE INDEX "ad_targets_classContentId_idx" ON "ad_targets"("classContentId");

-- CreateIndex
CREATE INDEX "ad_targets_cycleId_idx" ON "ad_targets"("cycleId");

-- CreateIndex
CREATE INDEX "ad_targets_cycleSubjectId_idx" ON "ad_targets"("cycleSubjectId");

-- CreateIndex
CREATE INDEX "ad_targets_cycleSubjectChapterId_idx" ON "ad_targets"("cycleSubjectChapterId");

-- CreateIndex
CREATE INDEX "ad_targets_cycleContentId_idx" ON "ad_targets"("cycleContentId");

-- CreateIndex
CREATE INDEX "ad_targets_liveClassId_idx" ON "ad_targets"("liveClassId");

-- CreateIndex
CREATE INDEX "ad_targets_studentId_idx" ON "ad_targets"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_targets_unique_entity" ON "ad_targets"("adId", "scope", "courseId", "courseSubjectId", "courseSubjectChapterId", "classContentId", "cycleId", "cycleSubjectId", "cycleSubjectChapterId", "cycleContentId", "liveClassId", "studentId");

-- CreateIndex
CREATE INDEX "ad_events_adId_type_createdAt_idx" ON "ad_events"("adId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ad_events_studentId_adId_idx" ON "ad_events"("studentId", "adId");

-- CreateIndex
CREATE INDEX "ad_events_createdAt_idx" ON "ad_events"("createdAt");

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_createdBySuperAdminId_fkey" FOREIGN KEY ("createdBySuperAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_updatedBySuperAdminId_fkey" FOREIGN KEY ("updatedBySuperAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_courseSubjectId_fkey" FOREIGN KEY ("courseSubjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_courseSubjectChapterId_fkey" FOREIGN KEY ("courseSubjectChapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_classContentId_fkey" FOREIGN KEY ("classContentId") REFERENCES "classContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_cycleSubjectId_fkey" FOREIGN KEY ("cycleSubjectId") REFERENCES "cycleSubjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_cycleSubjectChapterId_fkey" FOREIGN KEY ("cycleSubjectChapterId") REFERENCES "cycleSubjectChapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_cycleContentId_fkey" FOREIGN KEY ("cycleContentId") REFERENCES "cycleContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "liveClasses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_targets" ADD CONSTRAINT "ad_targets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

