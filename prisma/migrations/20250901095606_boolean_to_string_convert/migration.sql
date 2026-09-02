-- AlterTable
ALTER TABLE "student" ALTER COLUMN "universityChance" DROP NOT NULL,
ALTER COLUMN "universityChance" SET DEFAULT 'No',
ALTER COLUMN "universityChance" SET DATA TYPE TEXT;
