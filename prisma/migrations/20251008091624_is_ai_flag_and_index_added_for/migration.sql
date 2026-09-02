-- AlterTable
ALTER TABLE "answers" ADD COLUMN     "isAi" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "answers_isAi_idx" ON "answers"("isAi");
