-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superAdmin', 'admin');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "role" "Role" DEFAULT 'admin';

-- AlterTable
ALTER TABLE "featured" ADD COLUMN     "adminId" UUID;

-- AlterTable
ALTER TABLE "notice" ADD COLUMN     "adminId" UUID;

-- AlterTable
ALTER TABLE "routine" ADD COLUMN     "adminId" UUID;

-- AlterTable
ALTER TABLE "superAdmin" ADD COLUMN     "role" "Role" DEFAULT 'superAdmin';

-- AddForeignKey
ALTER TABLE "featured" ADD CONSTRAINT "featured_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine" ADD CONSTRAINT "routine_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice" ADD CONSTRAINT "notice_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
