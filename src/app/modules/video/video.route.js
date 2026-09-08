import { Router } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisConnection } from "../../../lib/redis/index.js";
import { getLibrary } from "../../lib/bunny-libraries.js";
import {
  findVideoContent,
  isValidVideoId,
} from "../../lib/bunny-content.cache.js";
import { signHlsUrl, signThumbnail } from "../../lib/bunnyToken.js";
import { authorizationMiddleware } from "../../middleware/authorization.js";
import { Enums } from "../../constant/enums.js";

const router = Router();

const TTL = Number(process.env.VIDEO_URL_TTL || 7200);

const LOCK_IP = process.env.VIDEO_LOCK_IP === "true";

// Each limiter gets its own prefix: rate-limit-redis defaults to "rl:", so
// limiters that share a prefix and produce the same key share one counter.
const redisStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redisConnection.call(...args),
    prefix,
  });

// Cheap guard that runs before authentication, so a flood of unauthenticated
// requests never reaches the auth lookups.
const ipLimiter = rateLimit({
  store: redisStore("rl:video-session-ip:"),
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" },
});

// Per account, not per IP: a shared campus NAT is one IP, and an abusive
// account rotating IPs is still one account.
const userLimiter = rateLimit({
  store: redisStore("rl:video-session-user:"),
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req?.body?.userIdForLimit || req?.ip),
  message: { error: "rate_limited" },
});

function clientIp(req) {
  // `trust proxy` is configured in app.js, so req.ip is already the client
  // address. Reading x-forwarded-for by hand would take a header the client
  // fully controls and lock the token to whatever it says.
  return String(req.ip || "").replace(/^::ffff:/, "");
}

router.post(
  "/video/session",
  ipLimiter,
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
  ]),
  userLimiter,
  async (req, res) => {
    try {
      const videoId = String(req.body?.videoId || "").trim();

      if (!isValidVideoId(videoId)) {
        return res.status(400).json({ error: "bad_request" });
      }

      const content = await findVideoContent(videoId);

      if (!content) return res.status(404).json({ error: "not_found" });

      const library = await getLibrary(content.libraryId);

      if (!library?.host) {
        console.error(`[video] library ${content.libraryId} not configured`);

        return res.status(500).json({ error: "library_not_configured" });
      }

      // The pull zone key stored on the content row wins: it is the zone the
      // video actually lives behind. The library record is the fallback.
      const securityKey = content.zoneSecurityKey || library.tokenKey;

      if (!securityKey) {
        console.error(`[video] no token key for library ${content.libraryId}`);

        return res.status(500).json({ error: "library_not_configured" });
      }

      const userIp = LOCK_IP ? clientIp(req) : "";

      // Signed URLs are never cached. Signing is a single hash, and a cached
      // token would hand later viewers a link that is already half expired.
      const url = signHlsUrl({
        host: library.host,
        videoId: content.videoUrl,
        securityKey,
        expiresIn: TTL,
        userIp,
      });

      const poster = signThumbnail({
        host: library.host,
        videoId: content.videoUrl,
        securityKey,
        expiresIn: TTL,
      });

      res.set("Cache-Control", "no-store");

      return res.json({ url, poster, expiresIn: TTL });
    } catch (error) {
      console.error("[video] session failed:", error.message);

      return res.status(500).json({ error: "server_error" });
    }
  },
);

export const bunnyRouter = router;
