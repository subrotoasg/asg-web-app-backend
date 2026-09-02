/*
  Warnings:

  - A unique constraint covering the columns `[courseId]` on the table `courses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "Category" TEXT,
ADD COLUMN     "Parent" TEXT,
ADD COLUMN     "Permalink" TEXT,
ADD COLUMN     "Platinum" TEXT,
ADD COLUMN     "ProductImage" TEXT,
ADD COLUMN     "SubCategory" TEXT,
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "currency_amount" INTEGER,
ADD COLUMN     "productFullName" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "productName" TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "isDeleted" DROP NOT NULL,
ALTER COLUMN "cycleAvailable" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courses_courseId_key" ON "courses"("courseId");
