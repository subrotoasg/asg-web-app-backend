import { prisma } from "../../../../../constants/index.js";
import { getOrLoadStrictCache } from "../../../../lib/redis/cache/cache.strict.js";
import { deleteCache } from "../../../../lib/redis/index.js";
import { Enums } from "../../../constant/enums.js";

import {
  findCourseByAnyHierarchyId,
  newfindCourseByAnyHierarchyId,
} from "../../../middleware/handleCourseAuth.js";

import { AuthorizationCacheKeys } from "./authorization.cache.keys.js";
import { bumpStudentMyCoursesVersion } from "../../student/courseStudent/courseStudent.cache.js";

const CONTEXT_TTL_MS = 2 * 60_000;

const MEMBERSHIP_TTL_MS = 2 * 60_000;

const ARCHIVE_SCOPE_TTL_MS = 2 * 60_000;

export async function getCachedCourseContext(entityId) {
  if (!entityId) {
    return {
      found: false,
      course: null,
    };
  }

  const key = AuthorizationCacheKeys.courseContext(entityId);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const lookup = await prisma.courseLookup.findUnique({
        where: {
          entityId,
        },

        select: {
          course: {
            select: {
              id: true,
              productName: true,
              markAsArchieve: true,
              isCourseFree: true,
            },
          },
        },
      });

      if (lookup?.course) {
        return {
          found: true,
          course: lookup.course,
        };
      }
      const legacyCourse = await newfindCourseByAnyHierarchyId(
        entityId,
        prisma,
      );

      if (!legacyCourse?.id) {
        return {
          found: false,
          course: null,
        };
      }

      const course = await prisma.course.findUnique({
        where: {
          id: legacyCourse.id,
        },

        select: {
          id: true,
          productName: true,
          markAsArchieve: true,
          isCourseFree: true,
          isDeleted: true,
        },
      });

      return {
        found: Boolean(course),

        course: course ?? null,
      };
    },
    freshTtlMs: CONTEXT_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedCycleContext(entityId) {
  if (!entityId) {
    return {
      found: false,
      cycle: null,
    };
  }

  const key = AuthorizationCacheKeys.cycleContext(entityId);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const lookup = await prisma.cycleLookup.findUnique({
        where: {
          entityId,
        },

        select: {
          cycle: {
            select: {
              id: true,
              title: true,

              markAsArchieve: true,

              isCycleFree: true,

              course: {
                select: {
                  id: true,
                  productName: true,
                  isDeleted: true,
                },
              },
            },
          },
        },
      });

      return {
        found: Boolean(lookup?.cycle),

        cycle: lookup?.cycle ?? null,
      };
    },

    freshTtlMs: CONTEXT_TTL_MS,

    lockTtlMs: 5_000,

    waitForFillMs: 3000,

    jitterRatio: 0.1,
  });
}

export async function getCachedArchivedCourseIds(parentCourseId) {
  const key = AuthorizationCacheKeys.archivedCourseIds(parentCourseId);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const courses = await prisma.course.findMany({
        where: {
          archieveCourseId: parentCourseId,
          isDeleted: false,
        },
        select: {
          id: true,
        },
      });

      return {
        ids: courses?.map((course) => course?.id),
      };
    },

    freshTtlMs: ARCHIVE_SCOPE_TTL_MS,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });
}

export async function getCachedArchivedCycleIds(parentCycleId) {
  const key = AuthorizationCacheKeys.archivedCycleIds(parentCycleId);

  return getOrLoadStrictCache({
    key,

    loader: async () => {
      const cycles = await prisma.cycle.findMany({
        where: {
          archieveCycleId: parentCycleId,
          isDeleted: false,
        },
        select: {
          id: true,
        },
      });
      return {
        ids: cycles?.map((cycle) => cycle?.id),
      };
    },
    freshTtlMs: ARCHIVE_SCOPE_TTL_MS,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });
}

export async function hasCourseStudentAccess({ studentId, courseId }) {
  if (!studentId || !courseId) {
    return false;
  }

  const key = AuthorizationCacheKeys.courseStudent(studentId, courseId);

  const result = await getOrLoadStrictCache({
    key,

    loader: async () => {
      const enrollment = await prisma.courseStudent.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },

        select: {
          studentId: true,
          courseId: true,
          status: true,
        },
      });

      return {
        allowed: enrollment?.status === "ACTIVE",
      };
    },

    freshTtlMs: MEMBERSHIP_TTL_MS,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });

  return Boolean(result?.allowed);
}

export async function hasCourseAdminAccess({ adminId, courseId }) {
  if (!adminId || !courseId) {
    return false;
  }

  const key = AuthorizationCacheKeys.courseAdmin(adminId, courseId);

  const result = await getOrLoadStrictCache({
    key,

    loader: async () => {
      const permission = await prisma.courseAdmin.findFirst({
        where: {
          adminId,
          courseId,
          isDeleted: false,
        },
        select: {
          adminId: true,
          courseId: true,
        },
      });

      return {
        allowed: Boolean(permission),
      };
    },
    freshTtlMs: MEMBERSHIP_TTL_MS,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });
  return Boolean(result?.allowed);
}

export async function hasCycleStudentAccess({ studentId, cycleId }) {
  if (!studentId || !cycleId) {
    return false;
  }

  const key = AuthorizationCacheKeys.cycleStudent(studentId, cycleId);

  const result = await getOrLoadStrictCache({
    key,

    loader: async () => {
      const enrollment = await prisma.cycleStudent.findUnique({
        where: {
          cycleId_studentId: {
            cycleId,
            studentId,
          },
        },

        select: {
          studentId: true,
          cycleId: true,
          status: true,
        },
      });

      return {
        allowed: enrollment?.status === "ACTIVE",
      };
    },

    freshTtlMs: MEMBERSHIP_TTL_MS,
    lockTtlMs: 5_000,
    waitForFillMs: 3000,
    jitterRatio: 0.1,
  });

  return Boolean(result?.allowed);
}

export async function canUserAccessCourse({ role, userId, course }) {
  if (!role || !userId || !course) {
    return false;
  }

  if (course?.isDeleted) {
    return false;
  }

  if (course?.isCourseFree) {
    return true;
  }

  if (role === Enums.roles.SUPERADMIN) {
    return true;
  }

  if (!course?.markAsArchieve) {
    if (role === Enums.roles.ADMIN) {
      return hasCourseAdminAccess({
        adminId: userId,

        courseId: course.id,
      });
    }

    if (role === Enums.roles.STUDENT) {
      return hasCourseStudentAccess({
        studentId: userId,

        courseId: course.id,
      });
    }

    return false;
  }

  const archiveScope = await getCachedArchivedCourseIds(course.id);

  const courseIds = archiveScope?.ids || [];

  if (!courseIds.length) {
    return false;
  }

  if (role === Enums.roles.STUDENT) {
    const permissions = await Promise.all(
      courseIds?.map((courseId) =>
        hasCourseStudentAccess({
          studentId: userId,

          courseId,
        }),
      ),
    );

    return permissions?.some(Boolean);
  }

  if (role === Enums.roles.ADMIN) {
    const permissions = await Promise.all(
      courseIds?.map((courseId) =>
        hasCourseAdminAccess({
          adminId: userId,
          courseId,
        }),
      ),
    );

    return permissions.some(Boolean);
  }

  return false;
}

export async function canUserAccessCycle({ role, userId, cycle }) {
  if (!role || !userId || !cycle) {
    return false;
  }
  if (cycle?.isDeleted) {
    return false;
  }
  if (cycle?.isCycleFree) {
    return true;
  }

  if (role === Enums.roles.SUPERADMIN) {
    return true;
  }
  if (role === Enums.roles.ADMIN) {
    return hasCourseAdminAccess({
      adminId: userId,
      courseId: cycle?.course?.id,
    });
  }
  if (role === Enums.roles.STUDENT) {
    if (!cycle?.markAsArchieve) {
      return hasCycleStudentAccess({
        studentId: userId,
        cycleId: cycle.id,
      });
    }

    const archiveScope = await getCachedArchivedCycleIds(cycle?.id);

    const cycleIds = archiveScope?.ids || [];

    if (!cycleIds.length) {
      return false;
    }

    const permissions = await Promise.all(
      cycleIds?.map((cycleId) =>
        hasCycleStudentAccess({
          studentId: userId,
          cycleId,
        }),
      ),
    );

    return permissions?.some(Boolean);
  }

  return false;
}

export async function invalidateCourseStudentAccess({ studentId, courseId }) {
  if (!studentId || !courseId) {
    return;
  }

  try {
    await deleteCache(
      AuthorizationCacheKeys.courseStudent(studentId, courseId),
    );
  } catch (error) {
    console.error(
      "[authorization-cache] course-student invalidation failed:",
      error.message,
    );
  }
  await bumpStudentMyCoursesVersion(studentId);
}

export async function invalidateCourseAdminAccess({ adminId, courseId }) {
  if (!adminId || !courseId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.courseAdmin(adminId, courseId));
}

export async function invalidateCycleStudentAccess({ studentId, cycleId }) {
  if (!studentId || !cycleId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.cycleStudent(studentId, cycleId));
}

export async function invalidateCourseContext(entityId) {
  if (!entityId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.courseContext(entityId));
}

export async function invalidateCycleContext(entityId) {
  if (!entityId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.cycleContext(entityId));
}

export async function invalidateArchivedCourseScope(courseId) {
  if (!courseId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.archivedCourseIds(courseId));
}

export async function invalidateArchivedCycleScope(cycleId) {
  if (!cycleId) {
    return;
  }

  await deleteCache(AuthorizationCacheKeys.archivedCycleIds(cycleId));
}

export async function invalidateCourseStudentAccessMany({
  studentId,
  courseIds = [],
}) {
  if (!studentId || !Array.isArray(courseIds) || courseIds.length === 0) {
    return;
  }
  const uniqueCourseIds = [...new Set(courseIds.filter(Boolean))];

  const results = await Promise.allSettled(
    uniqueCourseIds.map((courseId) =>
      deleteCache(AuthorizationCacheKeys.courseStudent(studentId, courseId)),
    ),
  );

  if (results.some((result) => result.status === "rejected")) {
    console.error(
      "[authorization-cache] bulk course-student invalidation failed",
    );
  }
  await bumpStudentMyCoursesVersion(studentId);
}

export async function invalidateCycleStudentAccessMany({
  studentId,
  cycleIds = [],
}) {
  if (!studentId || !Array.isArray(cycleIds) || cycleIds.length === 0) {
    return;
  }

  const uniqueCycleIds = [...new Set(cycleIds.filter(Boolean))];

  await Promise.all(
    uniqueCycleIds?.map((cycleId) =>
      invalidateCycleStudentAccess({
        studentId,
        cycleId,
      }),
    ),
  );
}
