/*
  Warnings:

  - The `banned_by_bot` column on the `studentRestriction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "studentRestriction" DROP COLUMN "banned_by_bot",
ADD COLUMN     "banned_by_bot" BOOLEAN NOT NULL DEFAULT false;
