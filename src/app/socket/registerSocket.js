import registerWatchHandler from "./realtime/watch/handler.js";

import registerClassHandler from "./realtime/class/handler.js";

import registerWatchChatHandler from "./realtime/chat/handler.js";

import registerWatchProgressHandler from "./realtime/progress/handler.js";

import registerWatchAdmin from "./realtime/admins/register.js";

import { SOCKET_EVENTS } from "./events.js";

import config from "../config/index.js";

import { disconnect as classDisconnect } from "./realtime/class/prensence.js";

import { disconnect as watchDisconnect } from "./realtime/watch/presence.js";

import { metrics } from "./metrics/index.js";

const recordedClassWatchEnabled = config.recorded_class_watch_enabled;

const coreHandlers = [
  registerWatchAdmin,
  registerWatchHandler,
  registerClassHandler,
];

const recordedClassWatchInteractionHandlers = [
  registerWatchChatHandler,
  // registerWatchProgressHandler,
];

export default function registerSocket(io) {
  const handlers = recordedClassWatchEnabled
    ? [...coreHandlers, ...recordedClassWatchInteractionHandlers]
    : coreHandlers;

  if (!recordedClassWatchEnabled) {
    console.warn(
      "Recorded-class chat and video-progress sockets are disabled by ENABLE_RECORDED_CLASS_WATCH=false; viewer counts remain enabled",
    );
  }

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    metrics.inc("connections");

    handlers.forEach((handler) => {
      handler(io, socket);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      metrics.inc("disconnections");

      try {
        await Promise.all([
          classDisconnect(io, socket),
          watchDisconnect(io, socket),
        ]);
      } catch (error) {
        console.error("[SOCKET_DISCONNECT_ERROR]", error);
      }
    });
  });
}
