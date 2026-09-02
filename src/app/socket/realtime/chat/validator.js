import { VALID_CLASS_TYPES } from "../class/constants.js";

export function validateWatchPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const { classType, classId } = payload;

  if (!VALID_CLASS_TYPES.has(classType)) {
    return false;
  }

  if (typeof classId !== "string") {
    return false;
  }

  const id = classId.trim();

  if (!id) {
    return false;
  }

  if (id.length < 8 || id.length > 80) {
    return false;
  }

  return true;
}

export function validateWatchChatPayload(payload) {
  if (!validateWatchPayload(payload)) {
    return false;
  }

  if (typeof payload.message !== "string") {
    return false;
  }

  const message = payload.message.trim();

  if (!message) {
    return false;
  }

  if (message.length > 1000) {
    return false;
  }

  return true;
}
