import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisConnection } from "../app/utlis/redis.js";
import { CookieHelper } from "./cookieHelper.js";
import { verifyToken } from "../app/modules/grandCelebration/auth/auth.utlis.js";
import config from "../app/config/index.js";

const normalizeIdentifier = (value = "") => value.trim().toLowerCase();

export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 20000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later",
});

export const signUpRouteIpLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests form this IP, please try again later!",
});

export const verifyCredentialIpLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests form this IP, please try again later!",
});

export const verifyCredentialDeepLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => {
    return (
      normalizeIdentifier(req?.body?.phone) ||
      normalizeIdentifier(req?.body?.email) ||
      req?.ip
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many verify attempts, please try again later!",
});

export const signUpRouteDeepRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => {
    return (
      normalizeIdentifier(req?.body?.phone) ||
      normalizeIdentifier(req?.body?.email) ||
      req?.ip
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many signup attempts, please try again later!",
});

export const logInRouteLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 5 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => {
    return normalizeIdentifier(req?.body?.emailOrPhone) || req?.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts, please try again later!",
});

export const refreshTokenRouteLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many refresh token attempts, please try again later!",
});

export const changePasswordRouteLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => {
    return normalizeIdentifier(req?.body?.userIdForLimit) || req?.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many password change attempts, please try again later!",
});

export const forgetPasswordRouteIpLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later!",
});

export const forgetPasswordRouteDeepLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => {
    return normalizeIdentifier(req?.body?.email) || req?.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many password reset attempts, please try again later!",
});

export const resetPasswordRouteLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 5000,
  keyGenerator: (req) => {
    return (
      normalizeIdentifier(req?.body?.email) ||
      normalizeIdentifier(req?.body?.resetToken) ||
      req?.ip
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many password reset attempts, please try again later!",
});

export const verifyCredentialDeepLimiterForGC = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => {
    return normalizeIdentifier(req?.body?.phone) || req?.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many Request, please try again later!",
});

export const verifyCredentialDeepLimiterForGCResendOTP = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
  }),
  windowMs: 10 * 60 * 1000,
  max: 50,

  keyGenerator: (req) => {
    try {
      const hostName = CookieHelper.getFrontendHost(req);
      const cookieKey = CookieHelper.refreshCookieName(hostName);

      const token = req.cookies?.[cookieKey];

      if (token) {
        const decoded = verifyToken(token, config.auth_refresh_temp_key);

        return `gc:${decoded.id}`;
      }
    } catch (err) {
      // ignore
    }

    return normalizeIdentifier(req.body?.phone) || req.ip;
  },

  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many Request, please try again later!",
});
