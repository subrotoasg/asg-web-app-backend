-- AlterTable
ALTER TABLE "liveClasses" ADD COLUMN     "extraInfo" JSONB,
ADD COLUMN     "hls" TEXT,
ADD COLUMN     "hlsDirect" TEXT,
ADD COLUMN     "rtmp" TEXT,
ADD COLUMN     "webrtc" TEXT;
