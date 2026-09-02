-- CreateTable
CREATE TABLE "notificationLogs" (
    "id" UUID NOT NULL,
    "type" TEXT,
    "senderType" TEXT,
    "senderAdminId" UUID,
    "senderSuperAdminId" UUID,
    "receiverSingleStudentId" UUID,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificationLogs_receiverSingleStudentId_idx" ON "notificationLogs"("receiverSingleStudentId");

-- CreateIndex
CREATE INDEX "notificationLogs_senderAdminId_idx" ON "notificationLogs"("senderAdminId");

-- CreateIndex
CREATE INDEX "notificationLogs_senderSuperAdminId_idx" ON "notificationLogs"("senderSuperAdminId");

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_receiverSingleStudentId_fkey" FOREIGN KEY ("receiverSingleStudentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_senderSuperAdminId_fkey" FOREIGN KEY ("senderSuperAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationLogs" ADD CONSTRAINT "notificationLogs_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
