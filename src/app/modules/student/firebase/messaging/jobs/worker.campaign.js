//This Worker works [Course based or cycle based users]
import { Worker } from "bullmq";
import { redisConnection } from "../../../../../utlis/redis.js";
import { createThrottle } from "../utils/throttle.js";
import { sendToTokens } from "../services/sendFcm.js";
import { helperfn } from "../helper/pushMessaging.helper.js";
import { prisma } from "../../../../../../../constants/index.js";
import { acquireLock, releaseLock } from "../utils/dedup.js";

const throttle = createThrottle({ maxBatchesPerSec: 10 });

const worker = new Worker(
  "campaignQueue",
  async (job) => {
    if (job.name !== "broadcast") return;

    const { uuid, type, id, title, body, data } = job.data;

    // Acquire Lock
    const gotLock = await acquireLock(uuid, 300);
    if (!gotLock) {
      console.log(
        `Notification ${uuid} already being processed by another worker`
      );
      return;
    }
    try {
      let sent = 0;
      let failed = 0;
      let invalid = 0;

      const pager =
        type === "course"
          ? helperfn.courseStudentIdPages(id, 5000)
          : type === "cycle"
            ? helperfn.cycleStudentIdPages(id, 5000)
            : null;

      if (!pager) return;

      for await (const studentIds of pager) {
        const tokens = await helperfn.getTokensByStudentIds(studentIds);
        if (!tokens.length) continue;

        await throttle.wait();
        const res = await sendToTokens(tokens, { title, body, data });

        sent += res.success;
        failed += res.failure;

        if (res.invalidTokens.length) {
          invalid += res.invalidTokens.length;
          await helperfn.invalidateTokens(res.invalidTokens);
        }
      }
      // for admin notification
      const pagerAdmin =
        type === "course"
          ? helperfn.courseAdminIdPages(id, 5000)
          : type === "cycle"
            ? helperfn.cycleAdminIdPages(id, 5000)
            : null;
      if (!pagerAdmin) return;

      for await (const adminIds of pagerAdmin) {
        const tokens = await helperfn.getTokensByAdminIds(adminIds);
        if (!tokens.length) continue;

        await throttle.wait();
        const res = await sendToTokens(tokens, { title, body, data });

        sent += res.success;
        failed += res.failure;

        if (res.invalidTokens.length) {
          invalid += res.invalidTokens.length;
          await helperfn.invalidateTokens(res.invalidTokens);
        }
      }

      return { uniqueId: uuid, sent, failed, invalid };
    } catch (error) {
      console.log(error);
    } finally {
      await releaseLock(uuid);
      console.log(`Lock released for ${uuid}`);
    }
  },
  { connection: redisConnection, concurrency: 30 }
);

worker.on("completed", async (job, result) => {
  if (!result?.uniqueId) {
    console.warn("No uniqueId in result, skipping DB update");
    return;
  }

  try {
    await prisma.notificationLog.updateMany({
      where: { uniqueId: result.uniqueId },
      data: {
        sendCount: { increment: result?.sent || 0 },
        failedCount: { increment: result?.failed || 0 },
        invalidCount: { increment: result?.invalid || 0 },
      },
    });

    console.dir(`notificationLog updated for ${(result.uniqueId, result)}`, {
      depth: null,
    });
  } catch (err) {
    console.error("Failed to update notificationLog", err);
  }
});
