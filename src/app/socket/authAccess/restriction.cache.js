import { prisma } from "../../../../constants/index.js";

import { deleteCache, getOrLoadStrictCache } from "../../../lib/redis/index.js";

function restrictionKey(studentId, type) {
  return `cache:socket:restriction:v1:${studentId}:${type}`;
}

export async function getCachedRestriction(studentId, type) {
  const key = restrictionKey(studentId, type);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const now = new Date();

      const restriction = await prisma.studentRestriction.findFirst({
        where: {
          studentId,

          type: {
            in: ["FULL", type],
          },

          OR: [
            {
              bannedUntil: null,
            },
            {
              bannedUntil: {
                gt: now,
              },
            },
          ],
        },

        orderBy: {
          bannedAt: "desc",
        },
      });

      return restriction || null;
    },

    freshTtlMs: 30_000,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function invalidateRestrictionCache(studentId, type) {
  await deleteCache(restrictionKey(studentId, type));
}
