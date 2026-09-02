import {
  getOrLoadStrictCache,
  redisCacheConnection,
} from "../../../../../../lib/redis/index.js";
import { PushMessagingCacheKeys } from "./pushMessaging.cache.keys.js";

export async function getCachedMyNotifications({
  role,
  userId,
  hostScope,
  query,
  loader,
}) {
  try {
    const globalKey = PushMessagingCacheKeys.globalVersion();
    const userKey = PushMessagingCacheKeys.userVersion(role, userId);
    const [globalVersion, userVersion] = await redisCacheConnection.mget(
      globalKey,
      userKey,
    );

    return getOrLoadStrictCache({
      key: PushMessagingCacheKeys.list({
        role,
        userId,
        hostScope,
        query,
        globalVersion: globalVersion || "0",
        userVersion: userVersion || "0",
      }),
      loader,
      freshTtlMs: 20_000,
      lockTtlMs: 5_000,
      waitForFillMs: 3_000,
      jitterRatio: 0.1,
    });
  } catch (error) {
    console.error("[notification-cache] read failed:", error.message);
    return loader();
  }
}

export async function bumpNotificationUserVersion(role, userId) {
  if (!role || !userId) {
    return;
  }

  try {
    const key = PushMessagingCacheKeys.userVersion(role, userId);
    const pipeline = redisCacheConnection.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 3600);
    await pipeline.exec();
  } catch (error) {
    console.error(
      "[notification-cache] user invalidation failed:",
      error.message,
    );
  }
}

export async function bumpNotificationGlobalVersion() {
  try {
    await redisCacheConnection.incr(PushMessagingCacheKeys.globalVersion());
  } catch (error) {
    console.error(
      "[notification-cache] global invalidation failed:",
      error.message,
    );
  }
}
