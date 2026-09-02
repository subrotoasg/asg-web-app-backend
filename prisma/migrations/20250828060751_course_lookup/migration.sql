-- CreateTable
CREATE TABLE "courseLookup" (
    "id" UUID NOT NULL,
    "entityId" TEXT NOT NULL,
    "courseId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courseLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courseLookup_id_key" ON "courseLookup"("id");

-- CreateIndex
CREATE UNIQUE INDEX "courseLookup_entityId_key" ON "courseLookup"("entityId");

-- AddForeignKey
ALTER TABLE "courseLookup" ADD CONSTRAINT "courseLookup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
