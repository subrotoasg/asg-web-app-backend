import { buildRedisKey, RedisNamespace } from "../../lib/redis/index.js";

const CACHE_VERSION = "v1";

export const BunnyCacheKeys = {
  library(libraryId) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.BUNNY,
      CACHE_VERSION,
      "library",
      libraryId,
    );
  },

  content(videoId) {
    return buildRedisKey(
      RedisNamespace.CACHE,
      RedisNamespace.BUNNY,
      CACHE_VERSION,
      "content",
      videoId,
    );
  },
};
