-- CreateTable
CREATE TABLE "extraDatas" (
    "id" UUID NOT NULL,
    "slug" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraDatas_pkey" PRIMARY KEY ("id")
);
