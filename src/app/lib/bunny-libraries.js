import { prisma } from "../../../constants/index.js";
import {
  deleteCache,
  getOrLoadCacheWithMissTtl,
} from "../../lib/redis/index.js";
import config from "../config/index.js";
import { BunnyCacheKeys } from "./bunny.cache.keys.js";

const FRESH_TTL_MS = Number(process.env.BUNNY_LIBRARY_CACHE_TTL || 600) * 1000;

const STALE_TTL_MS =
  Number(process.env.BUNNY_LIBRARY_CACHE_STALE_TTL || 1800) * 1000;

const MISS_FRESH_TTL_MS =
  Number(process.env.BUNNY_LIBRARY_CACHE_MISS_TTL || 30) * 1000;

// L1 keeps the hot path off the network entirely. It is per process, so with
// PM2 cluster mode every worker keeps its own copy; the short TTL bounds how
// long a worker can disagree with Redis after an invalidation.
const L1_TTL_MS = Number(process.env.BUNNY_LIBRARY_L1_TTL || 15) * 1000;

const L1_MAX_ENTRIES = 500;

// Library ids come from our own rows, but they end up inside a Redis key, so
// keep them to characters that cannot break the key layout.
const LIBRARY_ID_PATTERN = /^[\w-]{1,64}$/;

const ENV_LIBRARIES = (() => {
  try {
    return JSON.parse(process.env.BUNNY_LIBRARIES || "{}");
  } catch (error) {
    console.error(
      "[bunny-library] BUNNY_LIBRARIES is not valid JSON:",
      error.message,
    );
    return {};
  }
})();

const FALLBACK_HOST = clean(config.bunny_stream_base_url);

const FALLBACK_TOKEN_KEY = config.bunny_Token || "";

const l1 = new Map();

function clean(host) {
  return String(host || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function l1Read(id) {
  const hit = l1.get(id);

  if (!hit) return undefined;

  if (Date.now() - hit.at >= L1_TTL_MS) {
    l1.delete(id);
    return undefined;
  }

  return hit.value;
}

function l1Write(id, value) {
  if (!l1.has(id) && l1.size >= L1_MAX_ENTRIES) {
    const oldest = l1.keys().next().value;

    if (oldest !== undefined) l1.delete(oldest);
  }

  l1.set(id, { at: Date.now(), value });
}

function readEnvLibrary(id) {
  const fromEnv = ENV_LIBRARIES[id];

  if (!fromEnv?.host) return null;

  return {
    libraryId: id,
    host: clean(fromEnv.host),
    tokenKey: fromEnv.tokenKey || FALLBACK_TOKEN_KEY,
  };
}

async function loadLibraryFromDb(id) {
  // No `select` on purpose: deployments differ on whether libApi carries the
  // cdn/token columns yet, and an unknown field in `select` is a hard error.
  const record = await prisma.libApi.findFirst({
    where: { libraryId: id },
  });

  if (!record) return null;

  const host = clean(record.cdnHostname) || FALLBACK_HOST;

  if (!host) return null;

  if (!clean(record.cdnHostname)) {
    console.warn(
      `[bunny-library] ${id} has no cdnHostname, falling back to BUNNY_STREAM_BASE_URL`,
    );
  }

  // Only the fields needed to sign a URL are cached. `apiKey` is a management
  // credential and never leaves the database row.
  return {
    libraryId: id,
    host,
    tokenKey: record.tokenKey || FALLBACK_TOKEN_KEY,
  };
}

export async function getLibrary(libraryId) {
  const id = String(libraryId || "").trim();

  if (!id || !LIBRARY_ID_PATTERN.test(id)) return null;

  const fromEnv = readEnvLibrary(id);

  if (fromEnv) return fromEnv;

  const cached = l1Read(id);

  if (cached !== undefined) return cached;

  let value = null;

  try {
    value = await getOrLoadCacheWithMissTtl({
      key: BunnyCacheKeys.library(id),

      loader: () => loadLibraryFromDb(id),

      freshTtlMs: FRESH_TTL_MS,

      staleTtlMs: STALE_TTL_MS,

      missFreshTtlMs: MISS_FRESH_TTL_MS,

      missStaleTtlMs: MISS_FRESH_TTL_MS,

      lockTtlMs: 5_000,

      waitForFillMs: 3_000,

      jitterRatio: 0.15,
    });
  } catch (error) {
    // Never let a cache problem take playback down: fall back to the database.
    console.error(`[bunny-library] cache read failed: ${id}`, error.message);

    value = await loadLibraryFromDb(id);
  }

  l1Write(id, value ?? null);

  return value ?? null;
}

export async function clearLibraryCache(libraryId) {
  if (!libraryId) {
    l1.clear();
    return;
  }

  const id = String(libraryId).trim();

  l1.delete(id);

  if (!LIBRARY_ID_PATTERN.test(id)) return;

  try {
    await deleteCache(BunnyCacheKeys.library(id));
  } catch (error) {
    console.error(
      `[bunny-library] cache invalidation failed: ${id}`,
      error.message,
    );
  }
}
