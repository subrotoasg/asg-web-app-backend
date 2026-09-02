import crypto from "node:crypto";
import { buildRedisKey } from "../../../../lib/redis/index.js";

function hashQuery(query) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(query))
    .digest("hex")
    .slice(0, 16);
}

export const CourseCatalogCacheKeys = {
  version() {
    return "cache:course-catalog:v1:version";
  },

  list({ hostScope, platformScope, query, version }) {
    return buildRedisKey(
      "cache",
      "course-catalog",
      "v1",
      "list",
      hostScope,
      platformScope,
      hashQuery(query),
      `v${version}`,
    );
  },
};
