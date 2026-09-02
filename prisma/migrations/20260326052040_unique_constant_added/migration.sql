/*
  Warnings:

  - A unique constraint covering the columns `[courseId,adminId,serviceId,billingYear,billingMonth]` on the table `course_service_usage_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "course_service_usage_summaries_without_offering_unique" ON "course_service_usage_summaries"("courseId", "adminId", "serviceId", "billingYear", "billingMonth");

-- RenameIndex
ALTER INDEX "course_service_usage_summaries_courseId_adminId_serviceId_b_key" RENAME TO "course_service_usage_summaries_with_offering_unique";
