-- CreateTable
CREATE TABLE "daily_ayah" (
    "date" DATE NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "ayahKey" TEXT NOT NULL,
    "occasionTags" TEXT[],
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_ayah_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "daily_ayah_ayahKey_idx" ON "daily_ayah"("ayahKey");
