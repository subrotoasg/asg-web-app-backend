import { redisConnection } from "../../../utlis/redis.js";
import { prisma } from "../../../../../constants/index.js";
import {
  CHAT_RETENTION_DAYS,
  CHAT_DELETE_BATCH_SIZE,
  CHAT_DELETE_BATCH_DELAY_MS,
  CHAT_DELETE_MAX_RUNTIME_MS,
} from "./activeChat.constants.js";

const CLEANUP_LOCK_KEY = "lock:cron:activeChat:cleanup";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export const deleteOldActiveChats = async () => {
  const lock = await redisConnection.set(
    CLEANUP_LOCK_KEY,
    String(process.pid),
    "EX",
    3600,
    "NX",
  );

  if (lock !== "OK") {
    console.log("[CHAT CLEANUP] another instance is running, skipping");

    return { skipped: true };
  }

  const startedAt = Date.now();

  const cutoff = new Date(
    startedAt - CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  let totalDeleted = 0;

  let batches = 0;

  try {
    while (true) {
      if (Date.now() - startedAt > CHAT_DELETE_MAX_RUNTIME_MS) {
        console.log("[CHAT CLEANUP] time budget reached, will resume tomorrow");

        break;
      }
      const deleted = await prisma.$executeRaw`
        DELETE FROM "activeChats"
        WHERE "id" IN (
          SELECT "id"
          FROM "activeChats"
          WHERE "createdAt" < ${cutoff}
          ORDER BY "createdAt" ASC
          LIMIT ${CHAT_DELETE_BATCH_SIZE}
        )
      `;

      if (!deleted) {
        break;
      }

      totalDeleted += deleted;

      batches += 1;

      await sleep(CHAT_DELETE_BATCH_DELAY_MS);
    }

    const seconds = Math.round((Date.now() - startedAt) / 1000);

    console.log(
      `[CHAT CLEANUP] deleted ${totalDeleted} rows in ${batches} batches (${seconds}s)`,
    );

    return {
      deleted: totalDeleted,
      batches,
      cutoff,
    };
  } catch (error) {
    console.error("[CHAT CLEANUP] failed", error);
  } finally {
    const owner = await redisConnection.get(CLEANUP_LOCK_KEY);

    if (owner === String(process.pid)) {
      await redisConnection.del(CLEANUP_LOCK_KEY);
    }
  }
};
