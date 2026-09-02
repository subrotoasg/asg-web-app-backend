import prisma from "../../../utlis/prisma.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { StatusCodes } from "http-status-codes";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./notice.constants.js";
import { convertToUTC } from "../../../../helper/convertIntoUTCTime.js";
import { Enums } from "../../../constant/enums.js";
import {
  findCourseByCycle,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { sendNotification } from "../../student/firebase/messaging/utils/notificationUtlis.js";
import { activity } from "../../../../helper/activityLog.js";

const createNotice = async (payload, hostName) => {
  const {
    courseId,
    cycleId,
    title,
    description,
    url,
    image,
    type,
    adminId,
    superAdminId,
  } = payload;

  const startTime = convertToUTC(payload?.startTime) || null;
  const endTime = convertToUTC(payload?.endTime) || null;

  if (startTime > endTime)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Start time cannot be greater than end time.",
    );
  const data = {
    courseId,
    cycleId,
    title,
    description,
    url,
    image,
    type,
    startTime,
    endTime,
    adminId,
  };

  const sanitizedData = transformUpdatedFields(data, []);

  const response = await prisma.noticeORroutine.create({ data: sanitizedData });

  if (courseId) {
    //upsert for courselookup
    await logLookUpTable(response?.id, courseId);
  } else if (cycleId) {
    //upsert for cycle lookup
    const getCourse = await findCourseByCycle(cycleId);
    await logLookUpTable(response?.id, getCourse?.id);
    await logCycleLookUpTable(response?.id, cycleId);
  }

  const result = pickCreateAndUpdateResponse(response, sendResponseFields);

  //send notification
  try {
    const courseOrCycle = {
      ...(courseId && { courseId: payload?.courseId }),
      ...(cycleId && { cycleId: payload?.cycleId }),
    };

    await sendNotification({
      type: `notice_uploaded_${title}_${Date.now()}_${type}`,
      ...courseOrCycle,
      title: payload?.title || "তোমার জন্য নতুন নোটিশ",
      body:
        payload?.description || "তোমার জন্য একটি নতুন নোটিশ প্রকাশ করা হয়েছে।",
      deepLink: payload?.url ? payload?.url : hostName,
      image: payload?.image,
      eventKey: `${payload?.title}_${Date.now()}`,
    });
  } catch (err) {
    console.error("Notification preparation failed:", err);
  }

  //log notice creation
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin.name;
    }
    const getCourse = await prisma.course.findFirst({
      where: {
        id: courseId,
      },
    });

    const logTitle = `কোর্সে নতুন নোটিশ যোগ করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সে নতুন নোটিশ যোগ করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging notice creation");
  }

  return result;
};

const getAllNoticeByCourseId = async (courseId, query = {}, payload) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const { userRole } = payload;

  const now = convertToUTC(new Date());

  // console.log(now, " the now now");

  const isExitsCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });
  if (!isExitsCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Course not found!");

  const getAllNotice = await prisma.noticeORroutine.findMany({
    where: {
      AND: [
        { ...where },
        { courseId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              startTime: { lte: now },
              endTime: { gte: now },
            }
          : {},
      ],
    },
    skip,
    take,
    orderBy: { startTime: "asc" },
    select: selectFields,
  });

  const totalCount = await prisma.noticeORroutine.count({
    where: {
      AND: [
        { ...where },
        { courseId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              startTime: { lte: now },
              endTime: { gte: now },
            }
          : {},
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: getAllNotice,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getAllNoticeByCycleId = async (cycleId, query = {}, payload) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const { userRole } = payload;

  const now = convertToUTC(new Date());

  // console.log(now, " the now now");

  const isExitsCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
    },
  });
  if (!isExitsCycle)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Cycle not found!");

  const getAllNotice = await prisma.noticeORroutine.findMany({
    where: {
      AND: [
        { ...where },
        { cycleId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              startTime: { lte: now },
              endTime: { gte: now },
            }
          : {},
      ],
    },
    skip,
    take,
    orderBy: { startTime: "asc" },
    select: selectFields,
  });

  const totalCount = await prisma.noticeORroutine.count({
    where: {
      AND: [
        { ...where },
        { cycleId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              startTime: { lte: now },
              endTime: { gte: now },
            }
          : {},
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: getAllNotice,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getOneById = async (noticeId) => {
  const result = await prisma.noticeORroutine.findUnique({
    where: {
      id: noticeId,
      isDeleted: false,
    },
    select: selectFields,
  });
  return result;
};

const updateNotice = async (id, image, payload) => {
  const { superAdminId, adminId } = payload;
  // console.log(payload?.endTime, "the payload endTime");
  const isExist = await prisma.noticeORroutine.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist) throw new AppErrors(StatusCodes.NOT_FOUND, "notice not found!");

  const startTime = payload?.startTime
    ? convertToUTC(payload?.startTime)
    : isExist?.startTime;
  const endTime = payload?.endTime
    ? convertToUTC(payload?.endTime)
    : isExist?.endTime;

  // console.log(endTime, "converted endtime");

  if (startTime > endTime)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Start time cannot be greater than end time.",
    );

  const data = transformUpdatedFields(
    {
      title: payload?.title,
      description: payload?.description,
      url: payload?.url,
      image: image,
      type: payload?.type,
      startTime,
      endTime,
    },
    [],
  );

  const result = await prisma.noticeORroutine.update({
    where: {
      id,
    },
    data: data,
  });

  // console.log(result, "afterstoring");

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log update notice
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    }
    const getCourse = await prisma.course.findFirst({
      where: {
        id: isExist?.courseId,
      },
    });

    const logTitle = `কোর্স এর নোটিশ আপডেট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সে নোটিশ আপডেট করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity in update notice");
  }

  return response;
};

const deleteNotice = async (id, payload) => {
  const { superAdminId, adminId } = payload;

  const isExist = await prisma.noticeORroutine.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Routine not found!");

  const result = await prisma.noticeORroutine.update({
    where: {
      id,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });

  //log delete notice
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    }
    const getCourse = await prisma.course.findFirst({
      where: {
        id: isExist?.courseId,
      },
    });
    const logTitle = `কোর্সের নোটিশ ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের নোটিশ ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging notice in deleting notice");
  }

  return true;
};

export const NoticeServices = {
  getOneById,
  createNotice,
  updateNotice,
  deleteNotice,
  getAllNoticeByCourseId,
  getAllNoticeByCycleId,
};
