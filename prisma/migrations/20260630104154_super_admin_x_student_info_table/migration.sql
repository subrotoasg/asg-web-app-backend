-- CreateTable
CREATE TABLE "superAdminXStudentInfo" (
    "id" UUID NOT NULL,
    "superAdminId" UUID,
    "courseOrCycleId" TEXT,
    "lastDownloadTime" TIMESTAMP(3),

    CONSTRAINT "superAdminXStudentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "superAdminXStudentInfo_id_key" ON "superAdminXStudentInfo"("id");

-- CreateIndex
CREATE INDEX "superAdminXStudentInfo_superAdminId_courseOrCycleId_idx" ON "superAdminXStudentInfo"("superAdminId", "courseOrCycleId");

-- AddForeignKey
ALTER TABLE "superAdminXStudentInfo" ADD CONSTRAINT "superAdminXStudentInfo_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
