-- CreateIndex
CREATE INDEX "pushNotifications_platform_isValid_idx" ON "pushNotifications"("platform", "isValid");

-- CreateIndex
CREATE INDEX "pushNotifications_userType_isValid_idx" ON "pushNotifications"("userType", "isValid");
