import { CHAT } from "../../config/scale.js";

import { SOCKET_EVENTS } from "../../events.js";

import { watchRoom } from "../watch/room.js";

import { metrics } from "../../metrics/index.js";

const buffers = new Map();

let ioRef = null;

let timer = null;

export function setChatIo(io) {
  ioRef = io;
}

function ensureTimer() {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    try {
      flushAll();
    } catch (error) {
      console.error("[CHAT_FLUSH_ERROR]", error);
    }
  }, CHAT.FLUSH_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function queueChatMessage({ classType, classId, message }) {
  if (!ioRef) {
    return;
  }

  const room = watchRoom(classType, classId);

  let list = buffers.get(room);

  if (!list) {
    list = [];

    buffers.set(room, list);
  }

  if (list.length >= CHAT.MAX_ROOM_BUFFER) {
    metrics.inc("chat_dropped_overflow");

    return;
  }

  list.push(message);

  ensureTimer();
}

function flushRoom(room, list) {
  const batch = list.splice(0, CHAT.MAX_BATCH);

  if (!batch.length) {
    return;
  }

  if (batch.length === 1) {
    ioRef.to(room).emit(SOCKET_EVENTS.WATCH_CHAT_MESSAGE, batch[0]);
  } else {
    ioRef.to(room).emit(SOCKET_EVENTS.WATCH_CHAT_BATCH, batch);
  }

  metrics.inc("chat_emitted", batch.length);

  metrics.inc("chat_publish", 1);
}

export function flushAll() {
  if (!buffers.size) {
    return;
  }

  for (const [room, list] of buffers) {
    flushRoom(room, list);

    if (!list.length) {
      buffers.delete(room);
    }
  }
}

export function stopChatBatcher() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }

  flushAll();
}
