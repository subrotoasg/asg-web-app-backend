import { PROGRESS } from "../../config/scale.js";
import { metrics } from "../../metrics/index.js";

const pending = new Map();

let timer = null;
let flushing = false;

function bufferKey(classType, classId, user) {
  return `${classType}:${classId}:${user?.role}:${user?.id}`;
}

export function bufferProgress({ classType, classId, user, progress }) {
  if (!user?.id || !progress) {
    return;
  }

  pending.set(bufferKey(classType, classId, user), {
    key: bufferKey(classType, classId, user),
    classType,
    classId,
    userId: user.id,
    role: user.role,
    currentTime: Number(progress.currentTime) || 0,
    duration: Number(progress.duration) || 0,
    percent: Number(progress.progress) || 0,
    updatedAt: new Date(),
  });

  ensureTimer();
}

function ensureTimer() {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    flushProgress().catch((error) => {
      console.error("[PROGRESS_FLUSH_ERROR]", error);
    });
  }, PROGRESS.DB_FLUSH_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function chunk(list, size) {
  const chunks = [];

  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }

  return chunks;
}

function requeue(rows) {
  for (const row of rows) {
    if (!pending.has(row.key)) {
      pending.set(row.key, row);
    }
  }
}

export async function flushProgress() {
  if (flushing || !pending.size) {
    return;
  }

  flushing = true;

  try {
    const rows = [...pending.values()];

    pending.clear();

    for (const part of chunk(rows, PROGRESS.DB_FLUSH_CHUNK)) {
      try {
        await persistChunk(part);
      } catch (error) {
        console.error("[PROGRESS_PERSIST_ERROR]", error);

        metrics.inc("progress_persist_failed", part.length);
        requeue(part);
      }
    }
  } finally {
    flushing = false;
  }
}

async function persistChunk(rows) {
  if (!rows.length) {
    return;
  }

  metrics.inc("progress_persist_pending", rows.length);
}

export function toProgressRow(row) {
  if (row.role !== "student") {
    return null;
  }

  return {
    studentId: row?.userId,

    classContentId: row?.classType === "CLASS_CONTENT" ? row.classId : null,

    cycleContentId: row?.classType === "CYCLE_CONTENT" ? row.classId : null,

    currentTime: row?.currentTime,
    duration: row?.duration,
    percent: row?.percent,
    updatedAt: row?.updatedAt,
  };
}

export async function stopProgressBuffer() {
  if (timer) {
    clearInterval(timer);

    timer = null;
  }

  await flushProgress();
}
