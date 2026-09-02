import crypto from "node:crypto";

import { watchRoom } from "../watch/room.js";

import { getKnownRoomSize } from "../watch/broadcaster.js";

import { validateWatchChatPayload, validateWatchPayload } from "./validator.js";

import { SOCKET_EVENTS } from "../../events.js";

import { CHAT } from "../../config/scale.js";

import { ensureChatAllowed } from "../../authAccess/studentBnnedChaeck.js";

import { emitAdminChat } from "../admins/emitter.js";

import { enqueueChat } from "../../queue/chat.queue.js";

import { consumeChatToken, canSendTyping } from "./rateLimit.js";

import { queueChatMessage } from "./batcher.js";

import { metrics } from "../../metrics/index.js";

export async function send(io, socket, payload = {}) {
  try {
    if (!validateWatchChatPayload(payload)) {
      return;
    }

    if (!consumeChatToken(socket)) {
      metrics.inc("chat_rate_limited");

      socket.emit(SOCKET_EVENTS.WATCH_CHAT_THROTTLED, {
        success: false,
        message: "একটু ধীরে পাঠাও",
      });

      return;
    }

    const room = watchRoom(payload.classType, payload.classId);

    if (!socket.rooms.has(room)) {
      return;
    }

    if (await ensureChatAllowed(socket)) {
      return;
    }

    const studentMessage = {
      id: crypto.randomUUID(),

      message: payload.message.trim().slice(0, CHAT.MAX_MESSAGE_LENGTH),

      createdAt: Date.now(),

      sender: {
        id: socket.user.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        role: socket.user.role,
      },
    };

    const adminMessage = {
      ...studentMessage,
      classType: payload.classType,
      classId: payload.classId,
    };

    queueChatMessage({
      classType: payload.classType,
      classId: payload.classId,
      message: studentMessage,
    });

    emitAdminChat(io, adminMessage);

    enqueueChat(adminMessage).catch((error) => {
      console.error("[CHAT_QUEUE_ERROR]", error);
    });

    metrics.inc("chat_accepted");
  } catch (error) {
    console.error("WATCH_CHAT_SEND_ERROR", error);
  }
}

function typingAllowed(socket, payload) {
  if (!validateWatchPayload(payload)) {
    return false;
  }

  if (!canSendTyping(socket)) {
    return false;
  }

  const size = getKnownRoomSize(payload.classType, payload.classId);

  if (size > CHAT.TYPING_MAX_ROOM_SIZE) {
    metrics.inc("typing_suppressed_large_room");

    return false;
  }

  return true;
}

export async function typing(io, socket, payload = {}) {
  if (!typingAllowed(socket, payload)) {
    return;
  }

  socket
    .to(watchRoom(payload.classType, payload.classId))
    .emit(SOCKET_EVENTS.WATCH_TYPING, {
      id: socket.user.id,
      name: socket.user.name,
      avater: socket.user.avatar,
    });
}

export async function stopTyping(io, socket, payload = {}) {
  if (!validateWatchPayload(payload)) {
    return;
  }

  const size = getKnownRoomSize(payload.classType, payload.classId);

  if (size > CHAT.TYPING_MAX_ROOM_SIZE) {
    return;
  }

  socket
    .to(watchRoom(payload.classType, payload.classId))
    .emit(SOCKET_EVENTS.WATCH_STOP_TYPING, {
      id: socket.user.id,
    });
}
