/*
  Warnings:

  - A unique constraint covering the columns `[app,status]` on the table `MediaCredential` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MediaCredential_app_status_key" ON "MediaCredential"("app", "status");
