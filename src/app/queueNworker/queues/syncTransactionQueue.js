import { createQueue } from "./queue.js";

export const syncTransactionQueue = createQueue("syncTransaction-processing");

export async function addSyncTransactionQueue(tranxId) {
  return await syncTransactionQueue.add("process", { tranxId });
}
