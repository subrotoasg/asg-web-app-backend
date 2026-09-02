/*
  Warnings:

  - You are about to drop the `notice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `routine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "notice" DROP CONSTRAINT "notice_adminId_fkey";

-- DropForeignKey
ALTER TABLE "notice" DROP CONSTRAINT "notice_courseId_fkey";

-- DropForeignKey
ALTER TABLE "routine" DROP CONSTRAINT "routine_adminId_fkey";

-- DropForeignKey
ALTER TABLE "routine" DROP CONSTRAINT "routine_courseId_fkey";

-- AlterTable
ALTER TABLE "featured" ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3),
ADD COLUMN     "type" TEXT;

-- DropTable
DROP TABLE "notice";

-- DropTable
DROP TABLE "routine";

-- CreateTable
CREATE TABLE "noticeORroutine" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "url" TEXT,
    "type" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "adminId" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noticeORroutine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "noticeORroutine_id_key" ON "noticeORroutine"("id");

-- AddForeignKey
ALTER TABLE "noticeORroutine" ADD CONSTRAINT "noticeORroutine_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticeORroutine" ADD CONSTRAINT "noticeORroutine_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
