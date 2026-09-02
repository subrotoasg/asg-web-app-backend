-- CreateTable
CREATE TABLE "libApi" (
    "id" UUID NOT NULL,
    "libraryId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,

    CONSTRAINT "libApi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "libApi_id_key" ON "libApi"("id");

-- CreateIndex
CREATE UNIQUE INDEX "libApi_libraryId_key" ON "libApi"("libraryId");
