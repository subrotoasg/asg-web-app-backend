/*
  Warnings:

  - Added the required column `HSC` to the `solvers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `University` to the `solvers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `UniversityId` to the `solvers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `solvers` table without a default value. This is not possible if the table is not empty.
  - Made the column `photo` on table `solvers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."answers_isAi_idx";

-- DropIndex
DROP INDEX "public"."answers_quoraId_idx";

-- DropIndex
DROP INDEX "public"."answers_solverId_idx";

-- DropIndex
DROP INDEX "public"."answers_studentId_idx";

-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "similarQuoras" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "solvers" ADD COLUMN     "HSC" TEXT NOT NULL,
ADD COLUMN     "UniAbbreviation" TEXT,
ADD COLUMN     "University" TEXT NOT NULL,
ADD COLUMN     "UniversityId" TEXT NOT NULL,
ADD COLUMN     "address" TEXT NOT NULL,
ALTER COLUMN "photo" SET NOT NULL;

-- CreateIndex
CREATE INDEX "answers_quoraId_solverId_idx" ON "answers"("quoraId", "solverId");

-- CreateIndex
CREATE INDEX "answers_quoraId_studentId_idx" ON "answers"("quoraId", "studentId");

-- CreateIndex
CREATE INDEX "answers_quoraId_isAi_idx" ON "answers"("quoraId", "isAi");
