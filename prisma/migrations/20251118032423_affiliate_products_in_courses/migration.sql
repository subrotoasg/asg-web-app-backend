-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "affiliateProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
