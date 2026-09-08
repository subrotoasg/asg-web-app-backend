import { getOrLoadCache } from "./cache.aside.js";

import { writeCache } from "./cache.store.js";

const defaultIsMiss = (value) => value === null || value === undefined;

/**
 * Cache-aside read where a "miss" answer (null / not found) is cached too,
 * but for a much shorter time than a real answer.
 *
 * Without this, an unknown id either hammers the database on every request
 * (no negative caching) or stays wrong for the full TTL after the row is
 * finally created (negative caching with the positive TTL).
 */
export async function getOrLoadCacheWithMissTtl({
  key,

  loader,

  isMiss = defaultIsMiss,

  freshTtlMs = 30_000,

  staleTtlMs = 120_000,

  missFreshTtlMs = 10_000,

  missStaleTtlMs = 10_000,

  jitterRatio = 0.1,

  ...rest
}) {
  let loadedFromSource = false;

  let loadedValue;

  const value = await getOrLoadCache({
    key,

    loader: async () => {
      const loaded = await loader();

      loadedValue = loaded === undefined ? null : loaded;

      loadedFromSource = true;

      return loadedValue;
    },

    freshTtlMs,

    staleTtlMs,

    jitterRatio,

    ...rest,
  });

  // Only shorten the TTL right after this call actually loaded a miss from the
  // source of truth, so a background refresh that found a real value is never
  // overwritten by a stale null.
  if (loadedFromSource && isMiss(loadedValue) && isMiss(value)) {
    try {
      await writeCache(key, value ?? null, {
        freshTtlMs: missFreshTtlMs,

        staleTtlMs: missStaleTtlMs,

        jitterRatio,
      });
    } catch (error) {
      console.error(`[cache] miss ttl write failed: ${key}`, error.message);
    }
  }

  return value;
}
