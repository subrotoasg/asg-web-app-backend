-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PriceType" ADD VALUE 'PER_COURSE';
ALTER TYPE "PriceType" ADD VALUE 'PER_MB';
ALTER TYPE "PriceType" ADD VALUE 'PER_GB';
ALTER TYPE "PriceType" ADD VALUE 'PER_TB';
ALTER TYPE "PriceType" ADD VALUE 'BANDWIDTH';
ALTER TYPE "PriceType" ADD VALUE 'PER_HOUR';
ALTER TYPE "PriceType" ADD VALUE 'PER_MINUTE';
ALTER TYPE "PriceType" ADD VALUE 'PER_API_CALL';
ALTER TYPE "PriceType" ADD VALUE 'PER_USER';

-- AlterTable
ALTER TABLE "course_admin_service_offering_prices" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,10);

-- AlterTable
ALTER TABLE "course_default_service_prices" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,10);
