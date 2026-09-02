/*
  Warnings:

  - You are about to drop the column `priceId` on the `service_usage_logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."service_usage_logs" DROP CONSTRAINT "service_usage_logs_priceId_fkey";

-- AlterTable
ALTER TABLE "service_usage_logs" DROP COLUMN "priceId",
ADD COLUMN     "defaultServicePriceId" UUID,
ADD COLUMN     "offeringPriceId" UUID;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_offeringPriceId_fkey" FOREIGN KEY ("offeringPriceId") REFERENCES "course_admin_service_offering_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_defaultServicePriceId_fkey" FOREIGN KEY ("defaultServicePriceId") REFERENCES "course_default_service_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
