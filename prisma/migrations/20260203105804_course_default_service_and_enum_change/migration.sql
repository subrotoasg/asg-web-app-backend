/*
  Warnings:

  - You are about to drop the column `courseDefaultId` on the `course_default_service_prices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[courseDefaultServiceId,type,minQty,maxQty]` on the table `course_default_service_prices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `courseDefaultServiceId` to the `course_default_service_prices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PriceType" ADD VALUE 'FIXED';

-- DropForeignKey
ALTER TABLE "public"."course_default_service_prices" DROP CONSTRAINT "course_default_service_prices_courseDefaultId_fkey";

-- DropIndex
DROP INDEX "public"."course_default_service_prices_courseDefaultId_type_isActive_idx";

-- DropIndex
DROP INDEX "public"."course_default_service_prices_courseDefaultId_type_minQty_m_key";

-- AlterTable
ALTER TABLE "course_default_service_prices" DROP COLUMN "courseDefaultId",
ADD COLUMN     "courseDefaultServiceId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "course_default_service_prices_courseDefaultServiceId_type_i_idx" ON "course_default_service_prices"("courseDefaultServiceId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "course_default_service_prices_courseDefaultServiceId_type_m_key" ON "course_default_service_prices"("courseDefaultServiceId", "type", "minQty", "maxQty");

-- AddForeignKey
ALTER TABLE "course_default_service_prices" ADD CONSTRAINT "course_default_service_prices_courseDefaultServiceId_fkey" FOREIGN KEY ("courseDefaultServiceId") REFERENCES "course_default_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
