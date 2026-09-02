import { redisConnection } from "../../../../../utlis/redis.js";

export async function dedupOnce(key, ttlSec = 900) {
  const redisKey = `dedup:${key}`;
  const ok = await redisConnection.set(redisKey, "1", "NX", "EX", ttlSec);
  return ok === "OK";
}

export async function acquireLock(uniqueId, ttlSec = 300) {
  const redisKey = `lock:notification:${uniqueId}`;
  const ok = await redisConnection.set(redisKey, "1", "NX", "EX", ttlSec);
  return ok === "OK";
}

export async function releaseLock(uniqueId) {
  const redisKey = `lock:notification:${uniqueId}`;
  await redisConnection.del(redisKey);
}
