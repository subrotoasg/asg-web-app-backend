-- CreateTable
CREATE TABLE "activeChats" (
    "id" UUID NOT NULL,
    "classContentId" UUID,
    "cycleContentId" UUID,
    "studentId" UUID,
    "adminId" UUID,
    "superAdminId" UUID,
    "message" TEXT NOT NULL,
    "messageCreatedAt" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activeChats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activeChats" ADD CONSTRAINT "activeChats_classContentId_fkey" FOREIGN KEY ("classContentId") REFERENCES "classContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activeChats" ADD CONSTRAINT "activeChats_cycleContentId_fkey" FOREIGN KEY ("cycleContentId") REFERENCES "cycleContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activeChats" ADD CONSTRAINT "activeChats_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activeChats" ADD CONSTRAINT "activeChats_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activeChats" ADD CONSTRAINT "activeChats_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
