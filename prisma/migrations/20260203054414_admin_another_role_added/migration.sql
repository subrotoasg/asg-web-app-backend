/*
  Warnings:

  - Added the required column `updatedAt` to the `course_admin_service_offering_prices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `course_admin_service_offering_selections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `course_admin_service_offerings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `course_default_services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "anotherRole" TEXT;

-- AlterTable
ALTER TABLE "course_admin_service_offering_prices" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "course_admin_service_offering_selections" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "course_admin_service_offerings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "course_default_services" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
