/*
  Warnings:

  - You are about to drop the column `minCredit` on the `solverRanks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[solverId]` on the table `solverRanks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "solverRanks" DROP COLUMN "minCredit",
ADD COLUMN     "minSolved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solverId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "solverRanks_solverId_key" ON "solverRanks"("solverId");

-- AddForeignKey
ALTER TABLE "solverRanks" ADD CONSTRAINT "solverRanks_solverId_fkey" FOREIGN KEY ("solverId") REFERENCES "solvers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
