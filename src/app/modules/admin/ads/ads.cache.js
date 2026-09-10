import {
  getOrLoadStrictCache,
  redisCacheConnection,
} from "../../../../lib/redis/index.js";
import { AdsCacheKeys } from "./ads.cache.keys.js";

const LIST_TTL_MS = 60_000;
const DETAIL_TTL_MS = 60_000;
const SERVE_TTL_MS = 45_000;
const ANCESTRY_TTL_MS = 10 * 60_000;

const IMPRESSION_TTL_SEC = 30 * 24 * 60 * 60;

const getVersion = async () => {
  try {
    return (await redisCacheConnection.get(AdsCacheKeys.version())) || "0";
  } catch (error) {
    console.error("[ads-cache] version read failed:", error.message);
    return null;
  }
};

/* Redis না থাকলেও ফিচার চলবে — লোডারটা সরাসরি ডাকা হয় */
const safeCached = async ({ key, loader, freshTtlMs }) => {
  if (!key) return loader();

  try {
    return await getOrLoadStrictCache({
      key,
      loader,
      freshTtlMs,
      lockTtlMs: 5_000,
      waitForFillMs: 3_000,
      jitterRatio: 0.1,
    });
  } catch (error) {
    console.error("[ads-cache] read failed:", error.message);
    return loader();
  }
};

export async function getCachedAdsList({ scopeKey, query, loader }) {
  const version = await getVersion();
  return safeCached({
    key: version && AdsCacheKeys.list({ scopeKey, query, version }),
    loader,
    freshTtlMs: LIST_TTL_MS,
  });
}

export async function getCachedAdDetail({ adId, loader }) {
  const version = await getVersion();
  return safeCached({
    key: version && AdsCacheKeys.detail({ adId, version }),
    loader,
    freshTtlMs: DETAIL_TTL_MS,
  });
}

export async function getCachedServeAds({
  contextScope,
  contextId,
  studentId,
  loader,
}) {
  const version = await getVersion();
  return safeCached({
    key:
      version &&
      AdsCacheKeys.serve({ contextScope, contextId, studentId, version }),
    loader,
    freshTtlMs: SERVE_TTL_MS,
  });
}

/* কনটেন্টের প্যারেন্ট চেইন — ad বদলালেও এটা বদলায় না, তাই ভার্সনের বাইরে */
export async function getCachedAncestry({ contextScope, contextId, loader }) {
  return safeCached({
    key: AdsCacheKeys.ancestry({ contextScope, contextId }),
    loader,
    freshTtlMs: ANCESTRY_TTL_MS,
  });
}

export async function bumpAdsVersion() {
  try {
    await redisCacheConnection.incr(AdsCacheKeys.version());
  } catch (error) {
    console.error("[ads-cache] invalidation failed:", error.message);
  }
}

/* ---- frequency capping ----
 * কে কোন ad কতবার দেখেছে, আর শেষ কবে — দুইটাই Redis-এ, DB-তে নয়।
 * Redis ডাউন থাকলে ক্যাপিং বন্ধ থাকে কিন্তু ad দেখানো বন্ধ হয় না।
 */
export async function readFrequency(studentId, adIds = []) {
  if (!studentId || !adIds.length) return {};

  try {
    const pipeline = redisCacheConnection.pipeline();
    adIds.forEach((adId) => {
      pipeline.get(AdsCacheKeys.impressions(studentId, adId));
      pipeline.get(AdsCacheKeys.lastSeen(studentId, adId));
    });

    const replies = await pipeline.exec();
    const out = {};

    adIds.forEach((adId, i) => {
      const shown = Number(replies?.[i * 2]?.[1] || 0);
      const lastSeen = Number(replies?.[i * 2 + 1]?.[1] || 0);
      out[adId] = { shown, lastSeen };
    });

    return out;
  } catch (error) {
    console.error("[ads-cache] frequency read failed:", error.message);
    return {};
  }
}

export async function markImpression(studentId, adId) {
  if (!studentId || !adId) return;

  try {
    const pipeline = redisCacheConnection.pipeline();
    const impKey = AdsCacheKeys.impressions(studentId, adId);
    const seenKey = AdsCacheKeys.lastSeen(studentId, adId);

    pipeline.incr(impKey);
    pipeline.expire(impKey, IMPRESSION_TTL_SEC);
    pipeline.set(seenKey, Date.now(), "EX", IMPRESSION_TTL_SEC);

    await pipeline.exec();
  } catch (error) {
    console.error("[ads-cache] impression mark failed:", error.message);
  }
}
