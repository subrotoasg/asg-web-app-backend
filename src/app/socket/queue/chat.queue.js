import { redisConnection } from "../../utlis/redis.js";
import { SOCKET_EVENTS } from "../events.js";

export async function enqueueChat(message) {
  return redisConnection.xadd(
    SOCKET_EVENTS.WORKER_CHAT_MESSAGE,

    "MAXLEN",
    "~",
    100000,
    "*",
    "data",
    JSON.stringify(message),
  );
}
