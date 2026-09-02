import { StatusCodes } from "http-status-codes";
import { pickCreateAndUpdateResponse } from "../../../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../../../helper/buildQueryOptions.js";
import { campaignQueue, txQueue } from "../jobs/queue.js";
import { transformUpdatedFields } from "../../../../../../helper/updatedFieldsTransform.js";
import { prisma } from "../../../../../../../constants/index.js";
import { Prisma } from "@prisma/client";
import { dedupOnce } from "../utils/dedup.js";
import AppErrors from "../../../../../../errors/AppErrors.js";
import { normalizePlatform, sanitizeToken } from "./pushMessaging.helpers.js";
import { v4 as uuidv4 } from "uuid";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
  studentResponseFields,
} from "./pushMessaging.constant.js";
import config from "../../../../../config/index.js";
import { sendToTokens } from "../services/sendFcm.js";
import { Enums } from "../../../../../constant/enums.js";
import {
  bumpNotificationGlobalVersion,
  bumpNotificationUserVersion,
  getCachedMyNotifications,
} from "./pushMessaging.cache.js";

//get all notification
const getAllNotificationIntoDb = async (user, query = {}, hostName = "") => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  let hostCondition = {};

  // if (
  //   hostName === config.frb_host_name ||
  //   hostName === config.frb_local_host_name
  // ) {
  //   // FRB
  //   hostCondition = {
  //     courseId: { not: null },
  //     cycleId: null,
  //   };
  // } else if (
  //   hostName === config.academic_host_name ||
  //   hostName === config.academic_local_host_name
  // ) {
  //   // Academic
  //   hostCondition = {
  //     cycleId: { not: null },
  //   };
  // } else {
  //   // Admission
  //   hostCondition = {
  //     courseId: { not: null },
  //     cycleId: null,
  //   };
  // }

  const result = await prisma.notificationLog.findMany({
    where: {
      ...where,
      ...hostCondition,
    },
    orderBy: orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of courses
  const totalCount = await prisma.notificationLog.count({});

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;
  //counting Total, Invalid , valid
  const rows = await prisma.$queryRaw(
    Prisma.sql`
    SELECT
      COUNT(DISTINCT "studentId") AS unique_student_count,
      COUNT(DISTINCT "studentId") FILTER (WHERE "isValid" = true)  AS unique_valid_student_count,
      COUNT(DISTINCT "studentId") FILTER (WHERE "isValid" = false) AS unique_invalid_student_count
    FROM public."pushNotifications"
    WHERE "studentId" IS NOT NULL;
  `,
  );

  const row = rows[0] || {};

  const countingData = {
    unique_student_count: Number(row.unique_student_count || 0),
    unique_valid_student_count: Number(row.unique_valid_student_count || 0),
    unique_invalid_student_count: Number(row.unique_invalid_student_count || 0),
  };

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
      ...countingData,
    },
  };
};

//Register Create PushMessaging Services
const RegisterDeviceCreatePushMessagingIntoDb = async (payload = {}) => {
  const studentId = payload.studentId || null;
  const adminId = payload.adminId || null;
  // exactly one user id must be present
  if ((studentId && adminId) || (!studentId && !adminId)) {
    throw new AppErrors(400, "Provide exactly one: studentId OR adminId");
  }

  const token = sanitizeToken(payload.token);
  if (!token || token.length < 50) {
    throw new AppErrors(400, "Invalid token");
  }

  const platform = normalizePlatform(payload.platform);
  const userType = studentId ? "student" : adminId ? "admin" : "superadmin";
  const now = new Date();

  // (optional but helpful) detect token reassignment
  const existing = await prisma.pushNotification.findUnique({
    where: { token },
    select: { studentId: true, adminId: true },
  });

  const result = await prisma.pushNotification.upsert({
    where: { token },
    update: {
      userType,
      studentId,
      adminId,
      platform,
      isValid: true,
      lastSeenAt: now,
    },
    create: {
      userType,
      studentId,
      adminId,
      platform,
      token,
      isValid: true,
      lastSeenAt: now,
    },
  });

  // log if token moved between users (debug/audit)
  if (
    existing &&
    (String(existing.studentId || "") !== String(studentId || "") ||
      String(existing.adminId || "") !== String(adminId || ""))
  ) {
    console.warn(" FCM token reassigned");
  }

  return result;
};

//send push notification
const sendPushMessaginIntoDb = async (payload = {}, imageURL = "") => {
  const userType = payload?.studentId
    ? "student"
    : payload?.adminId
      ? "admin"
      : "unknown";
  const uuid = uuidv4();

  await txQueue.add("tx", {
    uuid,
    userType,
    studentId: payload.studentId || null,
    adminId: payload.adminId || null,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  });

  //notification Logs
  let result;
  try {
    const data = {
      uniqueId: uuid,
      type: "single_user",
      senderType: userType,
      senderAdminId: payload?.adminId,
      receiverSingleStudentId: payload?.studentId,
      title: payload?.title,
      body: payload.body,
      deepLink: payload?.data?.deepLink,
      image: imageURL,
    };

    result = await prisma.notificationLog.create({
      data,
    });
  } catch (error) {
    console.log(error);
  }

  if (result) {
    if (payload.studentId) {
      await bumpNotificationUserVersion(Enums.roles.STUDENT, payload.studentId);
    } else {
      await bumpNotificationGlobalVersion();
    }
  }

  return result;
};

//broadcast Push message
const broadcastPushMessageIntoDb = async (payload = {}, imageURL = "") => {
  const tranferedData = transformUpdatedFields(payload, []);
  if (payload?.eventKey) {
    const ok = await dedupOnce(`event:${payload?.eventKey}`, 900);
    if (!ok)
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "Already processed this campaign",
      );
  }

  // type + id decide based on course or cycle
  if (tranferedData.courseId) {
    tranferedData.type = "COURSE";
  } else if (tranferedData.cycleId) {
    tranferedData.type = "CYCLE";
  }
  const type = tranferedData.type === "COURSE" ? "course" : "cycle";
  const id =
    tranferedData.type === "COURSE"
      ? tranferedData?.courseId
      : tranferedData?.cycleId;

  const uuid = uuidv4();
  payload.data.image = imageURL || payload?.data?.image || "";
  // job enqueue
  await campaignQueue.add("broadcast", {
    uuid,
    type,
    id,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  });

  //notification Logs
  let result;
  try {
    const data = {
      uniqueId: uuid,
      type: payload?.type || tranferedData?.type || "COURSE_OR CYCLE_BASED",
      senderType: payload?.adminId ? "admin" : "auto",
      senderAdminId: payload?.adminId || null,
      referenceType: type,
      referenceId: id,
      courseId:
        tranferedData.type === "COURSE" ? tranferedData?.courseId : null,
      cycleId: tranferedData.type === "CYCLE" ? tranferedData?.cycleId : null,
      title: payload?.title,
      body: payload.body,
      deepLink: payload?.data?.deepLink,
      image: imageURL || payload?.data?.image,
    };

    result = await prisma.notificationLog.create({
      data,
    });
  } catch (error) {
    console.log(error);
  }

  if (result) {
    await bumpNotificationGlobalVersion();
  }

  return result;
};

//broadcast allUser Push message
const broadcastAllUserPushMessageIntoDb = async (
  payload = {},
  imageURL = "",
) => {
  const uuid = uuidv4();
  if (payload?.eventKey) {
    const ok = await dedupOnce(`event:${payload?.eventKey}`, 900);
    if (!ok)
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "Already processed this campaign",
      );
  }
  payload.data.image = imageURL || payload?.data?.image || "";
  // all user job enqueue
  await txQueue.add("broadcastallUser", {
    uuid,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  });
  //notification Logs
  let result;
  try {
    const data = {
      uniqueId: uuid,
      type: payload?.type || "ALL_USERS",
      senderType: payload?.superAdminId ? "superAdmin" : "auto",
      senderSuperAdminId: payload?.superAdminId || null,
      title: payload?.title,
      body: payload?.body,
      deepLink: payload?.data?.deepLink,
      image: imageURL || payload?.data?.image,
    };

    result = await prisma.notificationLog.create({
      data,
    });
  } catch (error) {
    console.log(error);
  }

  if (result) {
    await bumpNotificationGlobalVersion();
  }

  return result;
};

const normalizeNotificationQuery = (query = {}) => ({
  page: Math.max(Number.parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(Number.parseInt(query.limit, 10) || 30, 1), 100),
  sortBy: query.sortBy === "createdAt" ? query.sortBy : "createdAt",
  sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  searchTerm: String(query.searchTerm || "").trim(),
});

const getNotificationVisibility = async ({ role, userId }) => {
  if (role === Enums.roles.STUDENT) {
    const [courses, cycles] = await Promise.all([
      prisma.courseStudent.findMany({
        where: { studentId: userId },
        select: { courseId: true },
      }),
      prisma.cycleStudent.findMany({
        where: { studentId: userId },
        select: { cycleId: true },
      }),
    ]);

    return {
      targetUser: { studentId: userId },
      visibility: {
        OR: [
          { receiverSingleStudentId: userId },
          { courseId: { in: courses.map(({ courseId }) => courseId) } },
          { cycleId: { in: cycles.map(({ cycleId }) => cycleId) } },
          {
            receiverSingleStudentId: null,
            courseId: null,
            cycleId: null,
          },
        ],
      },
    };
  }

  if (role === Enums.roles.ADMIN) {
    const assignments = await prisma.courseAdmin.findMany({
      where: { adminId: userId, isDeleted: false },
      select: { courseId: true },
    });

    const courseIds = assignments.map(({ courseId }) => courseId);

    const cycles = courseIds.length
      ? await prisma.cycle.findMany({
          where: {
            courseId: { in: courseIds },
            isDeleted: false,
          },
          select: { id: true },
        })
      : [];

    return {
      targetUser: { adminId: userId },
      visibility: {
        OR: [
          { courseId: { in: courseIds } },
          { cycleId: { in: cycles.map(({ id }) => id) } },
          {
            receiverSingleStudentId: null,
            courseId: null,
            cycleId: null,
          },
        ],
      },
    };
  }

  throw new AppErrors(StatusCodes.FORBIDDEN, "Unsupported notification role");
};

//student and admin all notification

const getNotificationHostScope = (hostName) => {
  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    return "frb";
  }

  if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    return "academic";
  }

  return "admission";
};

const loadAllStudentNotificationsFromDb = async (
  normalizedQuery = {},
  auth = {},
) => {
  const { role, userId, hostName } = auth;

  if (!role || !userId) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Authentication context missing",
    );
  }

  const { skip, take, orderBy, where } = buildQueryOptions(
    normalizedQuery,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const { visibility, targetUser } = await getNotificationVisibility({
    role,
    userId,
  });

  const contentConditions = [];

  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    contentConditions.push({
      course: {
        Category: { contains: "Academic" },
        productName: { contains: "FRB" },
        cycleAvailable: false,
      },
    });
  } else if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    contentConditions.push({
      cycle: {
        course: { cycleAvailable: true },
      },
    });
  } else {
    contentConditions.push({
      course: {
        Category: { contains: "Admission" },
        NOT: { Category: { contains: "Academic" } },
        cycleAvailable: false,
      },
    });
  }

  const baseWhere = {
    AND: [
      visibility,
      {
        OR: [...contentConditions, { courseId: null, cycleId: null }],
      },
      ...(Object.keys(where).length ? [where] : []),
    ],
  };
  const selectForUser = {
    id: true,
    createdAt: true,
    title: true,
    body: true,
    image: true,
    deepLink: true,
    type: true,
    notificationUserStatuses: {
      where: targetUser,
      select: { isViewed: true, isClicked: true },
      take: 1,
      orderBy: { createdAt: "desc" },
    },
  };

  const [notifications, totalApplicable, viewedCount] = await Promise.all([
    prisma.notificationLog.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take,
      select: selectForUser,
    }),
    prisma.notificationLog.count({ where: baseWhere }),
    prisma.notificationLog.count({
      where: {
        ...baseWhere,
        notificationUserStatuses: {
          some: { ...targetUser, isViewed: true },
        },
      },
    }),
  ]);

  const result = notifications.map((notification) => {
    const status = notification.notificationUserStatuses[0];

    return {
      id: notification.id,
      createdAt: notification.createdAt,
      title: notification.title,
      body: notification.body,
      image: notification.image,
      deepLink: notification.deepLink,
      type: notification.type,
      isViewed: status?.isViewed ?? false,
      isClicked: status?.isClicked ?? false,
    };
  });

  return {
    result,
    meta: {
      unreadCount: Math.max(0, totalApplicable - viewedCount),
      totalCount: totalApplicable,
      viewCount: viewedCount,
    },
  };
};

const getAllStudentNotificationFromDb = async (query = {}, auth = {}) => {
  if (!auth.role || !auth.userId) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Authentication context missing",
    );
  }

  const normalizedQuery = normalizeNotificationQuery(query);

  return getCachedMyNotifications({
    role: auth.role,
    userId: auth.userId,
    hostScope: getNotificationHostScope(auth.hostName),
    query: normalizedQuery,
    loader: () => loadAllStudentNotificationsFromDb(normalizedQuery, auth),
  });
};

const studentNotificationUpdateIntoDb = async (payload = {}, auth = {}) => {
  const { notificationIds, action } = payload;
  const isView = action === "view";
  const isClick = action === "click";
  const targetUser =
    auth.role === Enums.roles.STUDENT
      ? { studentId: auth.userId }
      : auth.role === Enums.roles.ADMIN
        ? { adminId: auth.userId }
        : null;

  if (!targetUser || !auth.userId) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Authentication context missing",
    );
  }

  const now = new Date();
  const data = notificationIds?.map((id) => ({
    notificationId: id,
    ...targetUser,
    isViewed: isView,
    viewedAt: isView ? now : null,
    isClicked: isClick,
    clickedAt: isClick ? now : null,
  }));
  const upsertWhere = (row) => {
    if (row.studentId) {
      return {
        notificationId_studentId: {
          notificationId: row?.notificationId,
          studentId: row?.studentId,
        },
      };
    }

    if (row.adminId) {
      return {
        notificationId_adminId: {
          notificationId: row?.notificationId,
          adminId: row?.adminId,
        },
      };
    }
  };

  const result = await prisma.$transaction(
    (data || [])?.map((row) =>
      prisma.notificationUserStatus.upsert({
        where: upsertWhere(row),
        create: row,
        update: {
          ...(isView ? { isViewed: true, viewedAt: now } : {}),
          ...(isClick ? { isClicked: true, clickedAt: now } : {}),
        },
      }),
    ),
  );

  await bumpNotificationUserVersion(auth.role, auth.userId);

  return result;
};

//single notification send
const singleUserSendNotificationFromDb = async (payload = {}) => {
  const studentId = payload?.data?.studentId || null;
  const adminId = payload?.data?.adminId || null;
  // exactly one user id must be present
  if ((studentId && adminId) || (!studentId && !adminId)) {
    throw new AppErrors(400, "Provide exactly one: studentId OR adminId");
  }

  let where = {};
  if (studentId) {
    where = { studentId };
  } else if (adminId) {
    where = { adminId };
  }

  const existingTokens = await prisma.pushNotification.findMany({
    where,
    select: { token: true, studentId: true, adminId: true },
  });

  const tokens = existingTokens?.map((item) => item?.token)?.filter(Boolean);

  if (tokens.length === 0) {
    console.log("No Registation for Notification!");
    return { success: 0, failure: 0, invalidTokens: [] };
  }

  const notificationPayload = {
    title: payload?.title,
    body: payload?.body,
    data: {
      ...payload?.data,
      studentId: studentId || "",
      adminId: adminId || "",
      type: payload?.data?.type || "single_chat",
      deepLink: payload?.data?.deepLink,
      icon: payload?.data?.icon,
      badge: payload?.data?.badge,
      image: payload?.data?.image,
    },
  };

  const result = await sendToTokens(tokens, notificationPayload);

  //notification logs
  const logData = {
    type: "SINGLE",
    title: payload?.title,
    body: payload?.body,
    deepLink: payload?.data?.deepLink || null,
    image: payload?.data?.image || null,
    sendCount: result.success || 0,
    failedCount: result.failure || 0,
    invalidCount: result.invalidTokens?.length || 0,
    receiverSingleStudentId: studentId || null,
    senderType: studentId ? "student" : adminId ? "admin" : "auto",
    senderAdminId: payload?.data?.senderAdminId
      ? payload?.data?.senderAdminId
      : null,
    senderSuperAdminId: payload?.data?.senderSuperAdminId
      ? payload?.data?.senderSuperAdminId
      : null,
    senderStudentId: payload?.data?.senderStudentId
      ? payload?.data?.senderStudentId
      : null,
  };

  await prisma.notificationLog.create({
    data: logData,
  });

  if (studentId) {
    await bumpNotificationUserVersion(Enums.roles.STUDENT, studentId);
  } else {
    await bumpNotificationGlobalVersion();
  }

  return {
    success: result?.success > 0 ? true : false,
  };
};

export const PushMessagingServices = {
  getAllNotificationIntoDb,
  RegisterDeviceCreatePushMessagingIntoDb,
  sendPushMessaginIntoDb,
  broadcastPushMessageIntoDb,
  broadcastAllUserPushMessageIntoDb,
  getAllStudentNotificationFromDb,
  studentNotificationUpdateIntoDb,
  singleUserSendNotificationFromDb,
};
