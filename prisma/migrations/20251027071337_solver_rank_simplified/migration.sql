/*
  Warnings:

  - You are about to drop the `solverRanks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."solverRanks" DROP CONSTRAINT "solverRanks_solverId_fkey";

-- AlterTable
ALTER TABLE "solvers" ADD COLUMN     "rank" TEXT DEFAULT 'unranked';

-- DropTable
DROP TABLE "public"."solverRanks";
