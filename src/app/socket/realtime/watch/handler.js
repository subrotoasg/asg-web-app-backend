import * as presenceService from "./presence.js";

import { getWatchUsers } from "./redis.js";

import { validateWatchPayload } from "./validator.js";

import { SOCKET_EVENTS } from "../../events.js";

import { metrics } from "../../metrics/index.js";

export default function registerWatchHandler(io, socket) {
  socket.on(SOCKET_EVENTS.WATCH_JOIN, (payload) =>
    presenceService.join(io, socket, payload),
  );

  socket.on(SOCKET_EVENTS.WATCH_HEARTBEAT, (payload) =>
    presenceService.heartbeat(io, socket, payload),
  );

  socket.on(SOCKET_EVENTS.WATCH_LEAVE, (payload) =>
    presenceService.leave(io, socket, payload),
  );

  socket.on(SOCKET_EVENTS.WATCH_USER_LIST, async (payload = {}) => {
    try {
      if (!validateWatchPayload(payload)) {
        return;
      }

      const now = Date.now();

      if (now - (socket.data.lastUserListAt || 0) < 3000) {
        metrics.inc("watch_user_list_throttled");

        return;
      }

      socket.data.lastUserListAt = now;

      const result = await getWatchUsers({
        classType: payload.classType,
        classId: payload.classId,
      });

      socket.emit(SOCKET_EVENTS.WATCH_USER_LIST_RESULT, {
        classType: payload.classType,
        classId: payload.classId,
        ...result,
      });

      metrics.inc("watch_user_list");
    } catch (error) {
      console.error("WATCH_USER_LIST_ERROR", error);
    }
  });
}
