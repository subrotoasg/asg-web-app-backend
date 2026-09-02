import prisma from "../../../utlis/prisma.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { StatusCodes } from "http-status-codes";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./featured.constants.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import {
  findCourseByCycle,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { convertToUTC } from "../../../../helper/convertIntoUTCTime.js";
import { Enums } from "../../../constant/enums.js";
import { sendNotification } from "../../student/firebase/messaging/utils/notificationUtlis.js";
import { activity } from "../../../../helper/activityLog.js";

// const createFeatured = async (payload, hostName) => {
//   const {
//     courseId,
//     cycleId,
//     title,
//     description,
//     url,
//     image,
//     type,
//     coupne,
//     adminId,
//     superAdminId,
//     productId,
//     affiliateProductIds,
//   } = payload;

//   const startTime = convertToUTC(payload?.startTime) || null;
//   const endTime = convertToUTC(payload?.endTime) || null;

//   if (startTime > endTime)
//     throw new AppErrors(
//       StatusCodes.BAD_REQUEST,
//       "Start time cannot be greater than end time.",
//     );

//   const data = {
//     courseId,
//     cycleId,
//     title,
//     description,
//     url,
//     image,
//     type,
//     startTime,
//     endTime,
//     coupne,
//     adminId,
//     productId,
//     affiliateProductIds,
//   };

//   const sanitizedData = transformUpdatedFields(data, []);

//   const response = await prisma.featured.create({ data: sanitizedData });

//   if (courseId) {
//     //upsert for courselookup
//     await logLookUpTable(response?.id, courseId);
//   } else if (cycleId) {
//     const getCourse = await findCourseByCycle(cycleId);
//     await logLookUpTable(response?.id, getCourse?.id);
//     //upsert for cycle lookup
//     await logCycleLookUpTable(response?.id, cycleId);
//   }

//   const result = pickCreateAndUpdateResponse(response, sendResponseFields);

//   //send notification
//   try {
//     const courseOrCycle = {
//       ...(courseId && { courseId: payload?.courseId }),
//       ...(cycleId && { cycleId: payload?.cycleId }),
//     };

//     await sendNotification({
//       type: `featured_uploaded_${title}_${Date.now()}_${type}`,
//       ...courseOrCycle,
//       title: payload?.title || "নতুন একটি ফিচার যুক্ত করা হয়েছে",
//       body:
//         payload?.description ||
//         "তোমার জন্য একটি নতুন ফিচার পোস্ট প্রকাশ করা হয়েছে।",
//       deepLink: payload?.url ? payload?.url : hostName,
//       image: payload?.image,
//       eventKey: `${payload?.title}_${Date.now()}`,
//     });
//   } catch (err) {
//     console.error("Notification preparation failed:", err);
//   }

//   //log creating feature
//   try {
//     let creatorName = "";
//     if (superAdminId) {
//       const getSuperAdmin = await prisma.superAdmin.findFirst({
//         where: {
//           id: superAdminId,
//         },
//       });
//       creatorName = getSuperAdmin?.email;
//     } else if (adminId) {
//       const getAdmin = await prisma.admin.findFirst({
//         where: {
//           id: adminId,
//         },
//       });
//       creatorName = getAdmin?.name;
//     }

//     const getCourse = await prisma.course.findFirst({
//       id: courseId,
//     });

//     const logTitle = `কোর্সে নতুন ফিচার যোগ করা হয়েছে`;
//     const logDesc = `${creatorName} ${getCourse?.productName} কোর্সে নতুন ফিচার যোগ করেছেন`;
//     const logType = Enums.logType.course;
//     await activity.logActivity(logTitle, logDesc, logType);
//   } catch (error) {
//     console.log(error, "Error logging activity on new feature");
//   }

//   return result;
// };

//versition 2 implementation for multiple course and cycle ids
const createFeatured = async (payload = {}, hostName) => {
  const {
    course = [],
    cycle = [],
    title,
    description,
    url,
    image,
    type,
    coupne,
    adminId,
    superAdminId,
    productId,
    affiliateProductIds,
  } = payload;

  const startTime = convertToUTC(payload?.startTime) || null;
  const endTime = convertToUTC(payload?.endTime) || null;
  if (startTime && endTime && startTime > endTime) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Start time cannot be greater than end time.",
    );
  }

  let ids = [];
  if (course.length > 0) {
    ids = course.map((id) => ({
      courseId: id,
      cycleId: null,
    }));
  } else {
    for (const cycleId of cycle) {
      const getCourse = await findCourseByCycle(cycleId);
      ids.push({
        courseId: getCourse?.id,
        cycleId,
      });
    }
  }
  const featuredList = [];

  let creatorName = "";

  if (superAdminId) {
    const getSuperAdmin = await prisma.superAdmin.findUnique({
      where: {
        id: superAdminId,
      },
      select: {
        email: true,
      },
    });

    creatorName = getSuperAdmin?.email || "";
  } else if (adminId) {
    const getAdmin = await prisma.admin.findUnique({
      where: {
        id: adminId,
      },
      select: {
        name: true,
      },
    });

    creatorName = getAdmin?.name || "";
  }

  const getLastSerial = await prisma.featured.aggregate({
    where: {
      isDeleted: false,
    },
    _max: {
      serial: true,
    },
  });

  const lastSerial = getLastSerial._max.serial ?? 0;

  let index = 1;

  for (const item of ids) {
    const data = {
      courseId: item.courseId,
      cycleId: item.cycleId,
      title,
      description,
      url,
      image,
      type,
      startTime,
      endTime,
      coupne,
      adminId,
      productId,
      affiliateProductIds,
      serial: lastSerial + index * 10,
    };

    const sanitizedData = transformUpdatedFields(data, []);

    const response = await prisma.featured.create({
      data: sanitizedData,
    });

    index = index + 1;

    featuredList.push(response);

    try {
      await logLookUpTable(response.id, item.courseId);

      if (item.cycleId) {
        await logCycleLookUpTable(response.id, item.cycleId);
      }
    } catch (err) {
      console.error("Lookup failed:", err);
    }

    try {
      const courseOrCycle =
        course.length > 0
          ? { courseId: item?.courseId }
          : { cycleId: item?.cycleId };

      await sendNotification({
        type: `featured_uploaded_${title}_${Date.now()}_${type}`,
        ...courseOrCycle,
        title: title || "নতুন একটি ফিচার যুক্ত করা হয়েছে",
        body:
          description || "তোমার জন্য একটি নতুন ফিচার পোস্ট প্রকাশ করা হয়েছে।",
        deepLink: url || hostName,
        image,
        eventKey: `${title}_${Date.now()}_${item.courseId}`,
      });
    } catch (err) {
      console.error("Notification preparation failed:", err);
    }
    try {
      const getCourse = await prisma.course.findUnique({
        where: {
          id: item.courseId,
        },
        select: {
          productName: true,
        },
      });

      const logTitle = "কোর্সে নতুন ফিচার যোগ করা হয়েছে";

      const logDesc = `${creatorName} ${getCourse?.productName || ""} কোর্সে নতুন ফিচার যোগ করেছেন`;

      await activity.logActivity(logTitle, logDesc, Enums.logType.course);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  return featuredList?.map((item) =>
    pickCreateAndUpdateResponse(item, sendResponseFields),
  );
};

const getAllFeaturedByCourseId = async (courseId, query = {}, payload) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const { userRole } = payload;

  const now = convertToUTC(new Date());

  const isExitsCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });
  if (!isExitsCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Course not found!");

  const getAllFeatured = await prisma.featured.findMany({
    where: {
      AND: [
        { ...where },
        { courseId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              OR: [
                {
                  AND: [{ startTime: { lte: now } }, { endTime: { gte: now } }],
                },
                {
                  AND: [{ startTime: null }, { endTime: null }],
                },
              ],
            }
          : {},
      ],
    },
    orderBy: [
      {
        serial: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    skip,
    take,
    // orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.featured.count({
    where: {
      AND: [
        { ...where },
        { courseId },
        { isDeleted: false },
        userRole === Enums.roles.STUDENT
          ? {
              OR: [
                {
                  AND: [{ startTime: { lte: now } }, { endTime: { gte: now } }],
                },
                {
                  AND: [{ startTime: null }, { endTime: null }],
                },
              ],
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
    data: getAllFeatured,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getAllFeaturedByCycleId = async (cycleId, query = {}, payload) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const { userRole } = payload;
  const now = convertToUTC(new Date());
  const isExitsCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
    },
  });
  if (!isExitsCycle)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Cycle not found!");
  const getAllFeatured = await prisma.featured.findMany({
    where: {
      AND: [
        { ...where },
        { cycleId },
        { isDeleted: false },
        // userRole === Enums.roles.STUDENT
        //   ? {
        //       startTime: { lte: now },
        //       endTime: { gte: now },
        //     }
        //   : {},
      ],
    },
    orderBy: [
      {
        serial: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    skip,
    take,
    // orderBy,
    select: selectFields,
  });
  const totalCount = await prisma.featured.count({
    where: {
      AND: [
        { ...where },
        { cycleId },
        { isDeleted: false },
        // userRole === Enums.roles.STUDENT
        //   ? {
        //       startTime: { lte: now },
        //       endTime: { gte: now },
        //     }
        //   : {},
      ],
    },
  });
  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);
  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;
  return {
    data: getAllFeatured,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getOneById = async (featuredId) => {
  const result = await prisma.featured.findUnique({
    where: {
      id: featuredId,
      isDeleted: false,
    },
    select: selectFields,
  });
  return result;
};

const updateFeatured = async (id, image, payload) => {
  const { adminId, superAdminId, serial } = payload;
  const isExist = await prisma.featured.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Featured not found!");

  const startTime = payload?.startTime
    ? new Date(payload?.startTime)
    : isExist?.startTime;
  const endTime = payload?.endTime
    ? new Date(payload?.endTime)
    : isExist?.endTime;

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
      coupne: payload?.coupne,
      type: payload?.type,
      startTime,
      endTime,
      productId: payload?.productId,
      serial,
      affiliateProductIds:
        Array.isArray(payload?.affiliateProductIds) &&
        payload?.affiliateProductIds?.length
          ? payload?.affiliateProductIds
          : null,
    },
    [],
  );

  const result = await prisma.featured.update({
    where: {
      id,
    },
    data: data,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log update feature
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

    const logTitle = `কোর্সের ফিচার আপডেট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের ফিচার আপডেট করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update feature");
  }

  return response;
};

const deleteFeatured = async (id) => {
  const isExist = await prisma.featured.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Featured not found!");

  const result = await prisma.featured.update({
    where: {
      id,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });

  //log delete feature activity
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

    const logTitle = `কোর্স ফিচার ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের ফিচার ডিলিট করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on delete feature");
  }

  return true;
};

export const featuredServices = {
  getOneById,
  createFeatured,
  updateFeatured,
  deleteFeatured,
  getAllFeaturedByCourseId,
  getAllFeaturedByCycleId,
};
