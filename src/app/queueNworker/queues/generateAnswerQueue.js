import { createQueue } from "./queue.js";

export const answerQueue = createQueue("generate-answer-processing");

export async function addGenerateAnswerJob(quoraId) {
  return await answerQueue.add("process", { quoraId });
}
