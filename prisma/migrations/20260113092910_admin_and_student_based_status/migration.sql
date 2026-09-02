-- AlterTable
ALTER TABLE "notificationUserStatus" ADD COLUMN     "adminId" UUID,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notificationUserStatus" ADD CONSTRAINT "notificationUserStatus_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
