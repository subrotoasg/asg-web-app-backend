import {
  getOrLoadStrictCache,
  redisCacheConnection,
} from "../../../../lib/redis/index.js";
import { CourseCatalogCacheKeys } from "./courses.cache.keys.js";

export async function getCachedCourseCatalog({
  hostScope,
  platformScope,
  query,
  loader,
}) {
  try {
    const version =
      (await redisCacheConnection.get(CourseCatalogCacheKeys.version())) || "0";

    return getOrLoadStrictCache({
      key: CourseCatalogCacheKeys.list({
        hostScope,
        platformScope,
        query,
        version,
      }),
      loader,
      freshTtlMs: 30_000,
      lockTtlMs: 10_000,
      waitForFillMs: 7_000,
      jitterRatio: 0.15,
    });
  } catch (error) {
    console.error("[course-catalog-cache] read failed:", error.message);
    return loader();
  }
}

export async function bumpCourseCatalogVersion() {
  try {
    await redisCacheConnection.incr(CourseCatalogCacheKeys.version());
  } catch (error) {
    console.error("[course-catalog-cache] invalidation failed:", error.message);
  }
}
