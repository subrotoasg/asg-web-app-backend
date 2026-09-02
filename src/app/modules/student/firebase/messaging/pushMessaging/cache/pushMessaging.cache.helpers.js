import crypto from "crypto";

const normalizeForHash = (value) => {
  if (Array.isArray(value)) {
    return value?.map(normalizeForHash);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      ?.sort()
      ?.reduce((acc, key) => {
        acc[key] = normalizeForHash(value[key]);

        return acc;
      }, {});
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

export const createCacheHash = (value) => {
  const normalized = normalizeForHash(value);

  return crypto
    ?.createHash("sha256")
    ?.update(JSON.stringify(normalized))
    ?.digest("hex")
    ?.slice(0, 20);
};

export const resolveNotificationUser = (user = {}) => {
  if (user?.studentId) {
    return {
      userType: "student",
      userId: user?.studentId,
    };
  }

  if (user?.adminId) {
    return {
      userType: "admin",
      userId: user?.adminId,
    };
  }

  return {
    userType: null,
    userId: null,
  };
};
