-- CreateTable
CREATE TABLE "pushNotifications" (
    "id" UUID NOT NULL,
    "studentId" UUID,
    "adminId" UUID,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pushNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pushNotifications_token_key" ON "pushNotifications"("token");

-- CreateIndex
CREATE INDEX "pushNotifications_studentId_isValid_idx" ON "pushNotifications"("studentId", "isValid");

-- CreateIndex
CREATE INDEX "pushNotifications_adminId_isValid_idx" ON "pushNotifications"("adminId", "isValid");

-- AddForeignKey
ALTER TABLE "pushNotifications" ADD CONSTRAINT "pushNotifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushNotifications" ADD CONSTRAINT "pushNotifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
