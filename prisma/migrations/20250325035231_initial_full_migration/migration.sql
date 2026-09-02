/*
  Warnings:

  - You are about to drop the column `cycle` on the `courses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `admin` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_superAdminId_fkey";

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "cycle",
ADD COLUMN     "cycleAvailable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "superAdminId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "chapter" TEXT,
    "chapterName" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classContent" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "classTitle" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courseAdmin" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courseAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "adminId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleSubject" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleSubjectChapter" (
    "id" UUID NOT NULL,
    "cycleSubjectId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleSubjectChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleContent" (
    "id" UUID NOT NULL,
    "cycleSubjectChapterId" UUID NOT NULL,
    "classTitle" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_id_key" ON "subjects"("id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_title_key" ON "subjects"("title");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_id_key" ON "chapter"("id");

-- CreateIndex
CREATE UNIQUE INDEX "classContent_id_key" ON "classContent"("id");

-- CreateIndex
CREATE UNIQUE INDEX "courseAdmin_id_key" ON "courseAdmin"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_id_key" ON "cycle"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_productId_key" ON "cycle"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cycleSubject_id_key" ON "cycleSubject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycleSubjectChapter_id_key" ON "cycleSubjectChapter"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycleContent_id_key" ON "cycleContent"("id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_id_key" ON "admin"("id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classContent" ADD CONSTRAINT "classContent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmin" ADD CONSTRAINT "courseAdmin_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmin" ADD CONSTRAINT "courseAdmin_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle" ADD CONSTRAINT "cycle_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle" ADD CONSTRAINT "cycle_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubject" ADD CONSTRAINT "cycleSubject_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubject" ADD CONSTRAINT "cycleSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapter" ADD CONSTRAINT "cycleSubjectChapter_cycleSubjectId_fkey" FOREIGN KEY ("cycleSubjectId") REFERENCES "cycleSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapter" ADD CONSTRAINT "cycleSubjectChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleContent" ADD CONSTRAINT "cycleContent_cycleSubjectChapterId_fkey" FOREIGN KEY ("cycleSubjectChapterId") REFERENCES "cycleSubjectChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
