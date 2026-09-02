/*
  Warnings:

  - Added the required column `userType` to the `pushNotifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pushNotifications" ADD COLUMN     "userType" TEXT NOT NULL;
