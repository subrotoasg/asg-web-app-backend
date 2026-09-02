-- CreateTable
CREATE TABLE "courseStudents" (
    "courseId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "accessCode" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courseStudents_pkey" PRIMARY KEY ("courseId","studentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "courseStudents_accessCode_key" ON "courseStudents"("accessCode");
