-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('FULL', 'COMMENT', 'REPLY', 'CHAT', 'LIVE_CLASS');

-- CreateTable
CREATE TABLE "studentRestriction" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "type" "RestrictionType" NOT NULL,
    "reason" TEXT,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannedUntil" TIMESTAMP(3),
    "bannedByAdminId" UUID,

    CONSTRAINT "studentRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studentRestriction_studentId_idx" ON "studentRestriction"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "studentRestriction_studentId_type_key" ON "studentRestriction"("studentId", "type");

-- AddForeignKey
ALTER TABLE "studentRestriction" ADD CONSTRAINT "studentRestriction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
