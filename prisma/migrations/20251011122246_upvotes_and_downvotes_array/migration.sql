/*
  Warnings:

  - The `upvotes` column on the `answers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `downvotes` column on the `answers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "answers" DROP COLUMN "upvotes",
ADD COLUMN     "upvotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "downvotes",
ADD COLUMN     "downvotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
