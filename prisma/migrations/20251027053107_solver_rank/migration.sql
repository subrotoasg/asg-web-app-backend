-- CreateTable
CREATE TABLE "solverRanks" (
    "id" UUID NOT NULL,
    "rank" TEXT NOT NULL,
    "minCredit" INTEGER NOT NULL DEFAULT 0,
    "rankColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solverRanks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solverRanks_id_key" ON "solverRanks"("id");
