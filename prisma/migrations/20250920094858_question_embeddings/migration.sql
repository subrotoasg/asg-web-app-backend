-- CreateTable
CREATE TABLE "questionEmbeddings" (
    "id" UUID NOT NULL,
    "quoraId" UUID NOT NULL,
    "embedding" vector(786),
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionEmbeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionEmbeddings_id_key" ON "questionEmbeddings"("id");

-- AddForeignKey
ALTER TABLE "questionEmbeddings" ADD CONSTRAINT "questionEmbeddings_quoraId_fkey" FOREIGN KEY ("quoraId") REFERENCES "quoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
