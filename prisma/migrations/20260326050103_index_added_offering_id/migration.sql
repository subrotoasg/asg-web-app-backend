/*
  Warnings:

  - A unique constraint covering the columns `[courseId,adminId,serviceId,billingYear,billingMonth,offeringId]` on the table `course_service_usage_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."course_service_usage_summaries_courseId_adminId_serviceId_b_key";

-- CreateIndex
CREATE UNIQUE INDEX "course_service_usage_summaries_courseId_adminId_serviceId_b_key" ON "course_service_usage_summaries"("courseId", "adminId", "serviceId", "billingYear", "billingMonth", "offeringId");
