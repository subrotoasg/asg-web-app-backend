import { prisma } from "../../../../../../../constants/index.js";

const getTokensByStudentIds = async (studentIds) => {
  const rows = await prisma.pushNotification.findMany({
    where: { isValid: true, studentId: { in: studentIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token).filter(Boolean);
};

const getTokensByAdminIds = async (adminIds) => {
  const rows = await prisma.pushNotification.findMany({
    where: { isValid: true, adminId: { in: adminIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token).filter(Boolean);
};

const getTokensForUser = async ({ userType, studentId, adminId }) => {
  const where =
    userType === "student"
      ? { isValid: true, studentId }
      : { isValid: true, adminId };

  const rows = await prisma.pushNotification.findMany({
    where,
    select: { token: true },
  });

  return rows?.map((r) => r.token).filter(Boolean);
};

const invalidateTokens = async (tokens) => {
  if (!tokens.length) return;
  return prisma.pushNotification.updateMany({
    where: { token: { in: tokens } },
    data: { isValid: false },
  });
};

// pagination (course)
async function* courseStudentIdPages(courseId, pageSize = 5000) {
  let cursor = null;
  while (true) {
    const rows = await prisma.courseStudent.findMany({
      where: { courseId },
      select: { studentId: true },
      orderBy: { studentId: "asc" },
      take: pageSize,
      ...(cursor ? { cursor: { courseId_studentId: cursor }, skip: 1 } : {}),
    });

    if (!rows.length) return;

    const ids = rows?.map((r) => r.studentId);
    yield ids;

    cursor = { courseId, studentId: ids[ids.length - 1] };
  }
}

//admin CourseId Based
async function* courseAdminIdPages(courseId, pageSize = 5000) {
  let cursor = null;

  while (true) {
    const rows = await prisma.courseAdmin.findMany({
      where: { courseId, isDeleted: false },
      select: { adminId: true },
      orderBy: { adminId: "asc" },
      take: pageSize,
      ...(cursor ? { cursor: { courseId_adminId: cursor }, skip: 1 } : {}),
    });

    if (!rows.length) return;

    const ids = rows?.map((r) => r.adminId);
    yield ids;

    cursor = { courseId, adminId: ids[ids.length - 1] };
  }
}

//Admin Cycle Id based
async function* cycleAdminIdPages(cycleId, pageSize = 5000) {
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, isDeleted: false },
    select: { courseId: true },
  });

  if (!cycle || !cycle.courseId) return;

  const courseId = cycle.courseId;
  let cursor = null;

  while (true) {
    const rows = await prisma.courseAdmin.findMany({
      where: { courseId, isDeleted: false },
      select: { adminId: true },
      orderBy: { adminId: "asc" },
      take: pageSize,
      ...(cursor ? { cursor: { courseId_adminId: cursor }, skip: 1 } : {}),
    });

    if (!rows.length) return;

    const ids = rows.map((r) => r.adminId);
    yield ids;

    cursor = { courseId, adminId: ids[ids.length - 1] };
  }
}

// pagination (cycle)
async function* cycleStudentIdPages(cycleId, pageSize = 5000) {
  let cursor = null;
  while (true) {
    const rows = await prisma.cycleStudent.findMany({
      where: { cycleId },
      select: { studentId: true },
      orderBy: { studentId: "asc" },
      take: pageSize,
      ...(cursor ? { cursor: { cycleId_studentId: cursor }, skip: 1 } : {}),
    });

    if (!rows.length) return;
    const ids = rows.map((r) => r.studentId);
    yield ids;

    cursor = { cycleId, studentId: ids[ids.length - 1] };
  }
}

// pagination (all users token)
async function* allUsersPages(pageSize = 5000) {
  let cursor = null;

  while (true) {
    const rows = await prisma.pushNotification.findMany({
      take: pageSize,
      ...(cursor && { skip: 1, cursor }),
      where: { isValid: true },
      select: { token: true },
      orderBy: { token: "asc" },
    });

    if (!rows.length) return;

    yield rows.map((r) => r.token);

    cursor = { token: rows[rows.length - 1].token };
  }
}

export const helperfn = {
  getTokensByStudentIds,
  getTokensByAdminIds,
  getTokensForUser,
  invalidateTokens,
  courseStudentIdPages,
  courseAdminIdPages,
  cycleStudentIdPages,
  allUsersPages,
  cycleAdminIdPages,
};
