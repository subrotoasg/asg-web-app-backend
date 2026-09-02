import { Worker } from "bullmq";
import { redisConnection } from "../../utlis/redis.js";

export function createWorker(queueName, processor) {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
  });

  worker.on("completed", (job) => {
    console.log(`[${queueName}] Job completed`, job.id);
  });

  worker.on("failed", (job, err) => {
    console.error(`[${queueName}] Job failed`, job.id, err);
  });

  return worker;
}
