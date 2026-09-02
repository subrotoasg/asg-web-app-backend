import { redisConnection } from "../../utlis/redis.js";

import { metrics } from "./index.js";

export const METRICS_KEY = "metrics:socket:v1";

const PUBLISH_INTERVAL_MS = 15_000;
const STALE_MS = 60_000;

const KEY_TTL_SEC = 300;

let timer = null;

let ioRef = null;

async function publishOnce() {
  if (!ioRef) {
    return;
  }

  const payload = {
    ...metrics.snapshot(ioRef),
    at: Date.now(),
  };

  const pipeline = redisConnection.pipeline();

  pipeline.hset(METRICS_KEY, String(process.pid), JSON.stringify(payload));

  pipeline.expire(METRICS_KEY, KEY_TTL_SEC);

  await pipeline.exec();
}

export function startMetricsPublisher(io) {
  ioRef = io;

  if (timer) {
    return;
  }

  publishOnce().catch((error) => {
    console.error("[METRICS_PUBLISH_ERROR]", error);
  });

  timer = setInterval(() => {
    publishOnce().catch((error) => {
      console.error("[METRICS_PUBLISH_ERROR]", error);
    });
  }, PUBLISH_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export async function stopMetricsPublisher() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }
  try {
    await redisConnection.hdel(METRICS_KEY, String(process.pid));
  } catch (error) {
    console.error("[METRICS_CLEANUP_ERROR]", error);
  }
}

export async function readAllNodes() {
  const raw = await redisConnection.hgetall(METRICS_KEY);

  const now = Date.now();

  const nodes = [];

  const stalePids = [];

  for (const [pid, value] of Object.entries(raw || {})) {
    try {
      const parsed = JSON.parse(value);

      if (now - Number(parsed.at || 0) > STALE_MS) {
        stalePids.push(pid);

        continue;
      }

      nodes.push(parsed);
    } catch {
      stalePids.push(pid);
    }
  }

  if (stalePids.length) {
    redisConnection.hdel(METRICS_KEY, ...stalePids).catch(() => {});
  }

  nodes.sort((a, b) => Number(a.pid) - Number(b.pid));

  return nodes;
}
