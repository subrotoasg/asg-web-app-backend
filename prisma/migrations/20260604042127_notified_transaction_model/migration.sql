-- CreateTable
CREATE TABLE "notifiedTransactions" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "uid" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "HSC" TEXT,
    "institution" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "gateway" TEXT,
    "amount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifiedTransactions_pkey" PRIMARY KEY ("id")
);
