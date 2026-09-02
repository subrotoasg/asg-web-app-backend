import { redisConnection } from "../../../utlis/redis.js";

import { HISTOGRAM } from "../../config/scale.js";

import { SOCKET_EVENTS } from "../../events.js";

import { watchRoom, roomIndexKey } from "../watch/room.js";

import { getKnownRoomSize } from "../watch/broadcaster.js";

import { metrics } from "../../metrics/index.js";

/**
 * কে কোথায় আছে সেটা ব্যক্তি ধরে না দেখিয়ে ভিড় দেখানো হয়:
 * ভিডিওর কোন অংশে কতজন আছে।
 *
 * কেন এটাই একমাত্র টেকসই উপায়:
 *
 *   per-user broadcast : (N/5) × N emit/sec  →  ১ লক্ষে ২০০ কোটি/সেকেন্ড
 *   histogram          : ১০০টা সংখ্যার array, ~৫৭২ bytes
 *                        ১ লক্ষে ১৫ সেকেন্ডে একবার ≈ ৩.৬ MB/s
 *
 * payload এর আকার N এর উপর নির্ভর করে না — ১০ জন হোক বা ১০ লাখ, একই।
 */
function histKey(classType, classId, windowIndex) {
  return `hist:watch:${classType}:${classId}:${windowIndex}`;
}

function currentWindow(now = Date.now()) {
  return Math.floor(now / HISTOGRAM.WINDOW_MS);
}

//ভিডিওর কোন শতাংশে আছে, সেটাকে ০..BUCKET_COUNT-1 এ ফেলা
export function toBucket(progress) {
  const duration = Number(progress?.duration) || 0;

  const currentTime = Number(progress?.currentTime) || 0;

  let ratio;

  if (duration > 0) {
    ratio = currentTime / duration;
  } else {
    //duration না থাকলে percent, সেটা 0..1 নাকি 0..100 দুটোই সামলানো
    const percent = Number(progress?.progress) || 0;

    ratio = percent > 1 ? percent / 100 : percent;
  }

  if (!Number.isFinite(ratio)) {
    return null;
  }

  const bucket = Math.floor(ratio * HISTOGRAM.BUCKET_COUNT);

  return Math.min(HISTOGRAM.BUCKET_COUNT - 1, Math.max(0, bucket));
}

/**
 * প্রতি progress update এ HINCRBY করলে ১ লক্ষ ইউজারে সেকেন্ডে ২০ হাজার write।
 * তাই process এ জমা: room → (member → bucket), শেষ অবস্থাই থাকে।
 *
 * member ধরে রাখায় একই ইউজার flush window এ দুইবার পাঠালেও একবারই গোনা হয়।
 */
const pending = new Map();

const activeRooms = new Map();

let flushTimer = null;

let broadcastTimer = null;

let ioRef = null;

let broadcasting = false;

export function bufferHistogram({ classType, classId, user, progress }) {
  const bucket = toBucket(progress);

  if (bucket === null || !user?.id) {
    return;
  }

  const key = roomIndexKey(classType, classId);

  let entry = pending.get(key);

  if (!entry) {
    entry = {
      classType,
      classId,
      members: new Map(),
    };

    pending.set(key, entry);
  }

  entry.members.set(`${user.role}:${user.id}`, bucket);

  activeRooms.set(key, {
    classType,
    classId,
    at: Date.now(),
  });
}

async function flush() {
  if (!pending.size) {
    return;
  }

  const entries = [...pending.values()];

  pending.clear();

  const windowIndex = currentWindow();

  const pipeline = redisConnection.pipeline();

  for (const entry of entries) {
    const counts = new Map();

    for (const bucket of entry.members.values()) {
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }

    const key = histKey(entry.classType, entry.classId, windowIndex);

    //রুম প্রতি সর্বোচ্চ BUCKET_COUNT টা command, ইউজার যতই হোক
    for (const [bucket, count] of counts) {
      pipeline.hincrby(key, String(bucket), count);
    }

    pipeline.expire(key, HISTOGRAM.KEY_TTL_SEC);
  }

  await pipeline.exec();

  metrics.inc("histogram_flush_rooms", entries.length);
}

async function readWindow(classType, classId, windowIndex) {
  const raw = await redisConnection.hgetall(
    histKey(classType, classId, windowIndex),
  );

  const buckets = new Array(HISTOGRAM.BUCKET_COUNT).fill(0);

  let total = 0;

  for (const [field, value] of Object.entries(raw || {})) {
    const index = Number(field);

    const count = Number(value) || 0;

    if (Number.isInteger(index) && index >= 0 && index < buckets.length) {
      buckets[index] = count;

      total += count;
    }
  }

  return {
    buckets,
    total,
  };
}

async function acquireLeader(classType, classId, windowIndex) {
  const key = `lock:watch:hist:${classType}:${classId}:${windowIndex}`;

  const ok = await redisConnection.set(
    key,
    process.pid,
    "PX",
    HISTOGRAM.WINDOW_MS,
    "NX",
  );

  return ok === "OK";
}

async function broadcastRoom(classType, classId) {
  //ছোট রুমে avatar list ই যথেষ্ট, histogram এর মানে নেই
  if (getKnownRoomSize(classType, classId) < HISTOGRAM.MIN_ROOM_SIZE) {
    return;
  }

  /**
   * সবসময় আগের সম্পূর্ণ window পড়া হয়।
   * চলতি window পড়লে অর্ধেক ইউজারের রিপোর্ট এখনো আসেনি,
   * তাই সংখ্যা কম দেখাবে আর histogram কাঁপতে থাকবে।
   */
  const windowIndex = currentWindow() - 1;

  const leader = await acquireLeader(classType, classId, windowIndex);

  if (!leader) {
    metrics.inc("histogram_skipped_not_leader");

    return;
  }

  const { buckets, total } = await readWindow(classType, classId, windowIndex);

  if (!total) {
    return;
  }

  ioRef.to(watchRoom(classType, classId)).emit(
    SOCKET_EVENTS.WATCH_PROGRESS_HISTOGRAM,
    {
      classType,
      classId,
      bucketCount: HISTOGRAM.BUCKET_COUNT,
      buckets,
      total,
      windowSec: HISTOGRAM.WINDOW_MS / 1000,
      updatedAt: Date.now(),
    },
  );

  metrics.inc("histogram_emitted");
}

async function broadcastTick() {
  if (broadcasting || !ioRef || !activeRooms.size) {
    return;
  }

  broadcasting = true;

  try {
    const now = Date.now();

    const rooms = [];

    for (const [key, value] of activeRooms) {
      //অনেকক্ষণ কোনো progress আসেনি, রুমটা ছেড়ে দাও (Map যেন না বাড়ে)
      if (now - value.at > HISTOGRAM.ROOM_IDLE_MS) {
        activeRooms.delete(key);

        continue;
      }

      rooms.push(value);

      if (rooms.length >= HISTOGRAM.MAX_ROOMS_PER_TICK) {
        break;
      }
    }

    await Promise.all(
      rooms.map((room) =>
        broadcastRoom(room.classType, room.classId).catch((error) => {
          console.error("[HISTOGRAM_BROADCAST_ERROR]", error);
        }),
      ),
    );
  } finally {
    broadcasting = false;
  }
}

//একজন ইউজার পেজে ঢুকেই সাথে সাথে histogram চাইলে
export async function getHistogramSnapshot({ classType, classId }) {
  const windowIndex = currentWindow() - 1;

  const { buckets, total } = await readWindow(classType, classId, windowIndex);

  return {
    classType,
    classId,
    bucketCount: HISTOGRAM.BUCKET_COUNT,
    buckets,
    total,
    windowSec: HISTOGRAM.WINDOW_MS / 1000,
    updatedAt: Date.now(),
  };
}

export function startHistogram(io) {
  ioRef = io;

  if (flushTimer) {
    return;
  }

  flushTimer = setInterval(() => {
    flush().catch((error) => {
      console.error("[HISTOGRAM_FLUSH_ERROR]", error);
    });
  }, HISTOGRAM.FLUSH_INTERVAL_MS);

  broadcastTimer = setInterval(() => {
    broadcastTick().catch((error) => {
      console.error("[HISTOGRAM_TICK_ERROR]", error);
    });
  }, HISTOGRAM.BROADCAST_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();

    broadcastTimer.unref();
  }
}

export async function stopHistogram() {
  if (flushTimer) {
    clearInterval(flushTimer);

    flushTimer = null;
  }

  if (broadcastTimer) {
    clearInterval(broadcastTimer);

    broadcastTimer = null;
  }

  activeRooms.clear();

  await flush();
}
