import { tryCatch } from "bullmq";
import { sendToTokens } from "../services/sendFcm.js";
import { acquireLock, releaseLock } from "../utils/dedup.js";
import { createThrottle } from "../utils/throttle.js";
import { helperfn } from "./pushMessaging.helper.js";

const throttle = createThrottle({ maxBatchesPerSec: 10 });

export async function handleBroadcastAll(job) {
  const { uuid, title, body, data } = job?.data || {};
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

    const pager = helperfn.allUsersPages(5000);

    for await (const tokens of pager) {
      if (!tokens.length) continue;

      await throttle.wait();

      const res = await sendToTokens(tokens, { title, body, data });

      sent += res.success || 0;
      failed += res.failure || 0;

      if (res.invalidTokens?.length) {
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
}
