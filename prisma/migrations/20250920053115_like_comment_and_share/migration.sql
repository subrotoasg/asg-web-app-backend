-- AlterTable
ALTER TABLE "classComments" ADD COLUMN     "parentId" UUID;

-- CreateTable
CREATE TABLE "classLikes" (
    "id" UUID NOT NULL,
    "classContentId" UUID,
    "cycleContentId" UUID,
    "studentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classLikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classNotes" (
    "id" UUID NOT NULL,
    "classContentId" UUID,
    "cycleContentId" UUID,
    "studentId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classNotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_id_key" ON "classLikes"("id");

-- CreateIndex
CREATE UNIQUE INDEX "classLikes_classContentId_studentId_key" ON "classLikes"("classContentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "classNotes_id_key" ON "classNotes"("id");

-- AddForeignKey
ALTER TABLE "classComments" ADD CONSTRAINT "classComments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "classComments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classLikes" ADD CONSTRAINT "classLikes_classContentId_fkey" FOREIGN KEY ("classContentId") REFERENCES "classContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classLikes" ADD CONSTRAINT "classLikes_cycleContentId_fkey" FOREIGN KEY ("cycleContentId") REFERENCES "cycleContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classLikes" ADD CONSTRAINT "classLikes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classNotes" ADD CONSTRAINT "classNotes_classContentId_fkey" FOREIGN KEY ("classContentId") REFERENCES "classContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classNotes" ADD CONSTRAINT "classNotes_cycleContentId_fkey" FOREIGN KEY ("cycleContentId") REFERENCES "cycleContents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classNotes" ADD CONSTRAINT "classNotes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
