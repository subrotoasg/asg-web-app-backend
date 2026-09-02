import { redisConnection } from "../../utlis/redis.js";
import { CHAT_WORKER } from "../config/streams.js";
import { saveChats, saveChatOne } from "../services/chat.service.js";

const { STREAM, GROUP, CONSUMER, COUNT, BLOCK, MIN_IDLE, DEAD_LETTER } =
  CHAT_WORKER || {};

let stopping = false;

let saved = 0;

let failed = 0;

async function ensureConsumerGroup() {
  try {
    await redisConnection.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch (err) {
    if (!err.message.includes("BUSYGROUP")) {
      throw err;
    }
  }
}

function parseEntries(entries) {
  const parsedMessages = [];

  const streamIds = [];

  const badIds = [];

  for (const [streamId, fields] of entries) {
    try {
      const [, rawData] = fields;

      parsedMessages.push(JSON.parse(rawData));

      streamIds.push(streamId);
    } catch {
      badIds.push(streamId);
    }
  }

  return { parsedMessages, streamIds, badIds };
}

async function ack(ids) {
  if (!ids.length) {
    return;
  }

  await redisConnection.xack(STREAM, GROUP, ...ids);
}

async function deadLetter(id, message, reason) {
  try {
    await redisConnection.xadd(
      DEAD_LETTER,
      "MAXLEN",
      "~",
      10000,
      "*",
      "data",
      JSON.stringify(message ?? null),
      "reason",
      String(reason).slice(0, 500),
    );
  } catch (error) {
    console.error("[CHAT WORKER] dead letter failed", error);
  }

  await ack([id]);

  failed += 1;
}

async function handleBatch(entries) {
  const { parsedMessages, streamIds, badIds } = parseEntries(entries);

  for (const id of badIds) {
    await deadLetter(id, null, "invalid json");
  }

  if (!parsedMessages.length) {
    return;
  }

  try {
    await saveChats(parsedMessages);

    await ack(streamIds);

    saved += parsedMessages.length;

    return;
  } catch (error) {
    console.error(
      "[CHAT WORKER] batch failed, retrying one by one",
      error.message,
    );
  }

  for (let i = 0; i < parsedMessages.length; i += 1) {
    const id = streamIds[i];

    const message = parsedMessages[i];

    try {
      await saveChatOne(message);

      await ack([id]);

      saved += 1;
    } catch (error) {
      await deadLetter(id, message, error.message);
    }
  }
}

async function reclaimStuck() {
  try {
    const [, entries] = await redisConnection.xautoclaim(
      STREAM,
      GROUP,
      CONSUMER,
      MIN_IDLE,
      "0",
      "COUNT",
      COUNT,
    );

    if (entries?.length) {
      await handleBatch(entries);
    }
  } catch (error) {
    console.error("[CHAT WORKER] xautoclaim failed", error.message);
  }
}

async function logHealth() {
  try {
    const length = await redisConnection.xlen(STREAM);

    const pending = await redisConnection.xpending(STREAM, GROUP);

    console.log(
      `[CHAT WORKER] saved=${saved} failed=${failed} streamLen=${length} pending=${
        pending?.[0] || 0
      }`,
    );

    saved = 0;

    failed = 0;
  } catch (error) {
    console.error("[CHAT WORKER] health check failed", error.message);
  }
}

async function consume() {
  let sinceReclaim = 0;

  while (!stopping) {
    try {
      const response = await redisConnection.xreadgroup(
        "GROUP",
        GROUP,
        CONSUMER,
        "COUNT",
        COUNT,
        "BLOCK",
        BLOCK,
        "STREAMS",
        STREAM,
        ">",
      );

      if (response) {
        for (const [, entries] of response) {
          await handleBatch(entries);
        }
      }

      sinceReclaim += 1;

      if (sinceReclaim >= 20) {
        sinceReclaim = 0;

        await reclaimStuck();
      }
    } catch (err) {
      console.error("[CHAT WORKER]", err);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startWorker() {
  console.log(`[CHAT WORKER] starting as ${CONSUMER}`);

  await ensureConsumerGroup();

  await reclaimStuck();

  const healthTimer = setInterval(() => {
    logHealth().catch(() => {});
  }, 60000);

  healthTimer.unref();

  await consume();
}

function shutdown() {
  stopping = true;

  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);

startWorker().catch((err) => {
  console.error(err);

  process.exit(1);
});
