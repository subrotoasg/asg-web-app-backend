import { acquireLock, extendLock, releaseLock } from "./cache.lock.js";
import { singleFlight } from "./cache.single-flight.js";

import { readCache, writeCache } from "./cache.store.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export class CacheFillTimeoutError extends Error {
  constructor(key) {
    super(`Timed out waiting for cache fill: ${key}`);

    this.name = "CacheFillTimeoutError";
  }
}

function startLockHeartbeat(lock, lockTtlMs) {
  const intervalMs = Math.max(1000, Math.floor(lockTtlMs / 3));

  let stopped = false;

  let extending = false;

  const timer = setInterval(
    async () => {
      if (stopped || extending) {
        return;
      }

      extending = true;

      try {
        await extendLock(lock, lockTtlMs);
      } catch (error) {
        console.error("[cache] lock heartbeat failed:", error.message);
      } finally {
        extending = false;
      }
    },

    intervalMs,
  );

  timer.unref?.();

  return () => {
    stopped = true;

    clearInterval(timer);
  };
}

async function loadAndCache({
  key,

  loader,

  freshTtlMs,

  staleTtlMs,

  jitterRatio,
}) {
  const value = await loader();

  try {
    await writeCache(key, value, {
      freshTtlMs,

      staleTtlMs,

      jitterRatio,
    });
  } catch (error) {
    console.error(`[cache] write failed: ${key}`, error.message);
  }

  return value;
}

async function refreshStaleCache({
  key,

  lockKey,

  loader,

  freshTtlMs,

  staleTtlMs,

  jitterRatio,

  lockTtlMs,
}) {
  let lock;

  try {
    lock = await acquireLock(lockKey, lockTtlMs);

    if (!lock) {
      return;
    }

    const latest = await readCache(key);

    if (latest.state === "fresh") {
      return;
    }

    const stopHeartbeat = startLockHeartbeat(lock, lockTtlMs);

    try {
      await loadAndCache({
        key,

        loader,

        freshTtlMs,

        staleTtlMs,

        jitterRatio,
      });
    } finally {
      stopHeartbeat();
    }
  } catch (error) {
    console.error(`[cache] background refresh failed: ${key}`, error.message);
  } finally {
    if (lock) {
      try {
        await releaseLock(lock);
      } catch {
        //
      }
    }
  }
}

export async function getOrLoadCache({
  key,

  loader,

  freshTtlMs = 30_000,

  staleTtlMs = 120_000,

  lockTtlMs = 10_000,

  waitForFillMs = 7000,

  pollMinMs = 40,

  pollMaxMs = 100,

  jitterRatio = 0.1,
}) {
  const lockKey = `lock:${key}`;

  let firstRead;

  try {
    firstRead = await readCache(key);
  } catch (error) {
    console.error(`[cache] Redis unavailable: ${key}`, error.message);

    return singleFlight(
      `redis-down:${key}`,

      loader,
    );
  }

  if (firstRead.state === "fresh") {
    return firstRead.value;
  }

  if (firstRead.state === "stale") {
    void singleFlight(
      `refresh:${key}`,

      () =>
        refreshStaleCache({
          key,

          lockKey,

          loader,

          freshTtlMs,

          staleTtlMs,

          jitterRatio,

          lockTtlMs,
        }),
    ).catch((error) => {
      console.error(`[cache] async refresh error: ${key}`, error);
    });

    return firstRead.value;
  }

  return singleFlight(
    `cold:${key}`,

    async () => {
      try {
        const secondRead = await readCache(key);

        if (secondRead.state === "fresh" || secondRead.state === "stale") {
          return secondRead.value;
        }
      } catch {
        return loader();
      }

      let lock;

      try {
        lock = await acquireLock(lockKey, lockTtlMs);
      } catch (error) {
        console.error(`[cache] lock unavailable: ${key}`, error.message);

        return loader();
      }

      if (lock) {
        const stopHeartbeat = startLockHeartbeat(lock, lockTtlMs);

        try {
          const afterLock = await readCache(key);

          if (afterLock.state === "fresh" || afterLock.state === "stale") {
            return afterLock.value;
          }

          return await loadAndCache({
            key,

            loader,

            freshTtlMs,

            staleTtlMs,

            jitterRatio,
          });
        } finally {
          stopHeartbeat();

          try {
            await releaseLock(lock);
          } catch {
            //
          }
        }
      }

      const deadline = Date.now() + waitForFillMs;

      while (Date.now() < deadline) {
        await sleep(randomBetween(pollMinMs, pollMaxMs));

        try {
          const cached = await readCache(key);

          if (cached.state === "fresh" || cached.state === "stale") {
            return cached.value;
          }
        } catch (error) {
          console.error(`[cache] wait failed: ${key}`, error.message);

          return loader();
        }
      }
      let rescueLock;

      try {
        rescueLock = await acquireLock(lockKey, lockTtlMs);
      } catch {
        return loader();
      }

      if (rescueLock) {
        const stopHeartbeat = startLockHeartbeat(rescueLock, lockTtlMs);

        try {
          const latest = await readCache(key);

          if (latest.state === "fresh" || latest.state === "stale") {
            return latest.value;
          }

          return await loadAndCache({
            key,

            loader,

            freshTtlMs,

            staleTtlMs,

            jitterRatio,
          });
        } finally {
          stopHeartbeat();

          try {
            await releaseLock(rescueLock);
          } catch {
            //
          }
        }
      }
      throw new CacheFillTimeoutError(key);
    },
  );
}
