import { getOrLoadCache } from "./cache.aside.js";

export function getOrLoadStrictCache({
  key,
  loader,

  freshTtlMs = 60_000,

  lockTtlMs = 5_000,

  waitForFillMs = 3000,

  pollMinMs = 40,

  pollMaxMs = 100,

  jitterRatio = 0.1,
}) {
  return getOrLoadCache({
    key,

    loader,

    freshTtlMs,

    staleTtlMs: 0,

    lockTtlMs,

    waitForFillMs,

    pollMinMs,

    pollMaxMs,

    jitterRatio,
  });
}
