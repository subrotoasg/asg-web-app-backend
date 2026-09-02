-- CreateTable
CREATE TABLE "activityLogs" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activityLogs_pkey" PRIMARY KEY ("id")
);
