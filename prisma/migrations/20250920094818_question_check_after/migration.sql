/*
  Warnings:

  - You are about to drop the `solver` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "solver" DROP CONSTRAINT "solver_superAdminId_fkey";

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "remarks" TEXT;

-- DropTable
DROP TABLE "solver";

-- CreateTable
CREATE TABLE "creditModel" (
    "id" UUID NOT NULL,
    "perQuoraCredit" INTEGER NOT NULL DEFAULT 1,
    "asgshop" INTEGER NOT NULL DEFAULT 0,
    "solver" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creditModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solvers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "role" "Role" DEFAULT 'solver',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "lifeTimeCredit" INTEGER NOT NULL DEFAULT 0,
    "availableCredit" INTEGER NOT NULL DEFAULT 0,
    "totalSolved" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "refreshToken" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "superAdminId" UUID,
    "adminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courseQuoraDailyLimits" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courseQuoraDailyLimits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "quoraId" UUID NOT NULL,
    "solverId" UUID,
    "studentId" UUID,
    "content" TEXT,
    "answerFile" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creditModel_id_key" ON "creditModel"("id");

-- CreateIndex
CREATE UNIQUE INDEX "solvers_id_key" ON "solvers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "solvers_email_key" ON "solvers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "solvers_phone_key" ON "solvers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "courseQuoraDailyLimits_id_key" ON "courseQuoraDailyLimits"("id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_id_key" ON "answers"("id");

-- CreateIndex
CREATE INDEX "answers_quoraId_idx" ON "answers"("quoraId");

-- CreateIndex
CREATE INDEX "answers_solverId_idx" ON "answers"("solverId");

-- CreateIndex
CREATE INDEX "answers_studentId_idx" ON "answers"("studentId");

-- AddForeignKey
ALTER TABLE "solvers" ADD CONSTRAINT "solvers_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courseQuoraDailyLimits" ADD CONSTRAINT "courseQuoraDailyLimits_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_quoraId_fkey" FOREIGN KEY ("quoraId") REFERENCES "quoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_solverId_fkey" FOREIGN KEY ("solverId") REFERENCES "solvers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
