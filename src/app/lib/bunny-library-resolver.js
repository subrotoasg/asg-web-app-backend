import axios from "axios";
import { prisma } from "../../../constants/index.js";
import config from "../config/index.js";
import { clearLibraryCache } from "./bunny-libraries.js";

const BUNNY_API_BASE = "https://api.bunny.net";

const REQUEST_TIMEOUT_MS = Number(process.env.BUNNY_API_TIMEOUT_MS || 10_000);

const MAX_ATTEMPTS = Number(process.env.BUNNY_API_MAX_ATTEMPTS || 3);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class BunnyResolveError extends Error {
  constructor(message, { libraryId, status } = {}) {
    super(message);

    this.name = "BunnyResolveError";

    this.libraryId = libraryId;

    this.status = status ?? null;
  }
}

function isRetryable(error) {
  const status = error?.response?.status;

  // No response at all means a timeout or a network fault, which is worth
  // another try. A 4xx other than 429 will fail identically forever.
  if (!status) return true;

  return status === 429 || status >= 500;
}

function retryDelayMs(error, attempt) {
  const retryAfter = Number(error?.response?.headers?.["retry-after"]);

  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 30_000);
  }

  const base = 500 * 2 ** (attempt - 1);

  return base + Math.floor(Math.random() * 250);
}

async function bunnyGet(path, accessKey, { libraryId } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.get(`${BUNNY_API_BASE}${path}`, {
        headers: { AccessKey: accessKey },

        timeout: REQUEST_TIMEOUT_MS,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;

      await sleep(retryDelayMs(error, attempt));
    }
  }

  const status = lastError?.response?.status ?? null;

  throw new BunnyResolveError(
    `GET ${path} failed${status ? ` with ${status}` : ""}: ${lastError?.message}`,
    { libraryId, status },
  );
}

/**
 * Pick the hostname to sign against.
 *
 * The system hostname (vz-*.b-cdn.net) is the one Bunny always keeps valid for
 * a stream pull zone, so it is preferred over custom CNAMEs that may not have
 * a certificate yet.
 */
export function pickHostname(hostnames) {
  const usable = (Array.isArray(hostnames) ? hostnames : [])?.filter(
    (entry) => entry?.Value,
  );

  if (!usable.length) return null;

  const system = usable.find((entry) => entry?.IsSystemHostname);

  if (system) return system.Value;

  const certified = usable.find((entry) => entry?.HasCertificate);

  return (certified || usable[0]).Value;
}

/**
 * The account level key that may read /videolibrary and /pullzone. A course
 * pulled with its own Bunny account carries its key; everything else falls
 * back to the platform key.
 */
export async function getAccessKeyForLibrary(libraryId) {
  const course = await prisma.course.findFirst({
    where: {
      libraryId,
      bunnyApiKey: { not: null },
    },

    select: { bunnyApiKey: true },
  });

  return course?.bunnyApiKey || config.bunny_main_api_key || null;
}

/**
 * Read the CDN hostname and the token signing key for a video library
 * straight from Bunny: library -> pull zone -> hostnames + ZoneSecurityKey.
 */
export async function resolveLibraryConfig({ libraryId, accessKey }) {
  const id = String(libraryId || "").trim();

  if (!id) {
    throw new BunnyResolveError("libraryId is required", { libraryId: id });
  }

  const key = accessKey || (await getAccessKeyForLibrary(id));

  if (!key) {
    throw new BunnyResolveError(
      "no Bunny access key available (set BUNNY_MAIN_API_KEY or course.bunnyApiKey)",
      { libraryId: id },
    );
  }

  const library = await bunnyGet(`/videolibrary/${id}`, key, { libraryId: id });

  const pullZoneId = library?.PullZoneId;

  if (!pullZoneId) {
    throw new BunnyResolveError("video library has no PullZoneId", {
      libraryId: id,
    });
  }

  const pullZone = await bunnyGet(`/pullzone/${pullZoneId}`, key, {
    libraryId: id,
  });

  const cdnHostname = pickHostname(pullZone?.Hostnames);

  if (!cdnHostname) {
    throw new BunnyResolveError("pull zone has no usable hostname", {
      libraryId: id,
    });
  }

  return {
    libraryId: id,

    pullZoneId: String(pullZoneId),

    cdnHostname,

    tokenKey: pullZone?.ZoneSecurityKey || null,

    // Bunny ignores the token when the zone has token auth switched off, so a
    // signed URL would silently become a public one.
    zoneSecurityEnabled: Boolean(pullZone?.ZoneSecurityEnabled),

    hostnames: (pullZone?.Hostnames || [])
      ?.map((entry) => entry?.Value)
      ?.filter(Boolean),
  };
}

/**
 * Fill cdnHostname / tokenKey on a libApi row from Bunny, and drop the cached
 * copy so every worker picks the new values up.
 *
 * Returns a result object rather than throwing, so callers can log and move on.
 */
export async function ensureLibraryConfig(libraryId, options = {}) {
  const { force = false, dryRun = false, accessKey } = options;

  const id = String(libraryId || "").trim();

  if (!id) return { libraryId: id, status: "invalid" };

  const record = await prisma.libApi.findFirst({
    where: { libraryId: id },

    select: { id: true, cdnHostname: true, tokenKey: true },
  });

  if (!record) return { libraryId: id, status: "missing_row" };

  if (!force && record.cdnHostname && record.tokenKey) {
    return { libraryId: id, status: "skipped", reason: "already_filled" };
  }

  try {
    const resolved = await resolveLibraryConfig({ libraryId: id, accessKey });

    if (dryRun) {
      return { libraryId: id, status: "would_update", resolved };
    }

    await prisma.libApi.update({
      where: { id: record.id },

      data: {
        cdnHostname: resolved.cdnHostname,

        // Keep whatever is stored if Bunny returns nothing, rather than
        // wiping a working key.
        tokenKey: resolved.tokenKey || record.tokenKey || null,
      },
    });

    await clearLibraryCache(id);

    return { libraryId: id, status: "updated", resolved };
  } catch (error) {
    return {
      libraryId: id,

      status: "failed",

      error: error?.message || String(error),
    };
  }
}
