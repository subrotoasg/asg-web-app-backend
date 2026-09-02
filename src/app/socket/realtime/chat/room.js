export function watchPresenceKey(classType, classId) {
  return `presence:watch:${classType}:${classId}`;
}

export function member(user) {
  return `${user?.role}:${user?.id}`;
}
