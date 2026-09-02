-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "affiliateProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
