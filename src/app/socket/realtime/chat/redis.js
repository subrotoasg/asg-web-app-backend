import { redisConnection } from "../../../utlis/redis.js";
import { cleanupInactive } from "../watch/redis.js";
import { member, watchPresenceKey } from "./room.js";

export async function isActiveUser({ classType, classId, user }) {
  await cleanupInactive({
    classType,
    classId,
  });

  const key = watchPresenceKey(classType, classId);

  const score = await redisConnection.zscore(key, member(user));

  return score !== null;
}
