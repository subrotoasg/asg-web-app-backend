import { removeProgress } from "../progress/redis.js";

import {
  markActive,
  removeActive,
  updateMeta,
  removeMeta,
} from "./redis.js";

import { watchRoom } from "./room.js";

import { markRoomDirty, sendOnlineToSocket } from "./broadcaster.js";

import { validateWatchPayload } from "./validator.js";

import { metrics } from "../../metrics/index.js";

export async function join(io, socket, payload = {}) {
  try {
    if (!validateWatchPayload(payload)) {
      return;
    }

    socket.data.watch = {
      classType: payload.classType,
      classId: payload.classId,
    };

    const room = watchRoom(payload.classType, payload.classId);

    socket.join(room);

    markActive({
      classType: payload.classType,
      classId: payload.classId,
      user: socket.user,
    });

    await updateMeta({
      classType: payload.classType,
      classId: payload.classId,
      user: socket.user,
      progressVal: {
        currentTime: payload?.currentTime,
        duration: payload?.duration,
        progress: payload?.progress,
        volume: payload?.volume,
        isMuted: payload?.isMuted,
      },
    });

    await sendOnlineToSocket(socket, payload.classType, payload.classId);

    markRoomDirty(payload.classType, payload.classId);

    metrics.inc("watch_join");
  } catch (error) {
    console.error("WATCH_JOIN_ERROR", error);
  }
}

export function heartbeat(io, socket, payload = {}) {
  if (!validateWatchPayload(payload)) {
    return;
  }

  markActive({
    classType: payload.classType,
    classId: payload.classId,
    user: socket.user,
  });

  metrics.inc("watch_heartbeat");
}

export async function leave(io, socket, payload = {}) {
  try {
    if (!validateWatchPayload(payload)) {
      return;
    }

    const room = watchRoom(payload.classType, payload.classId);

    socket.leave(room);

    if (
      socket.data.watch?.classType === payload.classType &&
      socket.data.watch?.classId === payload.classId
    ) {
      socket.data.watch = null;
    }

    await Promise.all([
      removeActive({
        classType: payload.classType,
        classId: payload.classId,
        user: socket.user,
      }),

      removeMeta({
        classType: payload.classType,
        classId: payload.classId,
        user: socket.user,
      }),
    ]);

    markRoomDirty(payload.classType, payload.classId);
  } catch (error) {
    console.error("WATCH_LEAVE_ERROR", error);
  }
}

export async function disconnect(io, socket) {
  try {
    const watch = socket.data.watch;

    if (!watch) {
      return;
    }

    await Promise.all([
      removeActive({
        classType: watch.classType,
        classId: watch.classId,
        user: socket.user,
      }),

      removeMeta({
        classType: watch.classType,
        classId: watch.classId,
        user: socket.user,
      }),

      removeProgress({
        classType: watch.classType,
        classId: watch.classId,
        user: socket.user,
      }),
    ]);

    markRoomDirty(watch.classType, watch.classId);
  } catch (error) {
    console.error("WATCH_DISCONNECT_ERROR", error);
  }
}
