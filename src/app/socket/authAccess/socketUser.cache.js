// import { prisma } from "../../../../constants/index.js";

// import { redisConnection } from "../../utlis/redis.js";

// import { AUTH_CACHE } from "../config/scale.js";

// const MODEL_BY_ROLE = {
//   student: "student",
//   admin: "admin",
//   superAdmin: "superAdmin",
// };

// function cacheKey(role, id) {
//   return `cache:socket:user:v1:${role}:${id}`;
// }

// export async function getSocketUser(role, id) {
//   const modelName = MODEL_BY_ROLE[role];

//   if (!modelName) {
//     return null;
//   }

//   const key = cacheKey(role, id);

//   try {
//     const cached = await redisConnection.get(key);

//     if (cached) {
//       return cached === "null" ? null : JSON.parse(cached);
//     }
//   } catch (error) {
//     console.error("[SOCKET_USER_CACHE_READ_ERROR]", error);
//   }

//   const record = await prisma[modelName].findUnique({
//     where: {
//       id,
//     },
//     select: {
//       id: true,
//       name: true,
//       role: true,
//       profilePhoto: true,
//     },
//   });

//   const user = record
//     ? {
//         id: record.id,
//         role: record.role,
//         name: record.name,
//         avatar: record.profilePhoto,
//         email: "",
//         phone: "",
//       }
//     : null;

//   try {
//     await redisConnection.set(
//       key,
//       JSON.stringify(user),
//       "EX",
//       user ? AUTH_CACHE.USER_TTL_SEC : 30,
//     );
//   } catch (error) {
//     console.error("[SOCKET_USER_CACHE_WRITE_ERROR]", error);
//   }

//   return user;
// }

// export async function invalidateSocketUser(role, id) {
//   await redisConnection.del(cacheKey(role, id));
// }

// export async function allowConnectionFromIp(ip) {
//   if (!ip) {
//     return true;
//   }

//   const key = `rl:socket:ip:${ip}`;

//   try {
//     const count = await redisConnection.incr(key);

//     if (count === 1) {
//       await redisConnection.expire(key, AUTH_CACHE.IP_WINDOW_SEC);
//     }

//     return count <= AUTH_CACHE.IP_CONNECT_LIMIT;
//   } catch (error) {
//     console.error("[SOCKET_IP_LIMIT_ERROR]", error);

//     return true;
//   }
// }

import { prisma } from "../../../../constants/index.js";
import { redisConnection } from "../../utlis/redis.js";
import { AUTH_CACHE } from "../config/scale.js";

const MODEL_BY_ROLE = {
  student: "student",
  admin: "admin",
  superAdmin: "superAdmin",
};

const SELECT_BY_ROLE = {
  student: {
    id: true,
    name: true,
    role: true,
    profilePhoto: true,
  },

  admin: {
    id: true,
    name: true,
    role: true,
    photo: true,
  },

  superAdmin: {
    id: true,
    role: true,
    photo: true,
  },
};

function cacheKey(role, id) {
  return `cache:socket:user:v2:${role}:${id}`;
}

function normalizeSocketUser(role, record) {
  if (!record) {
    return null;
  }

  switch (role) {
    case "student":
      return {
        id: record.id,
        role: record.role || "student",
        name: record.name || "Student",
        avatar: record.profilePhoto || null,
        email: record.email || "",
        phone: record.phone || "",
      };

    case "admin":
      return {
        id: record.id,
        role: record.role || "admin",
        name: record.name || "Teacher",
        avatar: record.photo || null,
        email: record.email || "",
        phone: record.phone || "",
      };

    case "superAdmin":
      return {
        id: record.id,
        role: record.role || "superAdmin",
        name: "Dev Team",
        avatar: record.photo || null,
        email: record.email || "",
        phone: record.phone || "",
      };

    default:
      return null;
  }
}

export async function getSocketUser(role, id) {
  const modelName = MODEL_BY_ROLE[role];
  const select = SELECT_BY_ROLE[role];

  if (!modelName || !select || !id) {
    return null;
  }

  const key = cacheKey(role, id);

  // 1. Read cache
  try {
    const cached = await redisConnection.get(key);

    if (cached) {
      return cached === "null" ? null : JSON.parse(cached);
    }
  } catch (error) {
    console.error("[SOCKET_USER_CACHE_READ_ERROR]", error);
  }

  // 2. Read database
  let record;

  try {
    record = await prisma[modelName].findUnique({
      where: {
        id,
      },
      select,
    });
  } catch (error) {
    console.error("[SOCKET_USER_DB_ERROR]", {
      role,
      id,
      modelName,
      message: error?.message,
    });

    return null;
  }

  // 3. Normalize different DB models
  const user = normalizeSocketUser(role, record);

  // 4. Cache result
  try {
    await redisConnection.set(
      key,
      JSON.stringify(user),
      "EX",
      user ? AUTH_CACHE.USER_TTL_SEC : 30,
    );
  } catch (error) {
    console.error("[SOCKET_USER_CACHE_WRITE_ERROR]", error);
  }

  return user;
}

export async function invalidateSocketUser(role, id) {
  if (!role || !id) {
    return;
  }

  try {
    await redisConnection.del(cacheKey(role, id));
  } catch (error) {
    console.error("[SOCKET_USER_CACHE_DELETE_ERROR]", error);
  }
}

export async function allowConnectionFromIp(ip) {
  if (!ip) {
    return true;
  }

  const key = `rl:socket:ip:${ip}`;

  try {
    const count = await redisConnection.incr(key);

    if (count === 1) {
      await redisConnection.expire(key, AUTH_CACHE.IP_WINDOW_SEC);
    }

    return count <= AUTH_CACHE.IP_CONNECT_LIMIT;
  } catch (error) {
    console.error("[SOCKET_IP_LIMIT_ERROR]", error);

    return true;
  }
}
