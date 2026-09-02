import { createQueue } from "./queue.js";

export const embedQueue = createQueue("embed-processing");

export async function addEmbedJob(quoraId, content = "", ocrContent = "") {
  return await embedQueue.add("process", { quoraId, content, ocrContent });
}
