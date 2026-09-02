export function classRoomKey(classType, classId) {
  return `class:${classType}:${classId}`;
}

export function classPresenceKey(classType, classId) {
  return `presence:class:${classType}:${classId}`;
}

export function classThrottleKey(classType, classId) {
  return `${classType}:${classId}`;
}
