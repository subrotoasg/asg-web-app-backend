import { VALID_CLASS_TYPES } from "../class/constants.js";

export function validateWatchPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const { classType, classId } = payload;

  if (!VALID_CLASS_TYPES.has(classType)) {
    return false;
  }

  if (!classId || typeof classId !== "string") {
    return false;
  }

  if (classId.length < 8 || classId.length > 80) {
    return false;
  }

  return true;
}
