-- CreateTable
CREATE TABLE "answerComments" (
    "id" UUID NOT NULL,
    "answerId" UUID,
    "studentId" UUID,
    "solverId" UUID,
    "comments" TEXT,
    "commentFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answerComments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "answerComments" ADD CONSTRAINT "answerComments_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answerComments" ADD CONSTRAINT "answerComments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answerComments" ADD CONSTRAINT "answerComments_solverId_fkey" FOREIGN KEY ("solverId") REFERENCES "solvers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
