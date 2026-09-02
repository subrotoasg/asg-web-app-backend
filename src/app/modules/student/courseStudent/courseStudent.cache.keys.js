import crypto from "node:crypto";
import { buildRedisKey } from "../../../../lib/redis/index.js";

function hashQuery(query) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(query))
    .digest("hex")
    .slice(0, 16);
}

export const MyCoursesCacheKeys = {
  studentVersion(studentId) {
    return buildRedisKey(
      "cache",
      "student-my-courses",
      "v1",
      "version",
      studentId,
    );
  },

  list({ studentId, scope, query, studentVersion, courseVersion }) {
    return buildRedisKey(
      "cache",
      "student-my-courses",
      "v1",
      "list",
      studentId,
      scope,
      hashQuery(query),
      `sv${studentVersion}`,
      `cv${courseVersion}`,
    );
  },
};
