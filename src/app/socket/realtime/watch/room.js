import { PRESENCE } from "../../config/scale.js";

export function watchRoom(classType, classId) {
  return `watch:${classType}:${classId}`;
}

export function watchPresenceKey(classType, classId) {
  return `presence:watch:${classType}:${classId}`;
}

export function watchMetaKey(classType, classId) {
  return `meta:watch:${classType}:${classId}`;
}

export function watchChatKey(classType, classId) {
  return `chat:watch:${classType}:${classId}`;
}

export function watchProgressKey(classType, classId) {
  return `progress:watch:${classType}:${classId}`;
}

export function watchHllKey(classType, classId, bucket) {
  return `hll:watch:${classType}:${classId}:${bucket}`;
}

export function currentBucket(now = Date.now()) {
  return Math.floor(now / PRESENCE.BUCKET_MS);
}

export function watchHllWindowKeys(classType, classId, now = Date.now()) {
  const bucket = currentBucket(now);

  const keys = [];

  for (let i = 0; i < PRESENCE.WINDOW_BUCKETS; i += 1) {
    keys.push(watchHllKey(classType, classId, bucket - i));
  }

  return keys;
}

export function watchLastCountKey(classType, classId) {
  return `lastcount:watch:${classType}:${classId}`;
}

export function member(user) {
  return `${user?.role}:${user?.id}`;
}

export function roomIndexKey(classType, classId) {
  return `${classType}:${classId}`;
}
