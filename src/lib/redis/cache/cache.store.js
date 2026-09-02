import { redisCacheConnection } from "../../../app/utlis/redis.js";

const CACHE_VERSION = 1;

function applyJitter(ttlMs, ratio = 0.1) {
  const variation = ttlMs * ratio;

  const min = ttlMs - variation;

  const max = ttlMs + variation;

  return Math.max(1000, Math.round(min + Math.random() * (max - min)));
}

export async function readCache(key) {
  const raw = await redisCacheConnection.get(key);

  if (raw === null) {
    return {
      state: "miss",

      value: null,
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    await redisCacheConnection.del(key);

    return {
      state: "miss",

      value: null,
    };
  }

  if (
    parsed?.version !== CACHE_VERSION ||
    typeof parsed?.freshUntil !== "number"
  ) {
    await redisCacheConnection.del(key);

    return {
      state: "miss",

      value: null,
    };
  }

  const now = Date.now();

  if (now < parsed.freshUntil) {
    return {
      state: "fresh",

      value: parsed.value,
    };
  }

  return {
    state: "stale",

    value: parsed.value,
  };
}

export async function writeCache(
  key,
  value,
  {
    freshTtlMs = 30_000,

    staleTtlMs = 120_000,

    jitterRatio = 0.1,
  } = {},
) {
  if (value === undefined) {
    throw new Error(`Cannot cache undefined value for key: ${key}`);
  }

  const randomizedFreshTtl = applyJitter(freshTtlMs, jitterRatio);

  const freshUntil = Date.now() + randomizedFreshTtl;

  const hardTtl = randomizedFreshTtl + staleTtlMs;

  const payload = {
    version: CACHE_VERSION,

    freshUntil,

    value,
  };

  await redisCacheConnection.set(
    key,

    JSON.stringify(payload),

    "PX",

    hardTtl,
  );
}

export async function deleteCache(key) {
  await redisCacheConnection.del(key);
}
