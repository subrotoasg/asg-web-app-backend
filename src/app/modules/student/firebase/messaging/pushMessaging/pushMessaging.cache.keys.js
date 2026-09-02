import crypto from "node:crypto";
import { buildRedisKey } from "../../../../../../lib/redis/index.js";

function hashQuery(query) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(query))
    .digest("hex")
    .slice(0, 16);
}

export const PushMessagingCacheKeys = {
  globalVersion() {
    return "cache:notification:v1:version:global";
  },

  userVersion(role, userId) {
    return buildRedisKey(
      "cache",
      "notification",
      "v1",
      "version",
      role,
      userId,
    );
  },

  list({ role, userId, hostScope, query, globalVersion, userVersion }) {
    return buildRedisKey(
      "cache",
      "notification",
      "v1",
      "list",
      role,
      userId,
      hostScope,
      hashQuery(query),
      `g${globalVersion}`,
      `u${userVersion}`,
    );
  },
};
