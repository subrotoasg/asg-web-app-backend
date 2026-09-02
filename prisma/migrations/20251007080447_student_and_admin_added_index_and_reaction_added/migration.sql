-- DropIndex
DROP INDEX "admins_id_isDeleted_idx";

-- AlterTable
ALTER TABLE "classLikes" ADD COLUMN     "adminId" UUID;

-- CreateIndex
CREATE INDEX "admins_id_isDeleted_email_phone_idx" ON "admins"("id", "isDeleted", "email", "phone");

-- CreateIndex
CREATE INDEX "student_id_email_phone_idx" ON "student"("id", "email", "phone");

-- AddForeignKey
ALTER TABLE "classLikes" ADD CONSTRAINT "classLikes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
