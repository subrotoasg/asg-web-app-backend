-- CreateTable
CREATE TABLE "issueTag" (
    "id" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "adminId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issueTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuePriority" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuePriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueTrack" (
    "id" UUID NOT NULL,
    "priorityId" UUID NOT NULL,
    "issueTagId" UUID NOT NULL,
    "adminId" UUID,
    "ip" TEXT,
    "issueTitle" TEXT,
    "issueDescription" TEXT,
    "images" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "solverId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "solvedAt" TIMESTAMP(3),

    CONSTRAINT "IssueTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issueTag_tag_key" ON "issueTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "IssuePriority_name_key" ON "IssuePriority"("name");

-- CreateIndex
CREATE INDEX "IssuePriority_level_idx" ON "IssuePriority"("level");

-- CreateIndex
CREATE INDEX "IssueTrack_priorityId_idx" ON "IssueTrack"("priorityId");

-- CreateIndex
CREATE INDEX "IssueTrack_adminId_idx" ON "IssueTrack"("adminId");

-- CreateIndex
CREATE INDEX "IssueTrack_solverId_idx" ON "IssueTrack"("solverId");

-- CreateIndex
CREATE INDEX "IssueTrack_status_idx" ON "IssueTrack"("status");

-- CreateIndex
CREATE INDEX "IssueTrack_createdAt_idx" ON "IssueTrack"("createdAt");

-- CreateIndex
CREATE INDEX "IssueTrack_solvedAt_idx" ON "IssueTrack"("solvedAt");

-- CreateIndex
CREATE INDEX "IssueTrack_adminId_status_idx" ON "IssueTrack"("adminId", "status");

-- CreateIndex
CREATE INDEX "IssueTrack_solverId_status_idx" ON "IssueTrack"("solverId", "status");

-- AddForeignKey
ALTER TABLE "issueTag" ADD CONSTRAINT "issueTag_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTrack" ADD CONSTRAINT "IssueTrack_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "IssuePriority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTrack" ADD CONSTRAINT "IssueTrack_issueTagId_fkey" FOREIGN KEY ("issueTagId") REFERENCES "issueTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTrack" ADD CONSTRAINT "IssueTrack_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTrack" ADD CONSTRAINT "IssueTrack_solverId_fkey" FOREIGN KEY ("solverId") REFERENCES "superAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
