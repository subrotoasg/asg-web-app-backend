import { prisma } from "../../../../../constants/index.js";

/* ------------------------------------------------------------------
 * ইভেন্ট বাফার
 * একটা লাইভ ক্লাসে ৫০ হাজার স্টুডেন্ট থাকলে প্রতিটা impression-এ
 * আলাদা INSERT + UPDATE করলে ডাটাবেজই বটলনেক হয়ে যেত। তাই ইভেন্টগুলো
 * মেমোরিতে জমে, আর প্রতি ১০ সেকেন্ডে একবারে লেখা হয় —
 * প্রোগ্রেস বাফার যেভাবে কাজ করে, ঠিক সেভাবেই।
 * ---------------------------------------------------------------- */
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_CHUNK = 500;
const MAX_PENDING_EVENTS = 20_000;

const COUNTER_COLUMN = {
  IMPRESSION: "impressionCount",
  COMPLETE: "completeCount",
  SKIP: "skipCount",
  CLICK: "clickCount",
};

let pendingEvents = [];
let pendingCounters = new Map(); // `${adId}:${type}` -> count
let timer = null;
let flushing = false;

function ensureTimer() {
  if (timer) return;

  timer = setInterval(() => {
    flushAdEvents().catch((error) => {
      console.error("[ads-buffer] flush failed:", error.message);
    });
  }, FLUSH_INTERVAL_MS);

  timer.unref?.();
}

export function bufferAdEvent(event) {
  if (!event?.adId || !event?.type) return;

  const counterKey = `${event.adId}:${event.type}`;
  pendingCounters.set(counterKey, (pendingCounters.get(counterKey) || 0) + 1);

  /* বাফার অস্বাভাবিক বড় হয়ে গেলে নতুন রো ফেলে দিই — কাউন্টার তবু
     ঠিক থাকে, শুধু per-event ইতিহাসটা হারায়। মেমোরি বাঁচানোই আগে। */
  if (pendingEvents.length < MAX_PENDING_EVENTS) {
    pendingEvents.push({
      adId: event.adId,
      type: event.type,
      studentId: event.studentId || null,
      contextScope: event.contextScope || null,
      contextId: event.contextId || null,
      positionSec: Number.isFinite(event.positionSec)
        ? event.positionSec
        : null,
    });
  }

  ensureTimer();
}

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export async function flushAdEvents() {
  if (flushing) return;
  if (!pendingEvents.length && !pendingCounters.size) return;

  flushing = true;

  const events = pendingEvents;
  const counters = pendingCounters;

  pendingEvents = [];
  pendingCounters = new Map();

  try {
    for (const part of chunk(events, FLUSH_CHUNK)) {
      try {
        await prisma.adEvent.createMany({ data: part, skipDuplicates: true });
      } catch (error) {
        console.error("[ads-buffer] event insert failed:", error.message);
      }
    }

    /* কাউন্টার আলাদা করে — ইভেন্ট রো লিখতে না পারলেও সংখ্যা যেন ঠিক থাকে */
    const byAd = new Map();

    for (const [key, count] of counters) {
      const [adId, type] = key.split(":");
      const column = COUNTER_COLUMN[type];
      if (!column) continue;

      const entry = byAd.get(adId) || {};
      entry[column] = (entry[column] || 0) + count;
      byAd.set(adId, entry);
    }

    for (const [adId, increments] of byAd) {
      try {
        await prisma.ad.update({
          where: { id: adId },
          data: Object.fromEntries(
            Object.entries(increments).map(([column, value]) => [
              column,
              { increment: value },
            ]),
          ),
        });
      } catch (error) {
        /* ad ডিলিট হয়ে গেলে এখানে আসবে — লগ করে এগিয়ে যাই */
        console.error(
          `[ads-buffer] counter update failed for ${adId}:`,
          error.message,
        );
      }
    }
  } finally {
    flushing = false;
  }
}

export async function stopAdEventBuffer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await flushAdEvents();
}

process.once("SIGTERM", () => {
  stopAdEventBuffer().catch(() => {});
});
process.once("SIGINT", () => {
  stopAdEventBuffer().catch(() => {});
});
