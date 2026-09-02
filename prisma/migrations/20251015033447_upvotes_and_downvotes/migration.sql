/*
  Warnings:

  - The `upvotes` column on the `answers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `downvotes` column on the `answers` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "answers" DROP COLUMN "upvotes",
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "downvotes",
ADD COLUMN     "downvotes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vote" (
    "id" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "voterId" UUID NOT NULL,
    "isUpvote" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vote_answerId_voterId_key" ON "vote"("answerId", "voterId");

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
