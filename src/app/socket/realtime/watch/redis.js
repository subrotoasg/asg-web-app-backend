import { redisConnection } from "../../../utlis/redis.js";

import { PRESENCE } from "../../config/scale.js";

import {
  watchPresenceKey,
  watchMetaKey,
  watchHllWindowKeys,
  member,
} from "./room.js";

import { defineWatchCommands } from "./scripts.js";

import { bufferActive } from "./presenceBuffer.js";

export function markActive({ classType, classId, user }) {
  bufferActive({
    classType,
    classId,
    member: member(user),
  });
}

export async function removeActive({ classType, classId, user }) {
  const key = watchPresenceKey(classType, classId);

  await redisConnection.zrem(key, member(user));
}

export async function getOnlineCount({ classType, classId }) {
  defineWatchCommands();

  const now = Date.now();

  const presenceKey = watchPresenceKey(classType, classId);

  const hllKeys = watchHllWindowKeys(classType, classId, now);

  const cutoff = now - PRESENCE.BUCKET_MS * PRESENCE.WINDOW_BUCKETS;

  const keys = [presenceKey, ...hllKeys];

  const result = await redisConnection.watchOnlineCount(
    keys.length,
    ...keys,
    cutoff,
    PRESENCE.EXACT_TRACK_LIMIT,
  );

  return {
    count: Number(result?.[0] || 0),
    isExact: Number(result?.[1] || 0) === 1,
  };
}

export async function updateMeta({
  classType,
  classId,
  user,
  progressVal = null,
}) {
  const key = watchMetaKey(classType, classId);

  const size = await redisConnection.hlen(key);

  const field = member(user);

  if (size >= PRESENCE.EXACT_TRACK_LIMIT) {
    const exists = await redisConnection.hexists(key, field);

    if (!exists) {
      return;
    }
  }

  const value = JSON.stringify({
    id: user?.id,
    role: user?.role,
    name: user?.name,
    avatar: user?.avatar || null,
    progress: {
      currentTime: progressVal?.currentTime,
      duration: progressVal?.duration,
      progress: progressVal?.progress,
      volume: progressVal?.volume,
      isMuted: progressVal?.isMuted,
    },
    updatedAt: Date.now(),
  });

  const pipeline = redisConnection.pipeline();

  pipeline.hset(key, field, value);

  pipeline.expire(key, PRESENCE.ZSET_TTL_SEC);

  await pipeline.exec();
}

export async function removeMeta({ classType, classId, user }) {
  await redisConnection.hdel(watchMetaKey(classType, classId), member(user));
}

export async function getWatchUsers({ classType, classId }) {
  const key = watchMetaKey(classType, classId);

  const size = await redisConnection.hlen(key);

  if (size > PRESENCE.EXACT_TRACK_LIMIT) {
    return {
      users: [],
      available: false,
      roomSize: size,
    };
  }

  const raw = await redisConnection.hgetall(key);

  const users = [];

  for (const value of Object.values(raw || {})) {
    try {
      users.push(JSON.parse(value));
    } catch {}
  }

  return {
    users,
    available: true,
    roomSize: users.length,
  };
}

export async function cleanupInactive({ classType, classId }) {
  const presenceKey = watchPresenceKey(classType, classId);

  const metaKey = watchMetaKey(classType, classId);

  const cutoff = Date.now() - PRESENCE.BUCKET_MS * PRESENCE.WINDOW_BUCKETS;

  const inactiveMembers = await redisConnection.zrangebyscore(
    presenceKey,
    0,
    cutoff,
    "LIMIT",
    0,
    PRESENCE.EXACT_TRACK_LIMIT,
  );

  if (!inactiveMembers.length) {
    return;
  }

  const pipeline = redisConnection.pipeline();

  pipeline.zremrangebyscore(presenceKey, 0, cutoff);

  inactiveMembers.forEach((field) => {
    pipeline.hdel(metaKey, field);
  });

  await pipeline.exec();
}
