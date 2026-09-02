export const PushMessagingCacheKeys = {
  studentScope(studentId) {
    return `cache:push:v1:student-scope:${studentId}`;
  },

  adminScope(adminId) {
    return `cache:push:v1:admin-scope:${adminId}`;
  },

  userTokens(userType, userId) {
    return `cache:push:v1:tokens:${userType}:${userId}`;
  },
  adminListRevision() {
    return "cache:push:v1:rev:admin-list";
  },

  globalFeedRevision() {
    return "cache:push:v1:rev:global-feed";
  },

  userFeedRevision(userType, userId) {
    return `cache:push:v1:rev:user-feed:${userType}:${userId}`;
  },

  adminNotificationList({ revision, queryHash }) {
    return [
      "cache",
      "push",
      "v1",
      "admin-notifications",
      revision,
      queryHash,
    ]?.join(":");
  },

  userNotificationList({
    userType,
    userId,
    hostHash,
    queryHash,
    globalRevision,
    userRevision,
  }) {
    return [
      "cache",
      "push",
      "v1",
      "user-notifications",
      userType,
      userId,
      hostHash,
      globalRevision,
      userRevision,
      queryHash,
    ]?.join(":");
  },
};
