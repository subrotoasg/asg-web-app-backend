-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "archieveCycleId" UUID,
ADD COLUMN     "markAsArchieve" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "cycleStudents" (
    "cycleId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "accessCode" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "enrollDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleStudents_pkey" PRIMARY KEY ("cycleId","studentId")
);

-- CreateTable
CREATE TABLE "cycleLookup" (
    "id" UUID NOT NULL,
    "entityId" TEXT NOT NULL,
    "cycleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cycleStudents_accessCode_key" ON "cycleStudents"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "cycleLookup_id_key" ON "cycleLookup"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycleLookup_entityId_key" ON "cycleLookup"("entityId");

-- AddForeignKey
ALTER TABLE "cycleStudents" ADD CONSTRAINT "cycleStudents_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleStudents" ADD CONSTRAINT "cycleStudents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleLookup" ADD CONSTRAINT "cycleLookup_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
