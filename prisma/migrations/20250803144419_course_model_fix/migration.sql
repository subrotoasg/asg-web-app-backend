/*
  Warnings:

  - The `Platinum` column on the `courses` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "courses" DROP COLUMN "Platinum",
ADD COLUMN     "Platinum" INTEGER DEFAULT 0,
ALTER COLUMN "currency_amount" SET DEFAULT 0;
