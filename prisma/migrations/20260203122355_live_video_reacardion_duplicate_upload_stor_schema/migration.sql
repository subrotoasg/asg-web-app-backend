-- CreateTable
CREATE TABLE "RecordingIngest" (
    "id" UUID NOT NULL,
    "videoId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "partName" TEXT,
    "mp4Url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "bunnyVideoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingIngest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordingIngest_videoId_sessionId_mp4Url_partName_key" ON "RecordingIngest"("videoId", "sessionId", "mp4Url", "partName");
