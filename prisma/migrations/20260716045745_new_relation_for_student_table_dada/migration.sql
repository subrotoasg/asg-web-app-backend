-- AlterTable
ALTER TABLE "notificationLogs" ADD COLUMN     "senderStudentId" UUID;

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "bannedStatus" TEXT;

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_senderStudentId_fkey" FOREIGN KEY ("senderStudentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
