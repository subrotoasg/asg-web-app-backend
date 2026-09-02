-- AlterTable
ALTER TABLE "notificationLogs" ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invalidCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sendCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueId" TEXT;

-- CreateTable
CREATE TABLE "notificationUserStatus" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "isClicked" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificationUserStatus_studentId_idx" ON "notificationUserStatus"("studentId");

-- CreateIndex
CREATE INDEX "notificationUserStatus_notificationId_idx" ON "notificationUserStatus"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notificationUserStatus_notificationId_studentId_key" ON "notificationUserStatus"("notificationId", "studentId");

-- AddForeignKey
ALTER TABLE "notificationUserStatus" ADD CONSTRAINT "notificationUserStatus_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notificationLogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationUserStatus" ADD CONSTRAINT "notificationUserStatus_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
