import { createQueue } from "./queue.js";

export const courseCloneQueue = createQueue("course-clone-processing");

export async function courseCloneJob(payload) {
  return await courseCloneQueue.add("process", payload);
}
