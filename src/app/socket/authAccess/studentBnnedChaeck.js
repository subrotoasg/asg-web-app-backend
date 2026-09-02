import { RestrictionType } from "../../middleware/studentRestriction.js";

import { SOCKET_EVENTS } from "../events.js";

import { CHAT } from "../config/scale.js";

import { getCachedRestriction } from "./restriction.cache.js";

import { formatRemainingTime } from "./checkRestriction.js";

function buildRestrictionView(restriction) {
  if (!restriction) {
    return null;
  }

  const now = Date.now();

  let message = restriction.reason || "তোমার মেসেজ দেওয়ার অনুমতি নেই";

  let remainingMs = null;

  if (restriction.bannedUntil) {
    const until = new Date(restriction.bannedUntil).getTime();

    remainingMs = until - now;

    if (remainingMs <= 0) {
      return null;
    }

    message += ` অনুগ্রহ করে ${formatRemainingTime(
      remainingMs,
    )} পরে আবার চেষ্টা করো।`;
  }

  return {
    restricted: true,
    id: restriction.id,
    type: restriction.type,
    reason: restriction.reason,
    message,
    bannedAt: restriction.bannedAt,
    bannedUntil: restriction.bannedUntil,
    remainingMs,
    permanent: restriction.bannedUntil === null,
  };
}

async function resolveRestriction(socket) {
  const now = Date.now();

  const memo = socket.data.restrictionMemo;

  if (memo && now - memo.at < CHAT.RESTRICTION_MEMO_MS) {
    return memo.value;
  }

  const restriction = await getCachedRestriction(
    socket.user.id,
    RestrictionType.MEDIA_COMMENT,
  );

  const value = buildRestrictionView(restriction);

  socket.data.restrictionMemo = {
    value,
    at: now,
  };

  return value;
}

export async function ensureChatAllowed(socket) {
  if (socket.user?.role !== "student") {
    return null;
  }

  let restriction = null;

  try {
    restriction = await resolveRestriction(socket);
  } catch (error) {
    console.error("[RESTRICTION_LOOKUP_ERROR]", error);
    return null;
  }

  if (!restriction) {
    return null;
  }

  socket.emit(SOCKET_EVENTS.WATCH_CHAT_BLOCKED, {
    success: false,
    restricted: restriction.restricted,
    message: restriction.message,
    bannedUntil: restriction.bannedUntil,
    remainingMs: restriction.remainingMs,
  });

  return restriction;
}

export function clearRestrictionMemo(socket) {
  socket.data.restrictionMemo = null;
}
