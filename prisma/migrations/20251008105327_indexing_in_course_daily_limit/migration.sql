-- CreateIndex
CREATE INDEX "courseQuoraDailyLimits_courseId_dailyLimit_idx" ON "courseQuoraDailyLimits"("courseId", "dailyLimit");

-- CreateIndex
CREATE INDEX "courseQuoraDailyLimits_courseId_idx" ON "courseQuoraDailyLimits"("courseId");
