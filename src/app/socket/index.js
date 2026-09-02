import { Server } from "socket.io";

import { createAdapter, createShardedAdapter } from "@socket.io/redis-adapter";

import { instrument } from "@socket.io/admin-ui";

import config from "../config/index.js";

import { redisPubClient, redisSubClient } from "../utlis/redis.js";

import { socketCorsOptions } from "./cors.js";

import socketAuth from "./auth.js";

import registerSocket from "./registerSocket.js";

import {
  startMetricsPublisher,
  stopMetricsPublisher,
} from "./metrics/publisher.js";

import {
  startBroadcaster,
  stopBroadcaster,
} from "./realtime/watch/broadcaster.js";

import { stopPresenceBuffer } from "./realtime/watch/presenceBuffer.js";

import { setChatIo, stopChatBatcher } from "./realtime/chat/batcher.js";

import { stopProgressBuffer } from "./realtime/progress/persistBuffer.js";

import {
  startHistogram,
  stopHistogram,
} from "./realtime/progress/histogram.js";

import { startMetrics } from "./metrics/index.js";

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: socketCorsOptions,

    transports: ["websocket"],

    pingInterval: 25000,

    pingTimeout: 20000,

    perMessageDeflate: false,

    maxHttpBufferSize: 64 * 1024,
    connectTimeout: 20000,
  });

  const useSharded = config.redis_sharded_adapter !== false;

  io.adapter(
    useSharded
      ? createShardedAdapter(redisPubClient, redisSubClient)
      : createAdapter(redisPubClient, redisSubClient),
  );

  io.use(socketAuth);

  setChatIo(io);

  startMetrics();

  startMetricsPublisher(io);

  startBroadcaster(io);

  startHistogram(io);

  registerSocket(io);

  if (config.socket_admin_ui_enabled) {
    instrument(io, {
      auth: {
        type: "basic",
        username: config.socket_admin,
        password: config.socket_admin_pass,
      },
      mode: "production",
    });
  }

  const shutdown = async () => {
    try {
      stopBroadcaster();

      stopChatBatcher();

      await stopHistogram();

      await stopPresenceBuffer();

      await stopProgressBuffer();

      await stopMetricsPublisher();

      io.close();
    } catch (error) {
      console.error("[SOCKET_SHUTDOWN_ERROR]", error);
    }
  };

  process.once("SIGTERM", shutdown);

  process.once("SIGINT", shutdown);

  return io;
}
