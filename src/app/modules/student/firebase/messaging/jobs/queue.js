import { Queue } from "bullmq";
import { redisConnection } from "../../../../../utlis/redis.js";

export const campaignQueue = new Queue("campaignQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 2000,
    removeOnFail: 5000,
  },
});

export const txQueue = new Queue("txQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 5000,
    removeOnFail: 10000,
  },
});
