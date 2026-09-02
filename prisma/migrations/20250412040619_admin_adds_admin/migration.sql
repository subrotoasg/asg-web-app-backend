-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "adminId" UUID,
ALTER COLUMN "superAdminId" DROP NOT NULL;
