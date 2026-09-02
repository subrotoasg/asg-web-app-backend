const progressCache = new Map();

export function getCachedProgress(classType, classId) {
  const key = `${classType}:${classId}`;
  const entry = progressCache.get(key);
  if (entry && Date.now() - entry.timestamp < 5000) {
    return entry.data;
  }
  return null;
}

export function setCachedProgress(classType, classId, data) {
  const key = `${classType}:${classId}`;
  progressCache.set(key, { data, timestamp: Date.now() });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of progressCache) {
    if (now - entry.timestamp > 60000) {
      progressCache.delete(key);
    }
  }
}, 600000);
