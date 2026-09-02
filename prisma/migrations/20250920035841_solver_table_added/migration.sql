-- CreateTable
CREATE TABLE "solver" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "role" "Role" DEFAULT 'solver',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "superAdminId" UUID,
    "adminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solver_id_key" ON "solver"("id");

-- CreateIndex
CREATE UNIQUE INDEX "solver_email_key" ON "solver"("email");

-- CreateIndex
CREATE UNIQUE INDEX "solver_phone_key" ON "solver"("phone");

-- AddForeignKey
ALTER TABLE "solver" ADD CONSTRAINT "solver_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "superAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS vector;