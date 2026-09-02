import {
  deleteCache,
  redisCacheConnection,
} from "../../../../../../../lib/redis/index.js";

import { getOrLoadStrictCache } from "../../../../../../../lib/redis/cache/cache.strict.js";

import { PushMessagingCacheKeys } from "./pushMessaging.cache.keys.js";

import {
  createCacheHash,
  resolveNotificationUser,
} from "./pushMessaging.cache.helpers.js";

const SCOPE_TTL_MS = 30 * 60_000;

const TOKEN_TTL_MS = 10 * 60_000;

const NOTIFICATION_TTL_MS = 30 * 60_000;

const ADMIN_LIST_TTL_MS = 30 * 60_000;

const REVISION_TTL_SECONDS = 30 * 24 * 60 * 60;

const getRevision = async (key) => {
  const value = await redisCacheConnection.get(key);

  return value || "0";
};

const bumpRevision = async (key) => {
  const revision = await redisCacheConnection.incr(key);

  await redisCacheConnection.expire(key, REVISION_TTL_SECONDS);

  return revision;
};

export async function getCachedStudentNotificationScope({ studentId, loader }) {
  if (!studentId) {
    return {
      courseIds: [],
      cycleIds: [],
    };
  }

  const key = PushMessagingCacheKeys.studentScope(studentId);

  return getOrLoadStrictCache({
    key,
    loader,

    freshTtlMs: SCOPE_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedAdminNotificationScope({ adminId, loader }) {
  if (!adminId) {
    return {
      courseIds: [],
      cycleIds: [],
    };
  }

  const key = PushMessagingCacheKeys.adminScope(adminId);

  return getOrLoadStrictCache({
    key,
    loader,

    freshTtlMs: SCOPE_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedPushTokens({ userType, userId, loader }) {
  if (!userType || !userId) {
    return [];
  }

  const key = PushMessagingCacheKeys.userTokens(userType, userId);

  return getOrLoadStrictCache({
    key,
    loader,

    freshTtlMs: TOKEN_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedAdminNotificationList({ query, loader }) {
  const revision = await getRevision(
    PushMessagingCacheKeys.adminListRevision(),
  );

  const queryHash = createCacheHash(query || {});

  const key = PushMessagingCacheKeys.adminNotificationList({
    revision,
    queryHash,
  });

  return getOrLoadStrictCache({
    key,
    loader,

    freshTtlMs: ADMIN_LIST_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedUserNotificationList({
  user,
  query,
  hostName,
  loader,
}) {
  const { userType, userId } = resolveNotificationUser(user);

  if (!userType || !userId) {
    return loader();
  }

  const [globalRevision, userRevision] = await Promise.all([
    getRevision(PushMessagingCacheKeys.globalFeedRevision()),

    getRevision(PushMessagingCacheKeys.userFeedRevision(userType, userId)),
  ]);

  const queryHash = createCacheHash(query || {});

  const hostHash = createCacheHash(hostName || "");

  const key = PushMessagingCacheKeys.userNotificationList({
    userType,
    userId,

    hostHash,

    queryHash,

    globalRevision,

    userRevision,
  });

  return getOrLoadStrictCache({
    key,
    loader,

    freshTtlMs: NOTIFICATION_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

/*
 * ==========================
 * TOKEN INVALIDATION
 * ==========================
 */

export async function invalidatePushTokenCache({ studentId, adminId }) {
  if (studentId) {
    await deleteCache(PushMessagingCacheKeys.userTokens("student", studentId));
  }

  if (adminId) {
    await deleteCache(PushMessagingCacheKeys.userTokens("admin", adminId));
  }
}

export async function invalidateStudentNotificationScope(studentId) {
  if (!studentId) {
    return;
  }

  await Promise.all([
    deleteCache(PushMessagingCacheKeys.studentScope(studentId)),

    bumpRevision(PushMessagingCacheKeys.userFeedRevision("student", studentId)),
  ]);
}

export async function invalidateAdminNotificationScope(adminId) {
  if (!adminId) {
    return;
  }

  await Promise.all([
    deleteCache(PushMessagingCacheKeys.adminScope(adminId)),

    bumpRevision(PushMessagingCacheKeys.userFeedRevision("admin", adminId)),
  ]);
}

export async function invalidateUserNotificationFeed({ studentId, adminId }) {
  if (studentId) {
    await bumpRevision(
      PushMessagingCacheKeys.userFeedRevision("student", studentId),
    );
  }

  if (adminId) {
    await bumpRevision(
      PushMessagingCacheKeys.userFeedRevision("admin", adminId),
    );
  }
}

export async function invalidateGlobalNotificationFeed() {
  await Promise.all([
    bumpRevision(PushMessagingCacheKeys.globalFeedRevision()),

    bumpRevision(PushMessagingCacheKeys.adminListRevision()),
  ]);
}

export async function invalidateAdminNotificationList() {
  await bumpRevision(PushMessagingCacheKeys.adminListRevision());
}
