import crypto from "node:crypto";
import { redisCacheConnection } from "../../../app/utlis/redis.js";

const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

const EXTEND_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

export async function acquireLock(key, ttlMs = 10000) {
  const token = crypto.randomUUID();

  const result = await redisCacheConnection.set(key, token, "PX", ttlMs, "NX");

  if (result !== "OK") {
    return null;
  }

  return {
    key,
    token,
  };
}

export async function releaseLock(lock) {
  if (!lock) {
    return false;
  }

  const result = await redisCacheConnection.eval(
    RELEASE_SCRIPT,
    1,
    lock.key,
    lock.token,
  );

  return Number(result) === 1;
}

export async function extendLock(lock, ttlMs) {
  if (!lock) {
    return false;
  }

  const result = await redisCacheConnection.eval(
    EXTEND_SCRIPT,
    1,
    lock.key,
    lock.token,
    String(ttlMs),
  );

  return Number(result) === 1;
}
