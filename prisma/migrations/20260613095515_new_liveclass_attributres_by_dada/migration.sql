-- AlterTable
ALTER TABLE "liveClasses" ADD COLUMN     "customHlsUrl" TEXT,
ADD COLUMN     "ingestType" TEXT DEFAULT 'webrtc',
ADD COLUMN     "isPredefined" BOOLEAN DEFAULT false,
ADD COLUMN     "publicEmbed" BOOLEAN DEFAULT false,
ADD COLUMN     "rtmp_streamKey" TEXT,
ADD COLUMN     "rtmp_url" TEXT,
ADD COLUMN     "teacherButton" BOOLEAN DEFAULT true;
