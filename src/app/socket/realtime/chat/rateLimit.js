import { CHAT } from "../../config/scale.js";

export function consumeChatToken(socket) {
  const now = Date.now();

  const bucket = socket.data.chatBucket || {
    tokens: CHAT.BURST,
    at: now,
  };

  const elapsedSec = (now - bucket.at) / 1000;

  const tokens = Math.min(
    CHAT.BURST,
    bucket.tokens + elapsedSec * CHAT.REFILL_PER_SEC,
  );

  if (tokens < 1) {
    socket.data.chatBucket = {
      tokens,
      at: now,
    };

    return false;
  }

  socket.data.chatBucket = {
    tokens: tokens - 1,
    at: now,
  };

  return true;
}

export function canSendTyping(socket) {
  const now = Date.now();

  const last = socket.data.lastTypingAt || 0;

  if (now - last < CHAT.TYPING_MIN_INTERVAL_MS) {
    return false;
  }

  socket.data.lastTypingAt = now;

  return true;
}
