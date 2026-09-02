import { redisCacheConnection } from "../../app/utlis/redis.js";

export const getCache = async (key) => {
  try {
    const data = await redisCacheConnection.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Redis GET error:", error.message);

    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = 30) => {
  try {
    await redisCacheConnection.set(
      key,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );

    return true;
  } catch (error) {
    console.error("Redis SET error:", error.message);

    return false;
  }
};

export const deleteCache = async (key) => {
  try {
    await redisCacheConnection.del(key);

    return true;
  } catch (error) {
    console.error("Redis DEL error:", error.message);

    return false;
  }
};
