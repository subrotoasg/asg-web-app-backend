import crypto from "node:crypto";

import { StudentSessionKeys } from "./student-session.keys.js";

import { prisma } from "../../../../../constants/index.js";
import {
  deleteCache,
  getOrLoadStrictCache,
} from "../../../../lib/redis/index.js";

export function fingerprintToken(token) {
  if (!token) {
    return null;
  }

  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function safeHashCompare(hashA, hashB) {
  if (!hashA || !hashB) {
    return false;
  }

  try {
    const a = Buffer.from(hashA, "hex");

    const b = Buffer.from(hashB, "hex");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function buildCachedSession(session) {
  if (!session) {
    return {
      exists: false,
      active: false,
      refreshTokenHash: null,
    };
  }

  return {
    exists: true,

    active: Boolean(session.refreshToken),

    id: session.id,

    studentId: session.studentId,

    refreshTokenHash: fingerprintToken(session.refreshToken),

    lastLogedIn: session.lastLogedIn ?? null,
  };
}

export async function getCachedStudentSession({ studentId, hostName }) {
  if (!studentId || !hostName) {
    return {
      exists: false,
      active: false,
      refreshTokenHash: null,
    };
  }

  const key = StudentSessionKeys.session(studentId, hostName);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const session = await prisma.studentAuthLog.findFirst({
        where: {
          studentId,
          hostName,
        },

        orderBy: {
          lastLogedIn: "desc",
        },

        select: {
          id: true,

          studentId: true,

          refreshToken: true,

          lastLogedIn: true,
        },
      });

      return buildCachedSession(session);
    },
    freshTtlMs: 60_000,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });
}

export async function validateCachedStudentSession({
  studentId,
  hostName,
  refreshToken,
}) {
  const session = await getCachedStudentSession({
    studentId,
    hostName,
  });

  if (!session?.exists) {
    return false;
  }
  if (!session?.active || !session?.refreshTokenHash) {
    return false;
  }
  const isDesktopSession = hostName.startsWith("acs-desktop:");

  if (isDesktopSession) {
    return true;
  }
  const incomingHash = fingerprintToken(refreshToken);
  return safeHashCompare(session.refreshTokenHash, incomingHash);
}

export async function invalidateStudentSessionCache({ studentId, hostName }) {
  if (!studentId || !hostName) {
    return;
  }
  const key = StudentSessionKeys.session(studentId, hostName);
  await deleteCache(key);
}
