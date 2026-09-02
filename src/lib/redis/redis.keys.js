export const RedisNamespace = {
  CACHE: "cache",

  LOCK: "lock",

  LIVE_CLASS: "live-class",

  COURSE: "course",

  STUDENT: "student",

  USER: "user",

  AUTH: "auth",

  RATE_LIMIT: "rate-limit",

  IDEMPOTENCY: "idempotency",
};

export function buildRedisKey(...parts) {
  return parts
    ?.filter((value) => value !== undefined && value !== null && value !== "")
    ?.map(String)
    ?.join(":");
}
