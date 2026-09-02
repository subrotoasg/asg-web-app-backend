-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'solver';

-- CreateTable
CREATE TABLE "classComments" (
    "id" UUID NOT NULL,
    "classContentId" UUID,
    "cycleContentId" UUID,
    "studentId" UUID,
    "adminId" UUID,
    "comment" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classComments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quoras" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "OCRcontent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "studentId" UUID,
    "courseId" UUID,
    "embeddingRef" TEXT,
    "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quoraImages" (
    "id" UUID NOT NULL,
    "quoraId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quoraImages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classComments_id_key" ON "classComments"("id");

-- CreateIndex
CREATE UNIQUE INDEX "quoras_id_key" ON "quoras"("id");

-- CreateIndex
CREATE INDEX "quoras_studentId_status_idx" ON "quoras"("studentId", "status");

-- CreateIndex
CREATE INDEX "quoras_courseId_status_idx" ON "quoras"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quoraImages_id_key" ON "quoraImages"("id");

-- AddForeignKey
ALTER TABLE "classComments" ADD CONSTRAINT "classComments_classContentId_fkey" FOREIGN KEY ("classContentId") REFERENCES "classContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classComments" ADD CONSTRAINT "classComments_cycleContentId_fkey" FOREIGN KEY ("cycleContentId") REFERENCES "cycleContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classComments" ADD CONSTRAINT "classComments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classComments" ADD CONSTRAINT "classComments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoras" ADD CONSTRAINT "quoras_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoras" ADD CONSTRAINT "quoras_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoraImages" ADD CONSTRAINT "quoraImages_quoraId_fkey" FOREIGN KEY ("quoraId") REFERENCES "quoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
