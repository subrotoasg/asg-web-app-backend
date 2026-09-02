-- CreateTable
CREATE TABLE "studentAuthLog" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "hostName" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "hoppCount" INTEGER,
    "lastLogedIn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studentAuthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studentAuthLog_id_key" ON "studentAuthLog"("id");

-- AddForeignKey
ALTER TABLE "studentAuthLog" ADD CONSTRAINT "studentAuthLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
