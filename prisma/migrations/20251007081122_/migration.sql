/*
  Warnings:

  - A unique constraint covering the columns `[classContentId,cycleContentId,adminId]` on the table `classLikes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "classLikes_classContentId_cycleContentId_adminId_key" ON "classLikes"("classContentId", "cycleContentId", "adminId");
