/*
  Warnings:

  - You are about to drop the `admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chapter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `classContent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courseAdmin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycleContent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycleSubject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycleSubjectChapter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "chapter" DROP CONSTRAINT "chapter_courseId_fkey";

-- DropForeignKey
ALTER TABLE "chapter" DROP CONSTRAINT "chapter_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "classContent" DROP CONSTRAINT "classContent_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "courseAdmin" DROP CONSTRAINT "courseAdmin_adminId_fkey";

-- DropForeignKey
ALTER TABLE "courseAdmin" DROP CONSTRAINT "courseAdmin_courseId_fkey";

-- DropForeignKey
ALTER TABLE "courseAdmin" DROP CONSTRAINT "courseAdmin_superAdminId_fkey";

-- DropForeignKey
ALTER TABLE "cycle" DROP CONSTRAINT "cycle_adminId_fkey";

-- DropForeignKey
ALTER TABLE "cycle" DROP CONSTRAINT "cycle_courseId_fkey";

-- DropForeignKey
ALTER TABLE "cycleContent" DROP CONSTRAINT "cycleContent_cycleSubjectChapterId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubject" DROP CONSTRAINT "cycleSubject_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubject" DROP CONSTRAINT "cycleSubject_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjectChapter" DROP CONSTRAINT "cycleSubjectChapter_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "cycleSubjectChapter" DROP CONSTRAINT "cycleSubjectChapter_cycleSubjectId_fkey";

-- DropIndex
DROP INDEX "subjects_title_key";

-- DropTable
DROP TABLE "admin";

-- DropTable
DROP TABLE "chapter";

-- DropTable
DROP TABLE "classContent";

-- DropTable
DROP TABLE "courseAdmin";

-- DropTable
DROP TABLE "cycle";

-- DropTable
DROP TABLE "cycleContent";

-- DropTable
DROP TABLE "cycleSubject";

-- DropTable
DROP TABLE "cycleSubjectChapter";

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "photo" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "superAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "chapter" TEXT,
    "chapterName" TEXT NOT NULL,
    "chapterImage" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classContents" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "classTitle" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbneil" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classContents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courseAdmins" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "superAdminId" UUID NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courseAdmins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "productId" TEXT NOT NULL,
    "adminId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "cycleImage" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleSubjects" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "cycleSubjectImage" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleSubjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleSubjectChapters" (
    "id" UUID NOT NULL,
    "cycleSubjectId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "cycleSubjectChapterImage" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleSubjectChapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycleContents" (
    "id" UUID NOT NULL,
    "cycleSubjectChapterId" UUID NOT NULL,
    "classTitle" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbneil" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycleContents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_id_key" ON "admins"("id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_phone_key" ON "admins"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_id_key" ON "chapters"("id");

-- CreateIndex
CREATE UNIQUE INDEX "classContents_id_key" ON "classContents"("id");

-- CreateIndex
CREATE UNIQUE INDEX "courseAdmins_id_key" ON "courseAdmins"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_id_key" ON "cycles"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_productId_key" ON "cycles"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cycleSubjects_id_key" ON "cycleSubjects"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycleSubjectChapters_id_key" ON "cycleSubjectChapters"("id");

-- CreateIndex
CREATE UNIQUE INDEX "cycleContents_id_key" ON "cycleContents"("id");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classContents" ADD CONSTRAINT "classContents_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmins" ADD CONSTRAINT "courseAdmins_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmins" ADD CONSTRAINT "courseAdmins_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseAdmins" ADD CONSTRAINT "courseAdmins_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjects" ADD CONSTRAINT "cycleSubjects_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjects" ADD CONSTRAINT "cycleSubjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapters" ADD CONSTRAINT "cycleSubjectChapters_cycleSubjectId_fkey" FOREIGN KEY ("cycleSubjectId") REFERENCES "cycleSubjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleSubjectChapters" ADD CONSTRAINT "cycleSubjectChapters_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycleContents" ADD CONSTRAINT "cycleContents_cycleSubjectChapterId_fkey" FOREIGN KEY ("cycleSubjectChapterId") REFERENCES "cycleSubjectChapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
