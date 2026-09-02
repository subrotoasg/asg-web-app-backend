// import { Router } from "express";
// import { BetaAnalyticsDataClient } from "@google-analytics/data";
// import config from "../../../config/index.js";
// import AppErrors from "../../../../errors/AppErrors.js";
// import { StatusCodes } from "http-status-codes";

// const router = Router();

// const analyticsDataClient = new BetaAnalyticsDataClient({
//   credentials: {
//     client_email: config.ga_client_email,
//     private_key: config.ga_private_key?.replace(/\\n/g, "\n"),
//   },
// });

// const CACHE_TTL_MS = 2 * 60 * 1000;

// const STALE_CACHE_TTL_MS = 30 * 60 * 1000;
// const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

// const activeUsersCache = new Map();
// const pendingRequests = new Map();

// let quotaBlockedUntil = 0;

// const getTitleFromQuery = (queryTitle) => {
//   if (Array.isArray(queryTitle)) {
//     return String(queryTitle[0] ?? "").trim();
//   }

//   return String(queryTitle ?? "").trim();
// };

// const isQuotaError = (error) => {
//   const message = `${error?.message ?? ""} ${error?.details ?? ""}`;

//   return (
//     error?.code === 8 ||
//     error?.code === 429 ||
//     message.includes("RESOURCE_EXHAUSTED") ||
//     message.toLowerCase().includes("quota")
//   );
// };

// const fetchActiveUsersFromGA = async (title) => {
//   try {
//     const [response] = await analyticsDataClient.runRealtimeReport({
//       property: `properties/${config.ga_property_id}`,

//       dimensions: [
//         {
//           name: "unifiedScreenName",
//         },
//       ],

//       metrics: [
//         {
//           name: "activeUsers",
//         },
//       ],

//       dimensionFilter: {
//         filter: {
//           fieldName: "unifiedScreenName",
//           stringFilter: {
//             matchType: "EXACT",
//             value: title.trim(),
//           },
//         },
//       },

//       limit: 1,
//       returnPropertyQuota: true,
//     });

//     const value = response?.rows?.[0]?.metricValues?.[0]?.value;

//     if (!value) return 0;

//     return Number(value);
//   } catch (error) {
//     console.error("GA fetch error:", error);
//     return 0;
//   }
// };

// const getActiveUsersWithCache = async (title) => {
//   const cacheKey = `active-users:${title}`;
//   const now = Date.now();

//   const cachedData = activeUsersCache.get(cacheKey);

//   // Fresh cache
//   if (cachedData && cachedData.expiresAt > now) {
//     return {
//       activeUsers: cachedData.activeUsers,
//       cached: true,
//       quotaLimited: false,
//     };
//   }

//   // Quota already blocked
//   if (quotaBlockedUntil > now) {
//     return {
//       activeUsers: cachedData?.activeUsers ?? 3,
//       cached: Boolean(cachedData),
//       quotaLimited: true,
//     };
//   }

//   //
//   const pendingRequest = pendingRequests.get(cacheKey);

//   if (pendingRequest) {
//     const activeUsers = await pendingRequest;

//     return {
//       activeUsers,
//       cached: true,
//       quotaLimited: false,
//     };
//   }

//   const requestPromise = (async () => {
//     try {
//       const activeUsers = await fetchActiveUsersFromGA(title);
//       const updatedAt = Date.now();

//       activeUsersCache.set(cacheKey, {
//         activeUsers,
//         expiresAt: updatedAt + CACHE_TTL_MS,
//         staleUntil: updatedAt + STALE_CACHE_TTL_MS,
//       });

//       return activeUsers;
//     } catch (error) {
//       if (isQuotaError(error)) {
//         quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;
//         if (cachedData && cachedData.staleUntil > Date.now()) {
//           return cachedData.activeUsers;
//         }
//         return 11;
//       }

//       throw error;
//     } finally {
//       pendingRequests.delete(cacheKey);
//     }
//   })();

//   pendingRequests.set(cacheKey, requestPromise);

//   const activeUsers = await requestPromise;

//   return {
//     activeUsers,
//     cached: false,
//     quotaLimited: quotaBlockedUntil > Date.now(),
//   };
// };

// // Optional cache cleanup
// const cleanupInterval = setInterval(
//   () => {
//     const now = Date.now();

//     for (const [key, value] of activeUsersCache.entries()) {
//       if (value.staleUntil < now) {
//         activeUsersCache.delete(key);
//       }
//     }
//   },
//   10 * 60 * 1000,
// );

// if (typeof cleanupInterval.unref === "function") {
//   cleanupInterval.unref();
// }

// router.get("/users", async (req, res, next) => {
//   try {
//     const title = getTitleFromQuery(req.query.title);

//     if (!title) {
//       throw new AppErrors(StatusCodes.BAD_REQUEST, "Title Not Found");
//     }

//     const result = await getActiveUsersWithCache(title);

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       message: result.quotaLimited
//         ? "Returned fallback active users because Google Analytics quota is limited."
//         : "Active users fetched successfully.",
//       data: {
//         activeUsers: result.activeUsers,
//       },
//       meta: {
//         cached: result.cached,
//         quotaLimited: result.quotaLimited,
//       },
//     });
//   } catch (error) {
//     console.error("Google Analytics active users error:", error);
//     return next(error);
//   }
// });

// export const googleAnylitiesRoute = router;

import { Router } from "express";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import config from "../../../config/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { StatusCodes } from "http-status-codes";

const router = Router();

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: config.ga_client_email,
    private_key: config.ga_private_key?.replace(/\\n/g, "\n"),
  },
});

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const STALE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000;

const activeUsersCache = new Map();
const pendingRequests = new Map();

let quotaBlockedUntil = 0;

let lastGaCallTime = 0;
const GA_MIN_INTERVAL = 500;

const getTitleFromQuery = (queryTitle) => {
  if (Array.isArray(queryTitle)) {
    return String(queryTitle[0] ?? "").trim();
  }
  return String(queryTitle ?? "").trim();
};

const isQuotaError = (error) => {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return (
    error?.code === 8 ||
    error?.code === 429 ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota")
  );
};

const fetchActiveUsersFromGA = async (title) => {
  const now = Date.now();
  const wait = GA_MIN_INTERVAL - (now - lastGaCallTime);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastGaCallTime = Date.now();

  const [response] = await analyticsDataClient.runRealtimeReport({
    property: `properties/${config.ga_property_id}`,
    dimensions: [{ name: "unifiedScreenName" }],
    metrics: [{ name: "activeUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "unifiedScreenName",
        stringFilter: {
          matchType: "EXACT",
          value: title.trim(),
        },
      },
    },
    limit: 1,
    returnPropertyQuota: true,
  });

  const value = response?.rows?.[0]?.metricValues?.[0]?.value;

  return Number(value || 0);
};

const smoothValue = (newValue, oldValue) => {
  if (!oldValue) return newValue;

  return Math.round(oldValue * 0.7 + newValue * 0.3);
};

const getActiveUsersWithCache = async (title) => {
  const cacheKey = `active-users:${title}`;
  const now = Date.now();

  const cached = activeUsersCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      activeUsers: cached.activeUsers,
      cached: true,
      quotaLimited: false,
    };
  }

  if (quotaBlockedUntil > now) {
    return {
      activeUsers: cached?.activeUsers ?? 0,
      cached: Boolean(cached),
      quotaLimited: true,
    };
  }

  if (pendingRequests.has(cacheKey)) {
    const activeUsers = await pendingRequests.get(cacheKey);
    return {
      activeUsers,
      cached: true,
      quotaLimited: false,
    };
  }

  const requestPromise = (async () => {
    try {
      const newValue = await fetchActiveUsersFromGA(title);

      const oldValue = cached?.activeUsers;
      const finalValue = smoothValue(newValue, oldValue);

      const updatedAt = Date.now();

      activeUsersCache.set(cacheKey, {
        activeUsers: finalValue,
        expiresAt: updatedAt + CACHE_TTL_MS,
        staleUntil: updatedAt + STALE_CACHE_TTL_MS,
      });

      return finalValue;
    } catch (error) {
      if (isQuotaError(error)) {
        quotaBlockedUntil = Date.now() + QUOTA_COOLDOWN_MS;

        if (cached && cached.staleUntil > Date.now()) {
          return cached.activeUsers;
        }

        return 0;
      }

      throw error;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, requestPromise);

  const activeUsers = await requestPromise;

  return {
    activeUsers,
    cached: false,
    quotaLimited: quotaBlockedUntil > Date.now(),
  };
};

setInterval(
  () => {
    const now = Date.now();

    for (const [key, value] of activeUsersCache.entries()) {
      if (value.staleUntil < now) {
        activeUsersCache.delete(key);
      }
    }
  },
  10 * 60 * 1000,
).unref?.();

router.get("/users", async (req, res, next) => {
  try {
    const title = getTitleFromQuery(req.query.title);

    if (!title) {
      throw new AppErrors(StatusCodes.BAD_REQUEST, "Title Not Found");
    }

    const result = await getActiveUsersWithCache(title);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: result.quotaLimited
        ? "Fallback data used (quota protection active)"
        : "Active users fetched successfully",
      data: {
        activeUsers: result.activeUsers,
      },
      meta: {
        cached: result.cached,
        quotaLimited: result.quotaLimited,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export const googleAnylitiesRoute = router;
