import { redisConnection } from "../../../utlis/redis.js";

import { PRESENCE } from "../../config/scale.js";

import {
  watchPresenceKey,
  watchMetaKey,
  watchHllKey,
  currentBucket,
  roomIndexKey,
} from "./room.js";

import { defineWatchCommands } from "./scripts.js";

import { metrics } from "../../metrics/index.js";

const pending = new Map();

let timer = null;

function ensureTimer() {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    flush().catch((error) => {
      console.error("[PRESENCE_FLUSH_ERROR]", error);
    });
  }, PRESENCE.FLUSH_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function bufferActive({ classType, classId, member }) {
  if (!classType || !classId || !member) {
    return;
  }

  const key = roomIndexKey(classType, classId);

  let entry = pending.get(key);

  if (!entry) {
    entry = {
      classType,
      classId,
      members: new Set(),
    };

    pending.set(key, entry);
  }

  entry.members.add(member);

  ensureTimer();
}

function chunk(list, size) {
  const chunks = [];

  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }

  return chunks;
}

export async function flush() {
  if (!pending.size) {
    return;
  }

  defineWatchCommands();

  const entries = [...pending.values()];

  pending.clear();

  const now = Date.now();

  const bucket = currentBucket(now);

  const pipeline = redisConnection.pipeline();

  let calls = 0;

  for (const entry of entries) {
    const presenceKey = watchPresenceKey(entry.classType, entry.classId);

    const hllKey = watchHllKey(entry.classType, entry.classId, bucket);

    const metaKey = watchMetaKey(entry.classType, entry.classId);

    const members = [...entry.members];

    for (const part of chunk(members, PRESENCE.FLUSH_CHUNK)) {
      pipeline.watchMarkActive(
        presenceKey,
        hllKey,
        metaKey,
        now,
        PRESENCE.ZSET_TTL_SEC,
        PRESENCE.HLL_TTL_SEC,
        PRESENCE.EXACT_TRACK_LIMIT,
        ...part,
      );

      calls += 1;
    }
  }

  if (!calls) {
    return;
  }

  await pipeline.exec();

  metrics.inc("presence_flush_calls", calls);

  metrics.inc("presence_flush_rooms", entries.length);
}

export async function stopPresenceBuffer() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }

  await flush();
}