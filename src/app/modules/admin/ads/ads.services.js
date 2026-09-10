import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { Enums } from "../../../constant/enums.js";
import {
  AD_STATUS,
  AdScopes,
  MAX_ADS_PER_BREAK,
  MAX_ADS_PER_RESPONSE,
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  serveSelectFields,
  sortableFields,
  targetSelect,
  SERVE_CONTEXTS,
} from "./ads.constants.js";
import {
  bumpAdsVersion,
  getCachedAdDetail,
  getCachedAdsList,
  getCachedAncestry,
  getCachedServeAds,
  markImpression,
  readFrequency,
} from "./ads.cache.js";
import { adsHelpers } from "./ads.helpers.js";
import { bufferAdEvent } from "./ads.buffer.js";

const SERVE_CONTEXT_SET = new Set(SERVE_CONTEXTS);

const toDate = (value) => (value ? new Date(value) : null);

const creatorFields = (auth = {}) =>
  auth.role === Enums.roles.SUPERADMIN
    ? { createdBySuperAdminId: auth.userId, createdByAdminId: null }
    : { createdByAdminId: auth.userId, createdBySuperAdminId: null };

const editorFields = (auth = {}) =>
  auth.role === Enums.roles.SUPERADMIN
    ? { updatedBySuperAdminId: auth.userId, updatedByAdminId: null }
    : { updatedByAdminId: auth.userId, updatedBySuperAdminId: null };

/* ==================================================================
 * CREATE
 * ================================================================ */
const createAdIntoDb = async (payload = {}, auth = {}, imageURL = "") => {
  const { targets, ...creative } = payload;

  const rows = adsHelpers.buildTargetRows(targets);

  if (!rows.some((r) => r.mode === "INCLUDE")) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "An ad needs at least one INCLUDE target",
    );
  }

  await adsHelpers.assertTargetsWithinAdminScope(rows, auth);
  await adsHelpers.assertTargetsExist(rows);

  const data = transformUpdatedFields(
    {
      ...creative,
      src: creative.src,
      thumbnail: imageURL || creative.thumbnail || null,
      startAt: toDate(creative.startAt),
      endAt: toDate(creative.endAt),
      ...creatorFields(auth),
    },
    [],
  );

  const created = await prisma.$transaction(async (tx) => {
    const ad = await tx.ad.create({ data });

    await tx.adTarget.createMany({
      data: rows.map((row) => ({ ...row, adId: ad.id })),
      skipDuplicates: true,
    });

    return ad;
  });

  await bumpAdsVersion();

  return pickCreateAndUpdateResponse(created, sendResponseFields);
};

/* ==================================================================
 * LIST — অ্যাডমিন প্যানেল
 * ================================================================ */
const loadAdsFromDb = async (query = {}, auth = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const scopeWhere = await adsHelpers.buildAdminScopeWhere(auth);

  /* ফ্রন্টএন্ডের ট্যাব — status ধরে ফিল্টার */
  const statusWhere =
    query.status && query.status !== "ALL" ? { status: query.status } : {};

  const placementWhere = query.placement ? { placement: query.placement } : {};

  const courseWhere = query.courseId
    ? { targets: { some: { courseId: query.courseId } } }
    : {};

  const baseWhere = {
    AND: [
      { isDeleted: false },
      scopeWhere,
      statusWhere,
      placementWhere,
      courseWhere,
      ...(Object.keys(where).length ? [where] : []),
    ],
  };

  const [rows, totalCount, statusCounts] = await Promise.all([
    prisma.ad.findMany({
      where: baseWhere,
      orderBy: Object.keys(orderBy).length
        ? orderBy
        : [{ priority: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      select: selectFields,
    }),
    prisma.ad.count({ where: baseWhere }),
    prisma.ad.groupBy({
      by: ["status"],
      where: { AND: [{ isDeleted: false }, scopeWhere] },
      _count: { _all: true },
    }),
  ]);

  const now = Date.now();

  const data = rows.map((ad) => ({
    ...ad,
    createdBy: describeActor(ad),
    isLive: isAdLive(ad, now),
    targetSummary: summariseTargets(ad.targets),
  }));

  return {
    data,
    meta: {
      totalCount,
      totalPages: Math.ceil(totalCount / take) || 0,
      currentPage: Math.floor(skip / take) + 1,
      statusCounts: statusCounts.reduce(
        (acc, row) => ({ ...acc, [row.status]: row._count._all }),
        {},
      ),
    },
  };
};

const getAllAdsFromDb = async (query = {}, auth = {}) => {
  const scopeKey =
    auth.role === Enums.roles.SUPERADMIN ? "sa" : `admin:${auth.userId}`;

  return getCachedAdsList({
    scopeKey,
    query,
    loader: () => loadAdsFromDb(query, auth),
  });
};

/* এখন কোনটা আসলে চলছে — status ACTIVE হলেও সময় না হলে চলবে না */
const isAdLive = (ad, now = Date.now()) => {
  if (ad.status !== AD_STATUS.ACTIVE) return false;
  if (ad.startAt && new Date(ad.startAt).getTime() > now) return false;
  if (ad.endAt && new Date(ad.endAt).getTime() < now) return false;
  return true;
};

const describeActor = (ad) => {
  if (ad.createdBySuperAdmin) {
    return {
      role: Enums.roles.SUPERADMIN,
      id: ad.createdBySuperAdmin.id,
      name: ad.createdBySuperAdmin.email || "Super Admin",
      email: ad.createdBySuperAdmin.email || null,
      photo: ad.createdBySuperAdmin.photo || null,
    };
  }

  if (ad.createdByAdmin) {
    return {
      role: Enums.roles.ADMIN,
      id: ad.createdByAdmin.id,
      name: ad.createdByAdmin.name || ad.createdByAdmin.email || "Admin",
      email: ad.createdByAdmin.email || null,
      photo: ad.createdByAdmin.photo || null,
    };
  }

  return null;
};

/* টার্গেটগুলো লিস্টে দেখানোর মতো ছোট সারাংশে নামিয়ে আনা */
const summariseTargets = (targets = []) => {
  const include = targets.filter((t) => t.mode === "INCLUDE");
  const exclude = targets.filter((t) => t.mode === "EXCLUDE");

  const label = (t) =>
    t.course?.productName ||
    t.courseSubject?.title ||
    t.courseSubjectChapter?.title ||
    t.classContent?.classTitle ||
    t.cycle?.title ||
    t.cycleSubject?.title ||
    t.cycleSubjectChapter?.title ||
    t.cycleContent?.classTitle ||
    t.liveClass?.title ||
    t.student?.name ||
    (t.scope === AdScopes.GLOBAL ? "সব জায়গায়" : t.scope);

  const byScope = include.reduce((acc, t) => {
    acc[t.scope] = (acc[t.scope] || 0) + 1;
    return acc;
  }, {});

  return {
    isGlobal: include.some((t) => t.scope === AdScopes.GLOBAL),
    includeCount: include.length,
    excludeCount: exclude.length,
    byScope,
    preview: include.slice(0, 4).map((t) => ({
      scope: t.scope,
      id: t.id,
      label: label(t),
    })),
  };
};

/* ==================================================================
 * DETAIL
 * ================================================================ */
const getAdByIdFromDb = async (adId, auth = {}) => {
  const loader = async () => {
    const ad = await prisma.ad.findFirst({
      where: { id: adId, isDeleted: false },
      select: selectFields,
    });

    if (!ad) throw new AppErrors(StatusCodes.NOT_FOUND, "Ad not found");

    return {
      ...ad,
      createdBy: describeActor(ad),
      isLive: isAdLive(ad),
      targetSummary: summariseTargets(ad.targets),
    };
  };

  const ad = await getCachedAdDetail({ adId, loader });

  /* ক্যাশ থেকে এলেও অথরাইজেশন প্রতিবারই যাচাই হয় */
  if (auth.role !== Enums.roles.SUPERADMIN) {
    await adsHelpers.assertCanMutateAd(adId, auth);
  }

  return ad;
};

/* ==================================================================
 * UPDATE
 * ================================================================ */
const updateAdIntoDb = async (adId, payload = {}, auth = {}, imageURL = "") => {
  await adsHelpers.assertCanMutateAd(adId, auth);

  const { targets, ...creative } = payload;

  /* transformUpdatedFields null বাদ দিয়ে দেয়, তাই editor ফিল্ডগুলো
     তার পরে বসানো হয় — নাহলে "আগের এডিটরকে মুছে দাও" (null) কাজ করত না,
     আর একটা ad-এ একসাথে admin আর superAdmin দুইজনই এডিটর হয়ে থাকত */
  const data = {
    ...transformUpdatedFields(
      {
        ...creative,
        ...(imageURL ? { thumbnail: imageURL } : {}),
        ...(creative.startAt !== undefined
          ? { startAt: toDate(creative.startAt) }
          : {}),
        ...(creative.endAt !== undefined
          ? { endAt: toDate(creative.endAt) }
          : {}),
      },
      [],
    ),
    ...editorFields(auth),
  };

  /* startAt/endAt একসাথে না এলে ডাটাবেজের পুরনো মানের সাথে মিলিয়ে দেখা */
  if (data.startAt || data.endAt) {
    const current = await prisma.ad.findUnique({
      where: { id: adId },
      select: { startAt: true, endAt: true },
    });

    const start = data.startAt ?? current?.startAt;
    const end = data.endAt ?? current?.endAt;

    if (start && end && new Date(start) >= new Date(end)) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "endAt must be after startAt",
      );
    }
  }

  let rows = null;

  if (targets) {
    rows = adsHelpers.buildTargetRows(targets);

    if (!rows.some((r) => r.mode === "INCLUDE")) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "An ad needs at least one INCLUDE target",
      );
    }

    await adsHelpers.assertTargetsWithinAdminScope(rows, auth);
    await adsHelpers.assertTargetsExist(rows);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ad = await tx.ad.update({ where: { id: adId }, data });

    /* টার্গেট এলে পুরোটা বদলে দেওয়া হয় — আংশিক merge নয়, তাই
       ফ্রন্টএন্ড যা দেখছে ঠিক তাই সেভ হয় */
    if (rows) {
      await tx.adTarget.deleteMany({ where: { adId } });
      await tx.adTarget.createMany({
        data: rows.map((row) => ({ ...row, adId })),
        skipDuplicates: true,
      });
    }

    return ad;
  });

  await bumpAdsVersion();

  return pickCreateAndUpdateResponse(updated, sendResponseFields);
};

const updateAdStatusIntoDb = async (adId, status, auth = {}) => {
  await adsHelpers.assertCanMutateAd(adId, auth);

  const updated = await prisma.ad.update({
    where: { id: adId },
    data: { status, ...editorFields(auth) },
  });

  await bumpAdsVersion();

  return pickCreateAndUpdateResponse(updated, sendResponseFields);
};

/* ==================================================================
 * DELETE — soft, তাই রিপোর্টের ইতিহাস থাকে
 * ================================================================ */
const deleteAdFromDb = async (adId, auth = {}) => {
  await adsHelpers.assertCanMutateAd(adId, auth);

  const deleted = await prisma.ad.update({
    where: { id: adId },
    data: {
      isDeleted: true,
      status: AD_STATUS.ARCHIVED,
      ...editorFields(auth),
    },
    select: { id: true, title: true, status: true, isDeleted: true },
  });

  await bumpAdsVersion();

  return deleted;
};

/* ==================================================================
 * SERVE — প্লেয়ার থেকে: "এই কনটেন্টে কোন কোন ad চলবে?"
 * ================================================================ */
const loadCandidateAds = async ({ ancestry, studentId, courseIds }) => {
  const matchers = adsHelpers.buildTargetMatchers({
    ancestry,
    studentId,
    courseIds,
  });

  const now = new Date();

  const ads = await prisma.ad.findMany({
    where: {
      isDeleted: false,
      status: AD_STATUS.ACTIVE,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        { targets: { some: { OR: matchers } } },
      ],
    },
    select: {
      ...serveSelectFields,
      /* স্কোরিং আর EXCLUDE চেক করতে ad-এর সব টার্গেট লাগে,
         শুধু ম্যাচ করা কয়টা নয় */
      targets: { select: targetSelect },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return ads;
};

const serveAdsForContext = async (query = {}, auth = {}) => {
  const contextScope = String(query.contextScope || "").toUpperCase();
  const contextId = query.contextId;

  if (!SERVE_CONTEXT_SET.has(contextScope)) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      `contextScope must be one of: ${[...SERVE_CONTEXT_SET].join(", ")}`,
    );
  }

  if (!contextId) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "contextId is required");
  }

  const studentId = auth.role === Enums.roles.STUDENT ? auth.userId : null;

  const ancestry = await getCachedAncestry({
    contextScope,
    contextId,
    loader: () => adsHelpers.resolveAncestry({ contextScope, contextId }),
  });

  if (!ancestry) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Content not found");
  }

  const courseIds = studentId
    ? (
        await prisma.courseStudent.findMany({
          where: { studentId, status: Enums.status.ACTIVE },
          select: { courseId: true },
        })
      ).map((r) => r.courseId)
    : [];

  /* প্রার্থী ad-গুলো ক্যাশ করা যায়, কারণ এটা শুধু কনটেক্সট আর
     স্টুডেন্টের ওপর নির্ভর করে */
  const candidates = await getCachedServeAds({
    contextScope,
    contextId,
    studentId,
    loader: () => loadCandidateAds({ ancestry, studentId, courseIds }),
  });

  /* স্কোরিং — EXCLUDE ম্যাচ করলে -1, তাই ওই ad বাদ */
  const scored = candidates
    .map((ad) => ({
      ad,
      score: adsHelpers.scoreAdAgainstContext(ad, { ancestry, studentId }),
    }))
    .filter((row) => row.score >= 0);

  /* frequency capping — এটা ক্যাশ করা যায় না, প্রতিবার Redis থেকে পড়ি */
  const frequency = await readFrequency(
    studentId,
    scored.map((row) => row.ad.id),
  );

  const now = Date.now();

  const eligible = scored.filter(({ ad }) => {
    const stat = frequency[ad.id];
    if (!stat) return true;

    if (ad.maxImpressionsPerUser && stat.shown >= ad.maxImpressionsPerUser) {
      return false;
    }

    if (
      ad.minGapSeconds &&
      stat.lastSeen &&
      now - stat.lastSeen < ad.minGapSeconds * 1000
    ) {
      return false;
    }

    return true;
  });

  /* একই ব্রেকে একাধিক ad ম্যাচ করলে বেশি নির্দিষ্টটা আগে,
     সমান হলে বেশি priority */
  eligible.sort(
    (a, b) =>
      b.score - a.score ||
      (b.ad.priority ?? 0) - (a.ad.priority ?? 0) ||
      String(a.ad.id).localeCompare(String(b.ad.id)),
  );

  /* একই সেকেন্ডে দুইটা ad যেন না পড়ে */
  const takenBreaks = new Map();
  const chosen = [];

  for (const { ad, score } of eligible) {
    if (chosen.length >= MAX_ADS_PER_RESPONSE) break;

    const breakKey =
      ad.placement === "MID_ROLL" ? `MID:${ad.atSec}` : ad.placement;

    const used = takenBreaks.get(breakKey) || 0;
    if (used >= MAX_ADS_PER_BREAK) continue;

    takenBreaks.set(breakKey, used + 1);
    chosen.push({ ad, score });
  }

  return {
    context: { scope: contextScope, id: contextId },
    ads: chosen.map(({ ad, score }) => ({
      id: ad.id,
      title: ad.title,
      creativeType: ad.creativeType,
      placement: ad.placement,
      /* ফ্রন্টএন্ড প্লেয়ার ঠিক এই নামগুলোই পড়ে */
      at: ad.placement === "PRE_ROLL" ? 0 : ad.atSec,
      src: ad.src,
      thumbnail: ad.thumbnail,
      duration: ad.durationSec,
      skipAfter: ad.skipAfterSec ?? undefined,
      clickUrl: ad.clickUrl ?? undefined,
      cta: ad.cta ?? undefined,
      matchScore: score,
    })),
  };
};

/* ==================================================================
 * TRACK — impression / complete / skip / click
 * ================================================================ */
const trackAdEventIntoDb = async (payload = {}, auth = {}) => {
  const { adId, type, contextScope, contextId, positionSec } = payload;

  const ad = await prisma.ad.findFirst({
    where: { id: adId, isDeleted: false },
    select: { id: true },
  });

  if (!ad) throw new AppErrors(StatusCodes.NOT_FOUND, "Ad not found");

  const studentId = auth.role === Enums.roles.STUDENT ? auth.userId : null;

  bufferAdEvent({
    adId,
    type,
    studentId,
    contextScope,
    contextId,
    positionSec,
  });

  /* capping-এর হিসাব সাথে সাথেই লাগে, তাই এটা বাফারে যায় না */
  if (type === "IMPRESSION" && studentId) {
    await markImpression(studentId, adId);
  }

  return { adId, type, recorded: true };
};

/* ==================================================================
 * "কোথায় কী চলছে" — অ্যাডমিন ড্যাশবোর্ডের ট্যাব
 * একটা কোর্স/সাইকেল ধরে, তার নিচে কোন কোন ad চলছে
 * ================================================================ */
const getRunningAdsFromDb = async (query = {}, auth = {}) => {
  const scopeWhere = await adsHelpers.buildAdminScopeWhere(auth);
  const now = new Date();

  const targetWhere = query.courseId
    ? { some: { courseId: query.courseId } }
    : query.cycleId
      ? { some: { cycleId: query.cycleId } }
      : undefined;

  const ads = await prisma.ad.findMany({
    where: {
      AND: [
        { isDeleted: false },
        { status: AD_STATUS.ACTIVE },
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        scopeWhere,
        ...(targetWhere ? [{ targets: targetWhere }] : []),
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    select: selectFields,
  });

  /* স্কোপ ধরে গুছিয়ে দেওয়া, যাতে UI-তে সরাসরি গ্রুপ করে দেখানো যায় */
  const grouped = {};

  for (const ad of ads) {
    for (const target of ad.targets) {
      if (target.mode !== "INCLUDE") continue;

      grouped[target.scope] = grouped[target.scope] || [];
      grouped[target.scope].push({
        adId: ad.id,
        title: ad.title,
        placement: ad.placement,
        atSec: ad.atSec,
        priority: ad.priority,
        thumbnail: ad.thumbnail,
        createdBy: describeActor(ad),
        target: {
          id: target.id,
          scope: target.scope,
          entityId:
            target.courseId ||
            target.courseSubjectId ||
            target.courseSubjectChapterId ||
            target.classContentId ||
            target.cycleId ||
            target.cycleSubjectId ||
            target.cycleSubjectChapterId ||
            target.cycleContentId ||
            target.liveClassId ||
            target.studentId ||
            null,
          label:
            target.course?.productName ||
            target.courseSubject?.title ||
            target.courseSubjectChapter?.title ||
            target.classContent?.classTitle ||
            target.cycle?.title ||
            target.cycleSubject?.title ||
            target.cycleSubjectChapter?.title ||
            target.cycleContent?.classTitle ||
            target.liveClass?.title ||
            target.student?.name ||
            "সব জায়গায়",
        },
      });
    }
  }

  return {
    totalLive: ads.length,
    grouped,
  };
};

export const adsServices = {
  createAdIntoDb,
  getAllAdsFromDb,
  getAdByIdFromDb,
  updateAdIntoDb,
  updateAdStatusIntoDb,
  deleteAdFromDb,
  serveAdsForContext,
  trackAdEventIntoDb,
  getRunningAdsFromDb,
};
