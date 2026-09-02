export const AuthUserCacheKeys = {
  user(role, userId) {
    return `cache:auth:user:v1:${role}:${userId}`;
  },
};
