/*
  Warnings:

  - You are about to drop the column `email` on the `grandCelebrationAuths` table. All the data in the column will be lost.
  - You are about to drop the column `isVerifyEmail` on the `grandCelebrationAuths` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `grandCelebrationAuths` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."grandCelebrationAuths_email_key";

-- AlterTable
ALTER TABLE "grandCelebrationAuths" DROP COLUMN "email",
DROP COLUMN "isVerifyEmail",
DROP COLUMN "name";
