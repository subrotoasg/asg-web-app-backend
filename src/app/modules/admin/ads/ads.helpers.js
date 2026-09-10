import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { Enums } from "../../../constant/enums.js";
import {
  AdScopes,
  SCOPE_COLUMN,
  SCOPE_SPECIFICITY,
} from "./ads.constants.js";

const uniq = (list = []) => [...new Set(list.filter(Boolean))];

/* ------------------------------------------------------------------
 * ১. পেলোডের টার্গেট → adTarget রো
 * ফ্রন্টএন্ড প্রতিটা স্কোপে একটা আইডি অ্যারে পাঠায়, তাই এক ad-এ
 * একসাথে অনেক ক্লাস/সাবজেক্ট দেওয়া যায়।
 * ---------------------------------------------------------------- */
const LIST_TO_SCOPE = [
  ["courseIds", AdScopes.COURSE],
  ["courseSubjectIds", AdScopes.COURSE_SUBJECT],
  ["courseSubjectChapterIds", AdScopes.COURSE_SUBJECT_CHAPTER],
  ["classContentIds", AdScopes.CLASS_CONTENT],
  ["cycleIds", AdScopes.CYCLE],
  ["cycleSubjectIds", AdScopes.CYCLE_SUBJECT],
  ["cycleSubjectChapterIds", AdScopes.CYCLE_SUBJECT_CHAPTER],
  ["cycleContentIds", AdScopes.CYCLE_CONTENT],
  ["liveClassIds", AdScopes.LIVE_CLASS],
  ["studentIds", AdScopes.STUDENT],
];

export const buildTargetRows = (targets = {}) => {
  const rows = [];

  if (targets.global) {
    rows.push({ scope: AdScopes.GLOBAL, mode: "INCLUDE" });
  }

  for (const [listKey, scope] of LIST_TO_SCOPE) {
    for (const id of uniq(targets[listKey])) {
      rows.push({ scope, mode: "INCLUDE", [SCOPE_COLUMN[scope]]: id });
    }
  }

  for (const pair of targets.studentCourses || []) {
    if (!pair?.studentId || !pair?.courseId) continue;
    rows.push({
      scope: AdScopes.STUDENT_COURSE,
      mode: "INCLUDE",
      studentId: pair.studentId,
      courseId: pair.courseId,
    });
  }

  for (const [listKey, scope] of LIST_TO_SCOPE) {
    for (const id of uniq(targets.exclude?.[listKey])) {
      rows.push({ scope, mode: "EXCLUDE", [SCOPE_COLUMN[scope]]: id });
    }
  }

  /* একই এন্টিটি দুইবার এলে (INCLUDE + EXCLUDE) EXCLUDE-ই টেকে */
  const seen = new Map();
  for (const row of rows) {
    const key = `${row.scope}:${Object.entries(row)
      .filter(([k]) => k !== "scope" && k !== "mode")
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("|")}`;

    if (!seen.has(key) || row.mode === "EXCLUDE") seen.set(key, row);
  }

  return [...seen.values()];
};

/* ------------------------------------------------------------------
 * ২. টার্গেটের আইডিগুলো আসলেই আছে কিনা
 * না থাকলে FK এরর দিয়ে ৫০০ ফেরত যেত — তার বদলে পরিষ্কার ৪০০ দিই।
 * ---------------------------------------------------------------- */
const EXISTENCE_CHECKS = [
  ["courseId", "course"],
  ["courseSubjectId", "courseSubject"],
  ["courseSubjectChapterId", "courseSubjectChapter"],
  ["classContentId", "classContent"],
  ["cycleId", "cycle"],
  ["cycleSubjectId", "cycleSubject"],
  ["cycleSubjectChapterId", "cycleSubjectChapter"],
  ["cycleContentId", "cycleContent"],
  ["liveClassId", "liveClass"],
  ["studentId", "student"],
];

export const assertTargetsExist = async (rows = [], tx = prisma) => {
  const missing = [];

  for (const [column, model] of EXISTENCE_CHECKS) {
    const ids = uniq(rows.map((r) => r[column]));
    if (!ids.length) continue;

    const found = await tx[model].findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const foundIds = new Set(found.map((f) => f.id));
    ids.filter((id) => !foundIds.has(id)).forEach((id) =>
      missing.push(`${column}: ${id}`),
    );
  }

  if (missing.length) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      `These targets do not exist — ${missing.slice(0, 10).join(", ")}${
        missing.length > 10 ? ` and ${missing.length - 10} more` : ""
      }`,
    );
  }
};

/* ------------------------------------------------------------------
 * ৩. কনটেন্টের প্যারেন্ট চেইন
 * একটা ক্লাস কোন চ্যাপ্টারে, কোন সাবজেক্টে, কোন কোর্সে — সবটা এক কোয়েরিতে।
 * ---------------------------------------------------------------- */
export const resolveAncestry = async ({ contextScope, contextId }) => {
  const empty = {
    courseId: null,
    courseSubjectId: null,
    courseSubjectChapterId: null,
    classContentId: null,
    cycleId: null,
    cycleSubjectId: null,
    cycleSubjectChapterId: null,
    cycleContentId: null,
    liveClassId: null,
  };

  if (contextScope === AdScopes.CLASS_CONTENT) {
    const row = await prisma.classContent.findUnique({
      where: { id: contextId },
      select: {
        id: true,
        courseSubjectChapter: {
          select: {
            id: true,
            courseSubject: { select: { id: true, courseId: true } },
          },
        },
      },
    });

    if (!row) return null;

    return {
      ...empty,
      classContentId: row.id,
      courseSubjectChapterId: row.courseSubjectChapter?.id ?? null,
      courseSubjectId: row.courseSubjectChapter?.courseSubject?.id ?? null,
      courseId: row.courseSubjectChapter?.courseSubject?.courseId ?? null,
    };
  }

  if (contextScope === AdScopes.CYCLE_CONTENT) {
    const row = await prisma.cycleContent.findUnique({
      where: { id: contextId },
      select: {
        id: true,
        cycleSubjectChapter: {
          select: {
            id: true,
            cycleSubject: {
              select: {
                id: true,
                cycleId: true,
                cycle: { select: { id: true, courseId: true } },
              },
            },
          },
        },
      },
    });

    if (!row) return null;

    const cycleSubject = row.cycleSubjectChapter?.cycleSubject;

    return {
      ...empty,
      cycleContentId: row.id,
      cycleSubjectChapterId: row.cycleSubjectChapter?.id ?? null,
      cycleSubjectId: cycleSubject?.id ?? null,
      cycleId: cycleSubject?.cycleId ?? null,
      courseId: cycleSubject?.cycle?.courseId ?? null,
    };
  }

  if (contextScope === AdScopes.LIVE_CLASS) {
    const row = await prisma.liveClass.findUnique({
      where: { id: contextId },
      select: {
        id: true,
        courseSubjectChapter: {
          select: {
            id: true,
            courseSubject: { select: { id: true, courseId: true } },
          },
        },
        cycleSubjectChapter: {
          select: {
            id: true,
            cycleSubject: {
              select: {
                id: true,
                cycleId: true,
                cycle: { select: { id: true, courseId: true } },
              },
            },
          },
        },
      },
    });

    if (!row) return null;

    const viaCourse = row.courseSubjectChapter;
    const viaCycle = row.cycleSubjectChapter;

    return {
      ...empty,
      liveClassId: row.id,
      courseSubjectChapterId: viaCourse?.id ?? null,
      courseSubjectId: viaCourse?.courseSubject?.id ?? null,
      cycleSubjectChapterId: viaCycle?.id ?? null,
      cycleSubjectId: viaCycle?.cycleSubject?.id ?? null,
      cycleId: viaCycle?.cycleSubject?.cycleId ?? null,
      courseId:
        viaCourse?.courseSubject?.courseId ??
        viaCycle?.cycleSubject?.cycle?.courseId ??
        null,
    };
  }

  return null;
};

/* ------------------------------------------------------------------
 * ৪. চেইন + স্টুডেন্ট → adTarget-এর OR শর্ত
 * ---------------------------------------------------------------- */
export const buildTargetMatchers = ({ ancestry, studentId, courseIds = [] }) => {
  const matchers = [{ scope: AdScopes.GLOBAL }];

  for (const [scope, column] of Object.entries(SCOPE_COLUMN)) {
    if (scope === AdScopes.STUDENT) continue;
    const value = ancestry?.[column];
    if (value) matchers.push({ scope, [column]: value });
  }

  if (studentId) {
    matchers.push({ scope: AdScopes.STUDENT, studentId });

    if (courseIds.length) {
      matchers.push({
        scope: AdScopes.STUDENT_COURSE,
        studentId,
        courseId: { in: courseIds },
      });
    }
  }

  return matchers;
};

/* একটা ad-এর টার্গেটগুলোর মধ্যে সবচেয়ে নির্দিষ্ট ম্যাচটা কত — আর
   EXCLUDE ম্যাচ থাকলে ad-টা একেবারেই বাদ */
export const scoreAdAgainstContext = (ad, { ancestry, studentId }) => {
  let best = -1;

  for (const target of ad.targets || []) {
    let hit = false;

    if (target.scope === AdScopes.GLOBAL) {
      hit = true;
    } else if (target.scope === AdScopes.STUDENT) {
      hit = Boolean(studentId) && target.studentId === studentId;
    } else if (target.scope === AdScopes.STUDENT_COURSE) {
      hit =
        Boolean(studentId) &&
        target.studentId === studentId &&
        Boolean(target.courseId) &&
        target.courseId === ancestry?.courseId;
    } else {
      const column = SCOPE_COLUMN[target.scope];
      hit = Boolean(column) && target[column] && target[column] === ancestry?.[column];
    }

    if (!hit) continue;
    if (target.mode === "EXCLUDE") return -1;

    best = Math.max(best, SCOPE_SPECIFICITY[target.scope] ?? 0);
  }

  return best;
};

/* ------------------------------------------------------------------
 * ৫. অ্যাডমিন কোন ad দেখতে/বদলাতে পারবে
 * superAdmin সব পারে। admin শুধু নিজের বানানো ad, আর তার নিজের
 * কোর্সে টার্গেট করা ad।
 * ---------------------------------------------------------------- */
export const getAdminCourseIds = async (adminId) => {
  if (!adminId) return [];

  const rows = await prisma.courseAdmin.findMany({
    where: { adminId, isDeleted: false },
    select: { courseId: true },
  });

  return rows.map((r) => r.courseId);
};

export const buildAdminScopeWhere = async (auth = {}) => {
  if (auth.role === Enums.roles.SUPERADMIN) return {};

  if (auth.role !== Enums.roles.ADMIN) {
    throw new AppErrors(StatusCodes.FORBIDDEN, "You are not authorized");
  }

  const courseIds = await getAdminCourseIds(auth.userId);

  return {
    OR: [
      { createdByAdminId: auth.userId },
      ...(courseIds.length
        ? [{ targets: { some: { courseId: { in: courseIds } } } }]
        : []),
    ],
  };
};

/* একটা নির্দিষ্ট ad-এ অ্যাডমিনের হাত আছে কিনা */
export const assertCanMutateAd = async (adId, auth = {}) => {
  const ad = await prisma.ad.findFirst({
    where: { id: adId, isDeleted: false },
    select: {
      id: true,
      createdByAdminId: true,
      createdBySuperAdminId: true,
      targets: { select: { courseId: true } },
    },
  });

  if (!ad) throw new AppErrors(StatusCodes.NOT_FOUND, "Ad not found");

  if (auth.role === Enums.roles.SUPERADMIN) return ad;

  if (ad.createdByAdminId === auth.userId) return ad;

  const courseIds = await getAdminCourseIds(auth.userId);
  const adCourseIds = uniq(ad.targets.map((t) => t.courseId));

  const overlaps = adCourseIds.some((id) => courseIds.includes(id));

  if (!overlaps) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You can only manage ads you created or ads targeting your own courses",
    );
  }

  return ad;
};

/* অ্যাডমিন নিজের কোর্সের বাইরে টার্গেট করতে পারবে না */
export const assertTargetsWithinAdminScope = async (rows = [], auth = {}) => {
  if (auth.role === Enums.roles.SUPERADMIN) return;

  const hasGlobal = rows.some((r) => r.scope === AdScopes.GLOBAL);
  if (hasGlobal) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "Only a superAdmin can create a global ad",
    );
  }

  const courseIds = await getAdminCourseIds(auth.userId);
  if (!courseIds.length) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You are not assigned to any course",
    );
  }

  /* প্রতিটা টার্গেট আসলে কোন কোর্সের — সেটা বের করে মিলিয়ে দেখা */
  const resolved = await resolveCourseIdsForRows(rows);
  const outside = resolved.filter((id) => id && !courseIds.includes(id));

  if (outside.length) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "Some targets belong to courses you are not assigned to",
    );
  }
};

const resolveCourseIdsForRows = async (rows = []) => {
  const out = [];

  const pull = async (column, model, select) => {
    const ids = uniq(rows.map((r) => r[column]));
    if (!ids.length) return;
    const found = await prisma[model].findMany({
      where: { id: { in: ids } },
      select,
    });
    found.forEach((f) => out.push(extractCourseId(f)));
  };

  await pull("courseId", "course", { id: true });
  await pull("courseSubjectId", "courseSubject", { courseId: true });
  await pull("courseSubjectChapterId", "courseSubjectChapter", {
    courseSubject: { select: { courseId: true } },
  });
  await pull("classContentId", "classContent", {
    courseSubjectChapter: {
      select: { courseSubject: { select: { courseId: true } } },
    },
  });
  await pull("cycleId", "cycle", { courseId: true });
  await pull("cycleSubjectId", "cycleSubject", {
    cycle: { select: { courseId: true } },
  });
  await pull("cycleSubjectChapterId", "cycleSubjectChapter", {
    cycleSubject: { select: { cycle: { select: { courseId: true } } } },
  });
  await pull("cycleContentId", "cycleContent", {
    cycleSubjectChapter: {
      select: { cycleSubject: { select: { cycle: { select: { courseId: true } } } } },
    },
  });
  await pull("liveClassId", "liveClass", {
    courseSubjectChapter: {
      select: { courseSubject: { select: { courseId: true } } },
    },
    cycleSubjectChapter: {
      select: { cycleSubject: { select: { cycle: { select: { courseId: true } } } } },
    },
  });

  return uniq(out);
};

const extractCourseId = (row) =>
  row?.id ??
  row?.courseId ??
  row?.courseSubject?.courseId ??
  row?.cycle?.courseId ??
  row?.courseSubjectChapter?.courseSubject?.courseId ??
  row?.cycleSubject?.cycle?.courseId ??
  row?.cycleSubjectChapter?.cycleSubject?.cycle?.courseId ??
  null;

export const adsHelpers = {
  buildTargetRows,
  assertTargetsExist,
  resolveAncestry,
  buildTargetMatchers,
  scoreAdAgainstContext,
  buildAdminScopeWhere,
  assertCanMutateAd,
  assertTargetsWithinAdminScope,
  getAdminCourseIds,
};
