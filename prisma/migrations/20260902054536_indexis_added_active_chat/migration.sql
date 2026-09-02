-- CreateIndex
CREATE INDEX "activeChats_createdAt_idx" ON "activeChats"("createdAt");

-- CreateIndex
CREATE INDEX "activeChats_classContentId_messageCreatedAt_idx" ON "activeChats"("classContentId", "messageCreatedAt");

-- CreateIndex
CREATE INDEX "activeChats_cycleContentId_messageCreatedAt_idx" ON "activeChats"("cycleContentId", "messageCreatedAt");
