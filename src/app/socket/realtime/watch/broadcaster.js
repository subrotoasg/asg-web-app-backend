import { redisConnection } from "../../../utlis/redis.js";

import { BROADCAST, PRESENCE } from "../../config/scale.js";

import { SOCKET_EVENTS } from "../../events.js";

import { getOnlineCount } from "./redis.js";

import { watchRoom, watchLastCountKey, roomIndexKey } from "./room.js";

import { metrics } from "../../metrics/index.js";

const dirty = new Map();

const lastKnownCount = new Map();

let ioRef = null;

let timer = null;

let running = false;

export function markRoomDirty(classType, classId) {
  if (!classType || !classId) {
    return;
  }

  dirty.set(roomIndexKey(classType, classId), {
    classType,
    classId,
  });
}

export function getKnownRoomSize(classType, classId) {
  const entry = lastKnownCount.get(roomIndexKey(classType, classId));

  if (!entry) {
    return 0;
  }

  if (Date.now() - entry.at > PRESENCE.ZSET_TTL_SEC * 1000) {
    return 0;
  }

  return entry.count;
}

function rememberCount(classType, classId, count) {
  lastKnownCount.set(roomIndexKey(classType, classId), {
    count,
    at: Date.now(),
  });
}

export function buildOnlinePayload(classType, classId, count, isExact) {
  return {
    classType,
    classId,
    onlineWatchers: count,
    approximate: !isExact,
    updatedAt: Date.now(),
  };
}

export async function sendOnlineToSocket(socket, classType, classId) {
  const { count, isExact } = await getOnlineCount({
    classType,
    classId,
  });

  rememberCount(classType, classId, count);

  socket.emit(
    SOCKET_EVENTS.WATCH_ONLINE,
    buildOnlinePayload(classType, classId, count, isExact),
  );
}

async function acquireLeader(classType, classId) {
  const key = `lock:watch:online:${classType}:${classId}`;

  const ok = await redisConnection.set(
    key,
    process.pid,
    "PX",
    BROADCAST.MIN_INTERVAL_MS,
    "NX",
  );

  return ok === "OK";
}

async function shouldEmit(classType, classId, count) {
  const minDelta = Math.max(
    BROADCAST.CHANGE_MIN_DELTA,
    Math.floor(count * BROADCAST.CHANGE_RATIO),
  );

  const result = await redisConnection.watchShouldEmit(
    watchLastCountKey(classType, classId),
    count,
    BROADCAST.FORCE_REFRESH_SEC,
    minDelta,
  );

  return Number(result) === 1;
}

async function processRoom(classType, classId) {
  const leader = await acquireLeader(classType, classId);

  if (!leader) {
    metrics.inc("broadcast_skipped_not_leader");

    return;
  }

  const { count, isExact } = await getOnlineCount({
    classType,
    classId,
  });

  rememberCount(classType, classId, count);

  const emit = await shouldEmit(classType, classId, count);

  if (!emit) {
    metrics.inc("broadcast_skipped_unchanged");

    return;
  }

  ioRef
    .to(watchRoom(classType, classId))
    .emit(
      SOCKET_EVENTS.WATCH_ONLINE,
      buildOnlinePayload(classType, classId, count, isExact),
    );

  metrics.inc("broadcast_emitted");
}

async function tick() {
  if (running || !ioRef || !dirty.size) {
    return;
  }

  running = true;

  try {
    const rooms = [];

    for (const [key, value] of dirty) {
      rooms.push(value);

      dirty.delete(key);

      if (rooms.length >= BROADCAST.MAX_ROOMS_PER_TICK) {
        break;
      }
    }

    await Promise.all(
      rooms.map((room) =>
        processRoom(room.classType, room.classId).catch((error) => {
          console.error("[WATCH_BROADCAST_ERROR]", error);
        }),
      ),
    );
  } finally {
    running = false;
  }
}

export function startBroadcaster(io) {
  ioRef = io;

  if (timer) {
    return;
  }

  timer = setInterval(() => {
    tick().catch((error) => {
      console.error("[WATCH_BROADCAST_TICK_ERROR]", error);
    });
  }, BROADCAST.TICK_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function stopBroadcaster() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }

  dirty.clear();

  lastKnownCount.clear();
}
