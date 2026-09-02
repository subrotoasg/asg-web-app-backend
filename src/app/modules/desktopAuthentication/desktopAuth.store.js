import { redisConnection } from "../../utlis/redis.js";
import { DESKTOP_AUTH } from "./desktopAuth.constants.js";

const transactionKey = (transactionId) =>
  `${DESKTOP_AUTH.redisPrefix}:transaction:${transactionId}`;

const exchangeLockKey = (transactionId) =>
  `${DESKTOP_AUTH.redisPrefix}:exchange-lock:${transactionId}`;

const parseTransaction = (raw) => (raw ? JSON.parse(raw) : null);

const saveTransaction = async (
  transactionId,
  transaction,
  ttlSeconds = DESKTOP_AUTH.transactionTtlSeconds,
) => {
  await redisConnection.set(
    transactionKey(transactionId),
    JSON.stringify(transaction),
    "EX",
    ttlSeconds,
  );
  return transaction;
};

const getTransaction = async (transactionId) =>
  parseTransaction(await redisConnection.get(transactionKey(transactionId)));

const createTransaction = async (transactionId, transaction) => {
  const result = await redisConnection.set(
    transactionKey(transactionId),
    JSON.stringify(transaction),
    "EX",
    DESKTOP_AUTH.transactionTtlSeconds,
    "NX",
  );
  return result === "OK";
};

const setTransactionIfStatus = async (
  transactionId,
  expectedStatus,
  transaction,
) => {
  const key = transactionKey(transactionId);
  const serialized = JSON.stringify(transaction);
  const script = `
    local raw = redis.call("get", KEYS[1])
    if not raw then
      return false
    end
    local current = cjson.decode(raw)
    if current.status ~= ARGV[1] then
      return raw
    end
    local ttl = redis.call("ttl", KEYS[1])
    if ttl < 1 then
      ttl = tonumber(ARGV[3])
    end
    redis.call("set", KEYS[1], ARGV[2], "EX", ttl)
    return ARGV[2]
  `;
  const result = await redisConnection.eval(
    script,
    1,
    key,
    expectedStatus,
    serialized,
    DESKTOP_AUTH.transactionTtlSeconds,
  );
  return parseTransaction(result);
};

const acquireExchangeLock = async (transactionId, lockToken) => {
  const result = await redisConnection.set(
    exchangeLockKey(transactionId),
    lockToken,
    "EX",
    DESKTOP_AUTH.exchangeLockTtlSeconds,
    "NX",
  );
  return result === "OK";
};

const releaseExchangeLock = async (transactionId, lockToken) => {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    end
    return 0
  `;

  await redisConnection.eval(
    script,
    1,
    exchangeLockKey(transactionId),
    lockToken,
  );
};

export const desktopAuthStore = {
  createTransaction,
  getTransaction,
  setTransactionIfStatus,
  saveTransaction,
  acquireExchangeLock,
  releaseExchangeLock,
};
