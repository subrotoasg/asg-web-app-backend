-- AlterTable
ALTER TABLE "featured" ADD COLUMN     "affiliateProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "productId" TEXT;
