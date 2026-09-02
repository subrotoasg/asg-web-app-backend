import { createQueue } from "./queue.js";

export const answerCommentQueue = createQueue(
  "generate-answer-comment-processing"
);

export async function addGenerateAnswerCommentJob(answerId) {
  return await answerCommentQueue.add("process", { answerId });
}
