import { prisma } from "../../../../../constants/index.js";
import {
  deleteCache,
  getOrLoadStrictCache,
} from "../../../../lib/redis/index.js";
import { Enums } from "../../../constant/enums.js";
import { AuthUserCacheKeys } from "./auth-user.cache.keys.js";

function normalizeRole(role) {
  const value = String(role || "").trim();

  if (value === Enums.roles.STUDENT) {
    return Enums.roles.STUDENT;
  }

  if (value === Enums.roles.ADMIN) {
    return Enums.roles.ADMIN;
  }

  if (value === Enums.roles.SOLVER) {
    return Enums.roles.SOLVER;
  }

  if (value === Enums.roles.SUPERADMIN || value === "superadmin") {
    return Enums.roles.SUPERADMIN;
  }

  return null;
}

function buildAuthUserContext(user, role) {
  if (!user) {
    return null;
  }

  return {
    id: user?.id,
    role,
    name: user?.name || null,
    email: user?.email || null,
    phone: user?.phone || null,
    uid: user?.uid || null,
    profilePhoto: user?.profilePhoto || null,
    photo: user?.photo || null,
    status: user?.status ?? null,
    isActive: user?.isActive ?? null,
    isDeleted: user?.isDeleted ?? false,
    studentRestrictions: Array.isArray(user?.studentRestrictions)
      ? user?.studentRestrictions?.map((restriction) => ({
          id: restriction?.id,
          bannedUntil: restriction?.bannedUntil,
        }))
      : [],
  };
}

async function loadAuthUserFromDb(role, userId) {
  if (role === Enums.roles.STUDENT) {
    const user = await prisma.student.findUnique({
      where: {
        id: userId,
      },
      include: {
        studentRestrictions: {
          where: {
            bannedUntil: {
              gt: new Date(),
            },
          },
        },
      },
    });

    return buildAuthUserContext(user, role);
  }

  if (role === Enums.roles.ADMIN) {
    const user = await prisma.admin.findUnique({
      where: {
        id: userId,
      },
    });

    return buildAuthUserContext(user, role);
  }

  if (role === Enums.roles.SOLVER) {
    const user = await prisma.solver.findUnique({
      where: {
        id: userId,
      },
    });

    return buildAuthUserContext(user, role);
  }

  if (role === Enums.roles.SUPERADMIN) {
    const user = await prisma.superAdmin.findUnique({
      where: {
        id: userId,
      },
    });

    return buildAuthUserContext(user, role);
  }

  return null;
}

function removeExpiredRestrictions(user) {
  if (!user || user.role !== Enums.roles.STUDENT) {
    return user;
  }

  const now = Date.now();

  return {
    ...user,
    studentRestrictions: (user?.studentRestrictions || [])?.filter(
      (restriction) => {
        if (!restriction?.bannedUntil) {
          return false;
        }

        return new Date(restriction?.bannedUntil)?.getTime() > now;
      },
    ),
  };
}

export async function getCachedAuthUser({ role, userId }) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole || !userId) {
    return null;
  }

  const key = AuthUserCacheKeys.user(normalizedRole, userId);

  const user = await getOrLoadStrictCache({
    key,

    loader: () => loadAuthUserFromDb(normalizedRole, userId),
    freshTtlMs: 60_000,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });

  return removeExpiredRestrictions(user);
}

export async function getCachedUserByRole(input = {}) {
  const role = normalizeRole(input?.userRole || input?.role);

  if (!role) {
    return null;
  }

  let userId = null;

  if (role === Enums.roles.STUDENT) {
    userId = input?.studentId || input?.id;
  }

  if (role === Enums.roles.ADMIN) {
    userId = input?.adminId || input?.id;
  }

  if (role === Enums.roles.SOLVER) {
    userId = input?.solverId || input?.id;
  }

  if (role === Enums.roles.SUPERADMIN) {
    userId = input?.superAdminId || input?.id;
  }

  if (!userId) {
    return null;
  }

  return getCachedAuthUser({
    role,
    userId,
  });
}

export async function invalidateAuthUserCache(role, userId) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole || !userId) {
    return;
  }

  const key = AuthUserCacheKeys.user(normalizedRole, userId);
  await deleteCache(key);
}
