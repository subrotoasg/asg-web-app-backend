import { redisConnection } from "../../../utlis/redis.js";

import { ACTIVE_WINDOW_MS, CLASS_KEY_EXPIRE_SEC } from "./constants.js";

import { classPresenceKey } from "./room.js";

import { makePresenceMember } from "./validator.js";

export async function markClassActive({ classType, classId, user }) {
  const key = classPresenceKey(classType, classId);

  const member = makePresenceMember(user);

  const now = Date.now();

  const pipeline = redisConnection.pipeline();

  pipeline.zadd(key, now, member);

  pipeline.expire(key, CLASS_KEY_EXPIRE_SEC);

  await pipeline.exec();
}

export async function cleanupExpiredMembers(classType, classId) {
  const key = classPresenceKey(classType, classId);

  const cutoff = Date.now() - ACTIVE_WINDOW_MS;

  await redisConnection.zremrangebyscore(key, 0, cutoff);
}

export async function getClassActiveCount({ classType, classId }) {
  await cleanupExpiredMembers(classType, classId);

  const key = classPresenceKey(classType, classId);

  const count = await redisConnection.zcard(key);

  return Number(count || 0);
}
export async function removeClassMember({ classType, classId, user }) {
  const key = classPresenceKey(classType, classId);

  const member = makePresenceMember(user);

  await redisConnection.zrem(key, member);
}

export async function getClassActiveMembers({ classType, classId }) {
  await cleanupExpiredMembers(classType, classId);

  const key = classPresenceKey(classType, classId);

  return await redisConnection.zrange(key, 0, -1);
}
