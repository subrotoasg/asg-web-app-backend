/*
  Warnings:

  - A unique constraint covering the columns `[classContentId,studentId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cycleContentId,studentId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[classContentId,adminId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cycleContentId,adminId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "classLikes_classContentId_cycleContentId_adminId_key";

-- DropIndex
DROP INDEX "classLikes_classContentId_cycleContentId_studentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_classContentId_studentId_key" ON "classLikes"("classContentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_cycleContentId_studentId_key" ON "classLikes"("cycleContentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_classContentId_adminId_key" ON "classLikes"("classContentId", "adminId");

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_cycleContentId_adminId_key" ON "classLikes"("cycleContentId", "adminId");
