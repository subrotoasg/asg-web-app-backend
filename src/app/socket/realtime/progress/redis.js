import { redisConnection } from "../../../utlis/redis.js";

import { watchProgressKey, member } from "./room.js";

export async function saveProgress({ classType, classId, user, progress }) {
  const key = watchProgressKey(classType, classId);
  await redisConnection.hset(
    key,
    member(user),
    JSON.stringify({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,

      ...progress,

      updatedAt: Date.now(),
    }),
  );
}

export async function getAllProgress({ classType, classId }) {
  const key = watchProgressKey(classType, classId);

  const values = await redisConnection.hvals(key);

  return values.map(JSON.parse);
}

export async function removeProgress({ classType, classId, user }) {
  const key = watchProgressKey(classType, classId);

  await redisConnection.hdel(key, member(user));
}
