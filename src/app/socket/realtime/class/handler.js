import { isValidClassPayload } from "./validator.js";

import { SOCKET_EVENTS } from "../../events.js";

import { join, heartbeat, leave } from "./prensence.js";

function error(socket, message) {
  socket.emit("presence:error", {
    message,
    timestamp: new Date().toISOString(),
  });
}

export default function registerClassHandler(io, socket) {
  socket.on(SOCKET_EVENTS.CLASS_INIT, async () => {
    try {
      if (!socket.user?.id) {
        return error(socket, "Invalid user");
      }

      socket.data.user = socket.user;

      socket.emit("presence:ready", {
        success: true,
      });
    } catch (err) {
      console.error(err);

      error(socket, "Presence init failed");
    }
  });

  socket.on(SOCKET_EVENTS.CLASS_JOIN, async (payload) => {
    try {
      if (!socket.data.user) {
        socket.data.user = socket.user;
      }

      if (!socket.data.user?.id) {
        return error(socket, "Unauthorized");
      }

      if (!isValidClassPayload(payload)) {
        return error(socket, "Invalid class payload");
      }

      await join(io, socket, payload);
    } catch (err) {
      console.error(err);

      error(socket, "Failed to join class");
    }
  });

  socket.on(SOCKET_EVENTS.CLASS_HEARTBEAT, async (payload) => {
    try {
      if (!socket.data.user) {
        socket.data.user = socket.user;
      }

      if (!socket.data.user?.id) return;

      if (!isValidClassPayload(payload)) return;

      await heartbeat(io, socket, payload);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on(SOCKET_EVENTS.CLASS_LEAVE, async (payload) => {
    try {
      if (!isValidClassPayload(payload)) return;

      await leave(io, socket, payload);
    } catch (err) {
      console.error(err);
    }
  });
}
