-- CreateTable
CREATE TABLE "event" (
    "id" UUID NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metaData" JSONB,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);
