import { prisma } from "../../../constants/index.js";
import {
  deleteCache,
  getOrLoadCacheWithMissTtl,
} from "../../lib/redis/index.js";
import { BunnyCacheKeys } from "./bunny.cache.keys.js";

const FRESH_TTL_MS = Number(process.env.BUNNY_CONTENT_CACHE_TTL || 300) * 1000;

const STALE_TTL_MS =
  Number(process.env.BUNNY_CONTENT_CACHE_STALE_TTL || 900) * 1000;

// Unknown ids are cached briefly as well. Without it, anyone hitting the
// endpoint with random ids runs two uncached table lookups per request.
const MISS_FRESH_TTL_MS =
  Number(process.env.BUNNY_CONTENT_CACHE_MISS_TTL || 30) * 1000;

export const VIDEO_ID_PATTERN = /^[\w-]{10,}$/;

export function isValidVideoId(videoId) {
  return VIDEO_ID_PATTERN.test(String(videoId || ""));
}

function project(content, kind) {
  return {
    kind,
    id: content.id,
    libraryId: content.libraryId,
    videoUrl: content.videoUrl,
    zoneSecurityKey: content.zoneSecurityKey || null,
  };
}

async function loadContentFromDb(videoId) {
  const select = {
    id: true,
    libraryId: true,
    videoUrl: true,
    zoneSecurityKey: true,
  };

  const classContent = await prisma.classContent.findFirst({
    where: { videoUrl: videoId, hostingType: "bunny", isDeleted: false },
    select,
  });

  if (classContent) return project(classContent, "class");

  const cycleContent = await prisma.cycleContent.findFirst({
    where: { videoUrl: videoId, hostingType: "bunny", isDeleted: false },
    select,
  });

  if (cycleContent) return project(cycleContent, "cycle");

  return null;
}

/**
 * Resolve a Bunny video id to the row that owns it.
 *
 * Cached because the lookup runs on every playback request, matches on a
 * non-unique column in two tables, and the answer only changes when an admin
 * edits or deletes the content (both of which invalidate the key).
 */
export async function findVideoContent(videoId) {
  const id = String(videoId || "").trim();

  if (!isValidVideoId(id)) return null;

  try {
    return await getOrLoadCacheWithMissTtl({
      key: BunnyCacheKeys.content(id),

      loader: () => loadContentFromDb(id),

      freshTtlMs: FRESH_TTL_MS,

      staleTtlMs: STALE_TTL_MS,

      missFreshTtlMs: MISS_FRESH_TTL_MS,

      missStaleTtlMs: MISS_FRESH_TTL_MS,

      lockTtlMs: 5_000,

      waitForFillMs: 3_000,

      jitterRatio: 0.15,
    });
  } catch (error) {
    console.error(`[bunny-content] cache read failed: ${id}`, error.message);

    return loadContentFromDb(id);
  }
}

export async function invalidateVideoContent(...videoIds) {
  const ids = [
    ...new Set(
      videoIds
        ?.flat()
        ?.map((value) => String(value || "").trim())
        ?.filter((value) => isValidVideoId(value)),
    ),
  ];

  if (!ids.length) return;

  await Promise.all(
    ids.map(async (id) => {
      try {
        await deleteCache(BunnyCacheKeys.content(id));
      } catch (error) {
        console.error(
          `[bunny-content] cache invalidation failed: ${id}`,
          error.message,
        );
      }
    }),
  );
}
