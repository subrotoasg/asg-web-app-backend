import { createQueue } from "./queue.js";

export const ocrQueue = createQueue("ocr-processing");

export async function addOcrJob(quoraId) {
  return await ocrQueue.add("process", { quoraId });
}
