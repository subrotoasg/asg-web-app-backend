-- CreateTable
CREATE TABLE "grandCelebrationAuths" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photo" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grandCelebrationAuths_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grandCelebrationAuths_email_key" ON "grandCelebrationAuths"("email");

-- CreateIndex
CREATE UNIQUE INDEX "grandCelebrationAuths_phone_key" ON "grandCelebrationAuths"("phone");
