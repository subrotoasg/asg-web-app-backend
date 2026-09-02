/*
  Warnings:

  - A unique constraint covering the columns `[notificationId,adminId]` on the table `notificationUserStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "notificationUserStatus_notificationId_adminId_key" ON "notificationUserStatus"("notificationId", "adminId");
