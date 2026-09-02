export function watchProgressKey(classType, classId) {
  return `progress:watch:${classType}:${classId}`;
}

export function member(user) {
  return `${user.role}:${user.id}`;
}
