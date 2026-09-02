-- CreateTable
CREATE TABLE "otpAttempts" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otpAttempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "otpAttempts_id_key" ON "otpAttempts"("id");
