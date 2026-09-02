-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'INVOICED', 'PAID', 'OVERDUE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CalculationMethod" AS ENUM ('MANUAL', 'AUTOMATIC', 'SYSTEM_GENERATED');

-- CreateTable
CREATE TABLE "service_usage_logs" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "offeringId" UUID,
    "priceId" UUID NOT NULL,
    "priceType" "PriceType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "ratePerUnit" DECIMAL(65,10) NOT NULL,
    "totalAmount" DECIMAL(65,10) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "usageDate" TIMESTAMP(3) NOT NULL,
    "billingMonth" INTEGER NOT NULL,
    "billingYear" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "status" "UsageStatus" NOT NULL DEFAULT 'ACTIVE',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" UUID,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "verifiedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "courseServiceUsageSummaryId" UUID,

    CONSTRAINT "service_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_service_usage_summaries" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "offeringId" UUID,
    "billingYear" INTEGER NOT NULL,
    "billingMonth" INTEGER NOT NULL,
    "totalQuantity" DOUBLE PRECISION NOT NULL,
    "totalAmount" DECIMAL(65,10) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "hourlyUsage" DOUBLE PRECISION,
    "storageUsage" DOUBLE PRECISION,
    "studentCount" INTEGER,
    "classCount" INTEGER,
    "apiCalls" INTEGER,
    "status" "BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "calculationMethod" "CalculationMethod" NOT NULL DEFAULT 'SYSTEM_GENERATED',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminMonthlyBillId" UUID,

    CONSTRAINT "course_service_usage_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_monthly_bills" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "billingYear" INTEGER NOT NULL,
    "billingMonth" INTEGER NOT NULL,
    "subtotal" DECIMAL(65,10) NOT NULL,
    "discount" DECIMAL(65,10) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,10) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,10) NOT NULL,
    "paidAmount" DECIMAL(65,10) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(65,10) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "courseBreakdown" JSONB NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "status" "BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_monthly_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_usage_logs_adminId_billingYear_billingMonth_idx" ON "service_usage_logs"("adminId", "billingYear", "billingMonth");

-- CreateIndex
CREATE INDEX "service_usage_logs_courseId_billingYear_billingMonth_idx" ON "service_usage_logs"("courseId", "billingYear", "billingMonth");

-- CreateIndex
CREATE INDEX "service_usage_logs_serviceId_idx" ON "service_usage_logs"("serviceId");

-- CreateIndex
CREATE INDEX "service_usage_logs_status_idx" ON "service_usage_logs"("status");

-- CreateIndex
CREATE INDEX "service_usage_logs_isInvoiced_idx" ON "service_usage_logs"("isInvoiced");

-- CreateIndex
CREATE UNIQUE INDEX "service_usage_logs_courseId_adminId_serviceId_usageDate_ref_key" ON "service_usage_logs"("courseId", "adminId", "serviceId", "usageDate", "referenceId");

-- CreateIndex
CREATE INDEX "course_service_usage_summaries_adminId_status_idx" ON "course_service_usage_summaries"("adminId", "status");

-- CreateIndex
CREATE INDEX "course_service_usage_summaries_billingYear_billingMonth_idx" ON "course_service_usage_summaries"("billingYear", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "course_service_usage_summaries_courseId_adminId_serviceId_b_key" ON "course_service_usage_summaries"("courseId", "adminId", "serviceId", "billingYear", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "admin_monthly_bills_invoiceNumber_key" ON "admin_monthly_bills"("invoiceNumber");

-- CreateIndex
CREATE INDEX "admin_monthly_bills_status_idx" ON "admin_monthly_bills"("status");

-- CreateIndex
CREATE INDEX "admin_monthly_bills_dueDate_idx" ON "admin_monthly_bills"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "admin_monthly_bills_adminId_billingYear_billingMonth_key" ON "admin_monthly_bills"("adminId", "billingYear", "billingMonth");

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "add_on_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_admin_service_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "course_admin_service_offering_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_usage_logs" ADD CONSTRAINT "service_usage_logs_courseServiceUsageSummaryId_fkey" FOREIGN KEY ("courseServiceUsageSummaryId") REFERENCES "course_service_usage_summaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_service_usage_summaries" ADD CONSTRAINT "course_service_usage_summaries_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_service_usage_summaries" ADD CONSTRAINT "course_service_usage_summaries_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_service_usage_summaries" ADD CONSTRAINT "course_service_usage_summaries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "add_on_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_service_usage_summaries" ADD CONSTRAINT "course_service_usage_summaries_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_admin_service_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_service_usage_summaries" ADD CONSTRAINT "course_service_usage_summaries_adminMonthlyBillId_fkey" FOREIGN KEY ("adminMonthlyBillId") REFERENCES "admin_monthly_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_monthly_bills" ADD CONSTRAINT "admin_monthly_bills_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
