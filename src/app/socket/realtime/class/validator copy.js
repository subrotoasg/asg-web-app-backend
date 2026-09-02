import { VALID_CLASS_TYPES } from "./constants.js";

export function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    id: user?.id,
    role: user?.role,
    name: user?.name ? String(user.name).slice(0, 120) : null,
    email: user?.email ? String(user.email).slice(0, 180) : null,
    phone: user?.phone ? String(user.phone).slice(0, 40) : null,
  };
}

export function isStudentUser(user) {
  return user?.role === "student";
}

export function makePresenceMember(user) {
  return `${user?.role}:${user?.id}`;
}

export function isValidClassPayload(payload) {
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
