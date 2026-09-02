/*
  Warnings:

  - A unique constraint covering the columns `[classContentId,studentId]` on the table `classNotes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cycleContentId,studentId]` on the table `classNotes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "classNotes_classContentId_studentId_key" ON "classNotes"("classContentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "classNotes_cycleContentId_studentId_key" ON "classNotes"("cycleContentId", "studentId");
