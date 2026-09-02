-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "browserName" TEXT,
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

-- AlterTable
ALTER TABLE "solvers" ADD COLUMN     "browserName" TEXT,
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

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "browserName" TEXT,
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

-- AlterTable
ALTER TABLE "superAdmin" ADD COLUMN     "browserName" TEXT,
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
CREATE INDEX "admins_email_phone_idx" ON "admins"("email", "phone");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_phone_idx" ON "admins"("phone");

-- CreateIndex
CREATE INDEX "courses_productName_productFullName_idx" ON "courses"("productName", "productFullName");

-- CreateIndex
CREATE INDEX "solvers_email_phone_idx" ON "solvers"("email", "phone");

-- CreateIndex
CREATE INDEX "solvers_email_idx" ON "solvers"("email");

-- CreateIndex
CREATE INDEX "solvers_phone_idx" ON "solvers"("phone");

-- CreateIndex
CREATE INDEX "student_email_phone_idx" ON "student"("email", "phone");

-- CreateIndex
CREATE INDEX "student_email_idx" ON "student"("email");

-- CreateIndex
CREATE INDEX "student_phone_idx" ON "student"("phone");

-- CreateIndex
CREATE INDEX "student_status_idx" ON "student"("status");

-- CreateIndex
CREATE INDEX "superAdmin_email_phone_idx" ON "superAdmin"("email", "phone");

-- CreateIndex
CREATE INDEX "superAdmin_email_idx" ON "superAdmin"("email");

-- CreateIndex
CREATE INDEX "superAdmin_phone_idx" ON "superAdmin"("phone");
