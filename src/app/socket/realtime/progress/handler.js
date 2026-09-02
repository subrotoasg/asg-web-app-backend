import { SOCKET_EVENTS } from "../../events.js";

import { PROGRESS } from "../../config/scale.js";

import { updateMeta } from "../watch/redis.js";

import { getKnownRoomSize } from "../watch/broadcaster.js";

import { canUpdateProgress } from "./throttle.js";

import { validateProgressPayload } from "./validator.js";

import { bufferProgress } from "./persistBuffer.js";

import { bufferHistogram, getHistogramSnapshot } from "./histogram.js";

import { metrics } from "../../metrics/index.js";

export default function registerWatchProgressHandler(io, socket) {
  socket.on(SOCKET_EVENTS.WATCH_PROGRESS_UPDATE, async (payload = {}) => {
    try {
      if (!validateProgressPayload(payload)) {
        return;
      }
      if (!canUpdateProgress(socket)) {
        metrics.inc("progress_throttled");

        return;
      }

      const { classType, classId, progress } = payload;

      bufferProgress({
        classType,
        classId,
        user: socket.user,
        progress,
      });

      bufferHistogram({
        classType,
        classId,
        user: socket.user,
        progress,
      });

      if (getKnownRoomSize(classType, classId) > PROGRESS.META_MAX_ROOM_SIZE) {
        return;
      }

      await updateMeta({
        classType,
        classId,
        user: socket.user,
        progressVal: progress,
      });

      metrics.inc("progress_update");
    } catch (error) {
      console.error("WATCH_PROGRESS_UPDATE_ERROR", error);
    }
  });

  socket.on(
    SOCKET_EVENTS.WATCH_PROGRESS_HISTOGRAM_REQUEST,
    async (payload = {}) => {
      try {
        if (!validateProgressPayload(payload, false)) {
          return;
        }

        const now = Date.now();

        if (now - (socket.data.lastHistogramAt || 0) < 5000) {
          metrics.inc("histogram_request_throttled");

          return;
        }

        socket.data.lastHistogramAt = now;

        const snapshot = await getHistogramSnapshot({
          classType: payload.classType,
          classId: payload.classId,
        });

        socket.emit(SOCKET_EVENTS.WATCH_PROGRESS_HISTOGRAM, snapshot);

        metrics.inc("histogram_request");
      } catch (error) {
        console.error("WATCH_HISTOGRAM_REQUEST_ERROR", error);
      }
    },
  );
}
