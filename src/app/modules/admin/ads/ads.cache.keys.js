import crypto from "node:crypto";
import { buildRedisKey } from "../../../../lib/redis/index.js";

function hashQuery(query) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(query ?? {}))
    .digest("hex")
    .slice(0, 16);
}

export const AdsCacheKeys = {
  /* যেকোনো ad লেখা হলে এই ভার্সন বাড়ে — পুরনো key এক ঝটকায় অচল */
  version() {
    return "cache:ads:v1:version";
  },

  /* অ্যাডমিন লিস্ট */
  list({ scopeKey, query, version }) {
    return buildRedisKey(
      "cache",
      "ads",
      "v1",
      "list",
      scopeKey,
      hashQuery(query),
      `v${version}`,
    );
  },

  detail({ adId, version }) {
    return buildRedisKey("cache", "ads", "v1", "detail", adId, `v${version}`);
  },

  /* প্লেয়ারে সার্ভ করার জন্য — কনটেক্সট আর স্টুডেন্ট ধরে */
  serve({ contextScope, contextId, studentId, version }) {
    return buildRedisKey(
      "cache",
      "ads",
      "v1",
      "serve",
      contextScope,
      contextId,
      studentId || "anon",
      `v${version}`,
    );
  },

  /* কনটেন্টের ancestor chain — এটা ad-এর সাথে বদলায় না, তাই আলাদা key */
  ancestry({ contextScope, contextId }) {
    return buildRedisKey(
      "cache",
      "ads",
      "v1",
      "ancestry",
      contextScope,
      contextId,
    );
  },

  /* frequency capping — একজন ইউজার একটা ad কতবার দেখেছে */
  impressions(studentId, adId) {
    return buildRedisKey("ads", "v1", "imp", studentId, adId);
  },

  /* শেষ কবে দেখানো হয়েছে — minGapSeconds চেক করার জন্য */
  lastSeen(studentId, adId) {
    return buildRedisKey("ads", "v1", "seen", studentId, adId);
  },

  /* কাউন্টার বাফার — ইভেন্ট প্রতি DB আপডেট না করে Redis-এ জমে */
  counterBuffer(type) {
    return buildRedisKey("ads", "v1", "counter", type);
  },
};
