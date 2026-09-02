/*
  Warnings:

  - A unique constraint covering the columns `[level]` on the table `IssuePriority` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "IssuePriority_level_key" ON "IssuePriority"("level");
