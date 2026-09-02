import { Queue } from "bullmq";
import { redisConnection } from "../../utlis/redis.js";

export function createQueue(name) {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    },
  });
}
