import crypto from "node:crypto";
import { buildRedisKey, RedisNamespace } from "../../../../lib/redis/index.js";

function hashQuery(query) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(query))
    .digest("hex")
    .slice(0, 16);
}

export const LiveClassCacheKeys = {
  listVersion() {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.LIVE_CLASS,
      "v1",
      "version",
      "list",
    );
  },

  list({ hostScope, query, timeBucket, liveClassVersion, courseVersion }) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.LIVE_CLASS,
      "v1",
      "list",
      hostScope,
      hashQuery(query),
      `t${timeBucket}`,
      `lv${liveClassVersion}`,
      `cv${courseVersion}`,
    );
  },

  joinMeta(liveClassId) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.LIVE_CLASS,
      "join-meta",
      liveClassId,
    );
  },

  courseStream(chapterId) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.COURSE,
      "stream",
      "course",
      chapterId,
    );
  },

  cycleStream(chapterId) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.COURSE,
      "stream",
      "cycle",
      chapterId,
    );
  },
};
