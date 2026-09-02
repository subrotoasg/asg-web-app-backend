-- AlterTable
ALTER TABLE "notificationLogs" ADD COLUMN     "courseId" UUID,
ADD COLUMN     "cycleId" UUID;

-- CreateIndex
CREATE INDEX "notificationLogs_courseId_idx" ON "notificationLogs"("courseId");

-- CreateIndex
CREATE INDEX "notificationLogs_cycleId_idx" ON "notificationLogs"("cycleId");

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
