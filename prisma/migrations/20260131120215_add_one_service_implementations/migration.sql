-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('ONE_TIME', 'MONTHLY', 'YEARLY', 'PER_STUDENT', 'PER_CLASS', 'CUSTOM');

-- CreateTable
CREATE TABLE "add_on_services" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_on_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_default_services" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "course_default_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_default_service_prices" (
    "id" UUID NOT NULL,
    "courseDefaultId" UUID NOT NULL,
    "type" "PriceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_default_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_admin_service_offerings" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "status" "OfferingStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "course_admin_service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_admin_service_offering_prices" (
    "id" UUID NOT NULL,
    "offeringId" UUID NOT NULL,
    "type" "PriceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "course_admin_service_offering_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_admin_service_offering_selections" (
    "id" UUID NOT NULL,
    "offeringId" UUID NOT NULL,
    "selectedPriceId" UUID NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_admin_service_offering_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "add_on_services_code_key" ON "add_on_services"("code");

-- CreateIndex
CREATE INDEX "course_default_services_courseId_isActive_idx" ON "course_default_services"("courseId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "course_default_services_courseId_serviceId_key" ON "course_default_services"("courseId", "serviceId");

-- CreateIndex
CREATE INDEX "course_default_service_prices_courseDefaultId_type_isActive_idx" ON "course_default_service_prices"("courseDefaultId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "course_default_service_prices_courseDefaultId_type_minQty_m_key" ON "course_default_service_prices"("courseDefaultId", "type", "minQty", "maxQty");

-- CreateIndex
CREATE UNIQUE INDEX "course_admin_service_offerings_courseId_adminId_serviceId_key" ON "course_admin_service_offerings"("courseId", "adminId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "course_admin_service_offering_prices_offeringId_type_minQty_key" ON "course_admin_service_offering_prices"("offeringId", "type", "minQty", "maxQty");

-- CreateIndex
CREATE UNIQUE INDEX "course_admin_service_offering_selections_offeringId_key" ON "course_admin_service_offering_selections"("offeringId");

-- AddForeignKey
ALTER TABLE "course_default_services" ADD CONSTRAINT "course_default_services_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_default_services" ADD CONSTRAINT "course_default_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "add_on_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_default_service_prices" ADD CONSTRAINT "course_default_service_prices_courseDefaultId_fkey" FOREIGN KEY ("courseDefaultId") REFERENCES "course_default_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_admin_service_offerings" ADD CONSTRAINT "course_admin_service_offerings_courseId_adminId_fkey" FOREIGN KEY ("courseId", "adminId") REFERENCES "courseAdmins"("courseId", "adminId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_admin_service_offerings" ADD CONSTRAINT "course_admin_service_offerings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "add_on_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_admin_service_offering_prices" ADD CONSTRAINT "course_admin_service_offering_prices_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_admin_service_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_admin_service_offering_selections" ADD CONSTRAINT "course_admin_service_offering_selections_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "course_admin_service_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_admin_service_offering_selections" ADD CONSTRAINT "course_admin_service_offering_selections_selectedPriceId_fkey" FOREIGN KEY ("selectedPriceId") REFERENCES "course_admin_service_offering_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
