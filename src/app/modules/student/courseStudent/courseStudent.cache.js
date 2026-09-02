import {
  getOrLoadStrictCache,
  redisCacheConnection,
} from "../../../../lib/redis/index.js";
import { CourseCatalogCacheKeys } from "../../superAdmin/courses/courses.cache.keys.js";
import { MyCoursesCacheKeys } from "./courseStudent.cache.keys.js";

export async function getCachedMyCourses({ studentId, scope, query, loader }) {
  try {
    const [studentVersion, courseVersion] = await redisCacheConnection.mget(
      MyCoursesCacheKeys.studentVersion(studentId),
      CourseCatalogCacheKeys.version(),
    );

    return getOrLoadStrictCache({
      key: MyCoursesCacheKeys.list({
        studentId,
        scope,
        query,
        studentVersion: studentVersion || "0",
        courseVersion: courseVersion || "0",
      }),
      loader,
      freshTtlMs: 30_000,
      lockTtlMs: 10_000,
      waitForFillMs: 7_000,
      jitterRatio: 0.15,
    });
  } catch (error) {
    console.error("[my-courses-cache] read failed:", error.message);
    return loader();
  }
}

export async function bumpStudentMyCoursesVersion(studentId) {
  if (!studentId) return;

  try {
    const key = MyCoursesCacheKeys.studentVersion(studentId);
    const pipeline = redisCacheConnection.pipeline();

    pipeline.incr(key);
    pipeline.expire(key, 3600);

    await pipeline.exec();
  } catch (error) {
    console.error("[my-courses-cache] invalidation failed:", error.message);
  }
}
