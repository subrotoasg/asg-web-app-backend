import IORedis from "ioredis";
import config from "../config/index.js";

const redisOptions = {
  host: config.redis_host || "127.0.0.1",
  port: +config.redis_port || 6379,
  password: config.redis_password || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
};

export const redisConnection = new IORedis(redisOptions);

export const redisPubClient = new IORedis(redisOptions);
export const redisSubClient = new IORedis(redisOptions);

//new added
const cacheRedisOptions = {
  ...redisOptions,
  maxRetriesPerRequest: 1,
  commandTimeout: 1500,
  connectionName: "webapp-cache",
};
export const redisCacheConnection = new IORedis(cacheRedisOptions);

// Health
redisConnection.on("connect", () => {
  console.log(" Redis connected successfully");
});

redisConnection.on("error", (err) => {
  console.error(" Redis connection error:", err);
});

redisPubClient.on("error", (err) => {
  console.error(" Redis pub client error:", err);
});

redisSubClient.on("error", (err) => {
  console.error("Redis sub client error:", err);
});

//new
redisCacheConnection.on("connect", () => {
  console.log("Redis cache connected");
});
redisCacheConnection.on("ready", () => {
  console.log("Redis cache ready");
});

redisCacheConnection.on("error", (error) => {
  console.error("Redis cache error:", error.message);
});

//new end
async function connectIfNeeded(client) {
  if (client.status === "wait") {
    await client.connect();
  }
}

export async function connectRedis() {
  await Promise.all([
    connectIfNeeded(redisConnection),
    connectIfNeeded(redisPubClient),
    connectIfNeeded(redisSubClient),
    connectIfNeeded(redisCacheConnection),
  ]);
  console.log("Redis clients ready");
}

//new added
export async function disconnectRedis() {
  const clients = [
    redisConnection,
    redisPubClient,
    redisSubClient,
    redisCacheConnection,
  ];

  await Promise.allSettled(
    clients.map(async (client) => {
      if (client.status !== "end") {
        await client.quit();
      }
    }),
  );
}
