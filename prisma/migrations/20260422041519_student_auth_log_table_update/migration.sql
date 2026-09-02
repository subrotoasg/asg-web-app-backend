/*
  Warnings:

  - You are about to drop the column `browserName` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `browserVersion` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `cpuArchitecture` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `deviceModel` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `deviceType` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `deviceVendor` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `engineName` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `engineVersion` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `fp` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `osName` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `osVersion` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "student" DROP COLUMN "browserName",
DROP COLUMN "browserVersion",
DROP COLUMN "cpuArchitecture",
DROP COLUMN "deviceModel",
DROP COLUMN "deviceType",
DROP COLUMN "deviceVendor",
DROP COLUMN "engineName",
DROP COLUMN "engineVersion",
DROP COLUMN "fp",
DROP COLUMN "ip",
DROP COLUMN "osName",
DROP COLUMN "osVersion",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "studentAuthLog" ADD COLUMN     "browserName" TEXT,
ADD COLUMN     "browserVersion" TEXT,
ADD COLUMN     "cpuArchitecture" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "deviceVendor" TEXT,
ADD COLUMN     "engineName" TEXT,
ADD COLUMN     "engineVersion" TEXT,
ADD COLUMN     "fp" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "osName" TEXT,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "studentAuthLog_studentId_hostName_idx" ON "studentAuthLog"("studentId", "hostName");

-- CreateIndex
CREATE INDEX "studentAuthLog_studentId_idx" ON "studentAuthLog"("studentId");

-- CreateIndex
CREATE INDEX "studentAuthLog_hostName_idx" ON "studentAuthLog"("hostName");
