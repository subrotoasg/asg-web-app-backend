import { prisma } from "../../../../../constants/index.js";
import {
  getOrLoadCache,
  getOrLoadStrictCache,
  deleteCache,
  redisCacheConnection,
} from "../../../../lib/redis/index.js";
import { CourseCatalogCacheKeys } from "../../superAdmin/courses/courses.cache.keys.js";

import { LiveClassCacheKeys } from "./liveClass.cache.keys.js";

import {
  findCourseByCourseSubjectChapter,
  findCourseByCycleSubjectChapter,
} from "../../../middleware/handleCourseAuth.js";

export const LIVE_CLASS_LIST_CACHE_TTL_MS = 2 * 60 * 1000;

export async function getCachedLiveClassList({
  hostScope,
  query,
  timeBucket,
  loader,
}) {
  try {
    const [liveClassVersion, courseVersion] = await redisCacheConnection.mget(
      LiveClassCacheKeys.listVersion(),
      CourseCatalogCacheKeys.version(),
    );

    return getOrLoadStrictCache({
      key: LiveClassCacheKeys.list({
        hostScope,
        query,
        timeBucket,
        liveClassVersion: liveClassVersion || "0",
        courseVersion: courseVersion || "0",
      }),
      loader,
      freshTtlMs: LIVE_CLASS_LIST_CACHE_TTL_MS,
      lockTtlMs: 5_000,
      waitForFillMs: 3_000,
      jitterRatio: 0.1,
    });
  } catch (error) {
    console.error("[live-class-list-cache] read failed:", error.message);
    return loader();
  }
}

export async function bumpLiveClassListVersion() {
  try {
    await redisCacheConnection.incr(LiveClassCacheKeys.listVersion());
  } catch (error) {
    console.error(
      "[live-class-list-cache] invalidation failed:",
      error.message,
    );
  }
}

export async function getLiveClassJoinMeta(liveClassId) {
  return getOrLoadCache({
    key: LiveClassCacheKeys.joinMeta(liveClassId),
    loader: async () => {
      return prisma.liveClass.findFirst({
        where: {
          id: liveClassId,

          isDeleted: false,
        },

        select: {
          id: true,

          videoId: true,

          adminId: true,

          mediaServer: true,

          secondaryUrl: true,

          status: true,

          isFreeClass: true,

          freeClassUrl: true,

          courseSubjectChapterId: true,

          cycleSubjectChapterId: true,
          ingestType: true,
        },
      });
    },

    freshTtlMs: 30_000,

    staleTtlMs: 120_000,

    lockTtlMs: 10_000,

    waitForFillMs: 7000,

    jitterRatio: 0.15,
  });
}

export async function getStreamConfig(liveClass) {
  if (liveClass?.courseSubjectChapterId) {
    const chapterId = liveClass.courseSubjectChapterId;

    return getOrLoadCache({
      key: LiveClassCacheKeys.courseStream(chapterId),

      loader: async () => {
        const course = await findCourseByCourseSubjectChapter(chapterId);

        return {
          clientId: course?.clientId || process.env.CLIENT_ID,

          authKey: course?.authKey || process.env.AUTH_KEY,
        };
      },

      freshTtlMs: 60_000,

      staleTtlMs: 300_000,

      lockTtlMs: 10_000,

      jitterRatio: 0.15,
    });
  }

  if (liveClass?.cycleSubjectChapterId) {
    const chapterId = liveClass.cycleSubjectChapterId;

    return getOrLoadCache({
      key: LiveClassCacheKeys.cycleStream(chapterId),

      loader: async () => {
        const course = await findCourseByCycleSubjectChapter(chapterId);

        return {
          clientId: course?.clientId || process.env.CLIENT_ID,

          authKey: course?.authKey || process.env.AUTH_KEY,
        };
      },

      freshTtlMs: 60_000,

      staleTtlMs: 300_000,

      lockTtlMs: 10_000,

      jitterRatio: 0.15,
    });
  }

  return {
    clientId: process.env.CLIENT_ID,

    authKey: process.env.AUTH_KEY,
  };
}

export async function invalidateLiveClassCache(liveClassId) {
  const operations = [bumpLiveClassListVersion()];

  if (liveClassId) {
    operations.push(
      deleteCache(LiveClassCacheKeys.joinMeta(liveClassId)).catch((error) => {
        console.error(
          "[live-class-cache] join-meta invalidation failed:",
          error.message,
        );
      }),
    );
  }

  await Promise.all(operations);
}

export async function invalidateCourseStreamCache(chapterId) {
  await deleteCache(LiveClassCacheKeys.courseStream(chapterId));
}

export async function invalidateCycleStreamCache(chapterId) {
  await deleteCache(LiveClassCacheKeys.cycleStream(chapterId));
}
