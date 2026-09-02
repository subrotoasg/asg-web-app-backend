import {
  ACTIVE_WINDOW_MS,
  COUNT_EMIT_THROTTLE_MS,
  MIN_HEARTBEAT_INTERVAL_MS,
} from "./constants.js";

import { classRoomKey, classThrottleKey } from "./room.js";

import { getClassActiveCount } from "./redis.js";

const lastEmitAt = new Map();

const pendingEmitTimers = new Map();

export function shouldAcceptHeartbeat(socket, classType, classId) {
  const key = classThrottleKey(classType, classId);

  const now = Date.now();

  if (!socket.data.classHeartbeatMap) {
    socket.data.classHeartbeatMap = {};
  }

  const lastHeartbeat = socket.data.classHeartbeatMap[key] || 0;

  if (now - lastHeartbeat < MIN_HEARTBEAT_INTERVAL_MS) {
    return false;
  }

  socket.data.classHeartbeatMap[key] = now;

  return true;
}

async function emitCount(io, classType, classId) {
  const activeStudents = await getClassActiveCount({
    classType,
    classId,
  });

  io.to(classRoomKey(classType, classId)).emit("presence:class:update", {
    classType,
    classId,
    activeStudents,
    activeWindowSec: ACTIVE_WINDOW_MS / 1000,
    updatedAt: new Date().toISOString(),
  });

  lastEmitAt.set(classThrottleKey(classType, classId), Date.now());
}

export function scheduleCountEmit(io, classType, classId) {
  const key = classThrottleKey(classType, classId);

  const now = Date.now();

  const last = lastEmitAt.get(key) || 0;

  const elapsed = now - last;

  if (elapsed >= COUNT_EMIT_THROTTLE_MS) {
    emitCount(io, classType, classId).catch(console.error);

    return;
  }

  if (pendingEmitTimers.has(key)) {
    return;
  }

  const timer = setTimeout(() => {
    pendingEmitTimers.delete(key);

    emitCount(io, classType, classId).catch(console.error);
  }, COUNT_EMIT_THROTTLE_MS - elapsed);

  pendingEmitTimers.set(key, timer);
}
