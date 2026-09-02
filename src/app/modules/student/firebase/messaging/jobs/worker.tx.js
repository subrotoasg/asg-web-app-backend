//This Worker works [individual user and all users]

import { Worker } from "bullmq";
import { sendToTokens } from "../services/sendFcm.js";
import { helperfn } from "../helper/pushMessaging.helper.js";
import { redisConnection } from "../../../../../utlis/redis.js";
import { handleSingleUser } from "../helper/handleSingleUser.js";
import { handleBroadcastAll } from "../helper/handleAllUsers.js";
import { prisma } from "../../../../../../../constants/index.js";
const worker = new Worker(
  "txQueue",
  async (job) => {
    switch (job.name) {
      case "tx":
        return await handleSingleUser(job);
      case "broadcastallUser":
        return await handleBroadcastAll(job);
      default:
        console.log("Unknown job:", job.name);
        return { sent: 0, failed: 0, invalid: 0, name: job.name };
    }
  },
  { connection: redisConnection, concurrency: 30 }
);
//

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
