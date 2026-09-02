import { VALID_CLASS_TYPES } from "../class/constants.js";

export function validateProgressPayload(payload, requireProgress = true) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (!VALID_CLASS_TYPES.has(payload.classType)) {
    return false;
  }

  if (typeof payload.classId !== "string") {
    return false;
  }

  if (requireProgress) {
    if (!payload.progress || typeof payload.progress !== "object") {
      return false;
    }
  }

  return true;
}
