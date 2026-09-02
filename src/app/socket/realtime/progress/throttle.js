import { PROGRESS } from "../../config/scale.js";
export function canUpdateProgress(socket) {
  if (!socket.user?.id) {
    return false;
  }

  const now = Date.now();

  const last = socket.data.lastProgressAt || 0;

  if (now - last < PROGRESS.MIN_INTERVAL_MS) {
    return false;
  }

  socket.data.lastProgressAt = now;

  return true;
}

export function clearProgressThrottle(socket) {
  if (socket?.data) {
    socket.data.lastProgressAt = 0;
  }
}
