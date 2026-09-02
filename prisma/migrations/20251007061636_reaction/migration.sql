/*
  Warnings:

  - A unique constraint covering the columns `[classContentId,cycleContentId,studentId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `classLikes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY');

-- DropIndex
DROP INDEX "classLikes_classContentId_studentId_key";

-- AlterTable
ALTER TABLE "classLikes" ADD COLUMN     "type" "ReactionType" NOT NULL;

-- CreateIndex
CREATE INDEX "admins_id_isDeleted_idx" ON "admins"("id", "isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_classContentId_cycleContentId_studentId_key" ON "classLikes"("classContentId", "cycleContentId", "studentId");
