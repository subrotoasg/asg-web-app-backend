import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { nanoid } from "nanoid";
import AppErrors from "../../../../errors/AppErrors.js";
import { prisma } from "../../../../../constants/index.js";
import { sendLiveClassNotification } from "./liveClass.helpers.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { v4 as uuidv4 } from "uuid";
import {
  bunnyVideoStatusMap,
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
  uploadSelecFields,
} from "./liveClass.constants.js";
import { getUserByRole } from "../../../../helper/userModelBasedInfo.js";
import { Enums } from "../../../constant/enums.js";
import {
  convertInToUTC,
  convertToUTC,
} from "../../../../helper/convertIntoUTCTime.js";
import jwt from "jsonwebtoken";
import config from "../../../config/index.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  findCourseByClassContent,
  findCourseByCourseSubjectChapter,
  findCourseByLiveClass,
  findCycleByCycleSubjectChapter,
  findCycleByLiveClass,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import {
  formatTime,
  getCourseName,
  getCourseOrCycleId,
  sanitizeLiveClassResponse,
} from "./liveClass.utlis.js";
import { PushMessagingServices } from "../../student/firebase/messaging/pushMessaging/pushMessaging.services.js";
import { activity } from "../../../../helper/activityLog.js";
import { verifyUserTokenWithSignature } from "../../authentication/auth.utlis.js";
import { handleParticipantsAndMeeages } from "../liveClassV3Api/liveClass.utlis.js";
import {
  getCachedLiveClassList,
  invalidateLiveClassCache,
  LIVE_CLASS_LIST_CACHE_TTL_MS,
} from "../liveClassV3Api/liveClass.cache.js";
import { publishRecordedLiveClass } from "./publishLiveClassUpload.js";

const getLiveClassHostScope = (hostName) => {
  if (
    hostName &&
    (hostName === config.frb_host_name ||
      hostName === config.frb_local_host_name)
  ) {
    return "frb";
  }

  if (
    hostName &&
    (hostName === config.academic_host_name ||
      hostName === config.academic_local_host_name)
  ) {
    return "academic";
  }

  if (
    hostName &&
    [
      config.varsity_host_name,
      config.medical_host_name,
      config.engineering_host_name,
      config.admission_host_name,
    ].includes(hostName)
  ) {
    return "admission";
  }

  return "default";
};

const getAllLiveClassfromDb = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const now = convertToUTC(new Date());

  const nowDate = new Date(now);
  // 15 minutes grace period
  const tenMinutesAgo = new Date(
    nowDate.getTime() - 15 * 60 * 1000,
  ).toISOString();

  // next 48 hours
  const fortyEightHoursLater = new Date(
    nowDate.getTime() + 48 * 60 * 60 * 1000,
  ).toISOString();

  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
  }

  const isStudent = decoded?.role === Enums.roles.STUDENT;

  const upcomingStartTimeFilter = isStudent
    ? {
        gt: tenMinutesAgo,
        lte: fortyEightHoursLater,
      }
    : {
        gt: tenMinutesAgo,
      };

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  // Build the shared host-based filter once so it's not duplicated 3x
  const hostFilter =
    hostName &&
    (hostName === config.frb_host_name ||
      hostName === config.frb_local_host_name)
      ? {
          courseSubjectChapter: {
            courseSubject: {
              course: {
                AND: [
                  { Category: { contains: "Academic" } },
                  { productName: { contains: "FRB" } },
                  { cycleAvailable: false },
                ],
              },
            },
          },
        }
      : hostName &&
          (hostName === config.academic_host_name ||
            hostName === config.academic_local_host_name)
        ? {
            cycleSubjectChapter: {
              cycleSubject: {
                cycle: {
                  course: {
                    cycleAvailable: true,
                  },
                },
              },
            },
          }
        : hostName &&
            (hostName === config.varsity_host_name ||
              hostName === config.medical_host_name ||
              hostName === config.engineering_host_name ||
              hostName === config.admission_host_name)
          ? {
              courseSubjectChapter: {
                courseSubject: {
                  course: {
                    AND: [
                      { Category: { contains: "Admission" } },
                      { NOT: { Category: { contains: "Academic" } } },
                      { cycleAvailable: false },
                    ],
                  },
                },
              },
            }
          : {};

  const timeBucket = Math.floor(
    nowDate.getTime() / LIVE_CLASS_LIST_CACHE_TTL_MS,
  );
  const baseSnapshot = await getCachedLiveClassList({
    hostScope: getLiveClassHostScope(hostName),
    query: { skip, take, orderBy, where },
    timeBucket,
    loader: async () => {
      const [liveClassesData, upcomingClassesData, totalCount] =
        await Promise.all([
          prisma.liveClass.findMany({
            where: {
              AND: [{ status: "live" }, { isDeleted: false }, hostFilter],
            },
            orderBy: { startTime: "asc" },
            skip,
            take,
            select: selectFields,
          }),
          prisma.liveClass.findMany({
            where: {
              AND: [
                // { startTime: { gt: tenMinutesAgo } },
                { startTime: upcomingStartTimeFilter },
                { status: "scheduled" },
                { isDeleted: false },
                hostFilter,
              ],
            },
            orderBy: { startTime: "asc" },
            skip,
            take,
            select: selectFields,
          }),
          prisma.liveClass.count({
            where: {
              AND: [
                { ...where },
                { isDeleted: false },
                {
                  OR: [
                    { status: "live" },
                    {
                      status: "scheduled",
                      // startTime: { gt: tenMinutesAgo },
                      startTime: upcomingStartTimeFilter,
                    },
                  ],
                },
                hostFilter,
              ],
            },
          }),
        ]);

      return { liveClassesData, upcomingClassesData, totalCount };
    },
  });

  const { liveClassesData, upcomingClassesData, totalCount } = baseSnapshot;

  let liveClasses = liveClassesData;
  let upcomingClasses = upcomingClassesData;
  if (decoded?.role === Enums.roles.STUDENT) {
    const result = await prisma.course.findMany({
      where: {
        AND: [
          { ...where },
          { isDeleted: false },
          hostName &&
          (hostName === config.frb_host_name ||
            hostName === config.frb_local_host_name)
            ? {
                AND: [
                  { Category: { contains: "Academic" } },
                  { productName: { contains: "FRB" } },
                  { cycleAvailable: false },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? { cycleAvailable: true }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      { Category: { contains: "Admission" } },
                      { NOT: { Category: { contains: "Academic" } } },
                      { cycleAvailable: false },
                    ],
                  }
                : {},
          {
            ...(decoded?.id &&
              decoded?.role === Enums.roles.ADMIN && {
                courseAdmin: {
                  some: { adminId: decoded?.id },
                },
              }),
          },
        ],
      },
      select: {
        id: true,
        cycle: {
          select: {
            id: true,
          },
        },
      },
    });
    const cycleIds = result
      ?.flatMap((course) => course?.cycle?.map((c) => c?.id) || [])
      ?.filter(Boolean);

    const [enrolledCourses, enrolledCycles] = await Promise.all([
      prisma.courseStudent.findMany({
        where: {
          studentId: decoded?.id,
          courseId: { in: result?.map((course) => course.id) },
        },
        select: {
          courseId: true,
          course: { select: { Category: true } },
        },
      }),
      prisma.cycleStudent.findMany({
        where: {
          studentId: decoded?.id,
          cycleId: { in: cycleIds },
        },
        select: {
          cycleId: true,
          cycle: { select: { course: { select: { Category: true } } } },
        },
      }),
    ]);

    const enrollMentUniqueCourseCategories =
      [...new Set(enrolledCourses?.map((item) => item?.course?.Category))] ||
      [];

    const enrolledCourseMap = new Map(
      enrolledCourses?.map((enrollment) => [enrollment?.courseId, enrollment]),
    );

    const enrollMentUniqueCycleCategories =
      [
        ...new Set(
          enrolledCycles?.map((item) => item?.cycle?.course?.Category),
        ),
      ] || [];

    const enrolledCycleMap = new Map(
      enrolledCycles?.map((enrollment) => [enrollment?.cycleId, enrollment]),
    );

    const uniquelyCourseAndCycleCategory = [
      ...new Set([
        ...enrollMentUniqueCourseCategories,
        ...enrollMentUniqueCycleCategories,
      ]),
    ];

    if (platform) {
      liveClasses = liveClassesData
        ?.filter((el) =>
          uniquelyCourseAndCycleCategory?.includes(
            el.courseSubjectChapter?.courseSubject?.course?.Category ||
              el.cycleSubjectChapter?.cycleSubject?.cycle?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasCourseAccess = enrolledCourseMap.has(
            el?.courseSubjectChapter?.courseSubject?.course?.id ||
              el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
          );
          const hasCycleAccess = enrolledCycleMap.has(
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
          );
          const hasAccess = el?.cycleSubjectChapter?.cycleSubject?.cycle?.id
            ? hasCycleAccess
            : hasCourseAccess || hasCycleAccess;

          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });

      upcomingClasses = upcomingClassesData
        ?.filter((el) =>
          uniquelyCourseAndCycleCategory?.includes(
            el.courseSubjectChapter?.courseSubject?.course?.Category ||
              el.cycleSubjectChapter?.cycleSubject?.cycle?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasCourseAccess = enrolledCourseMap.has(
            el?.courseSubjectChapter?.courseSubject?.course?.id ||
              el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
          );
          const hasCycleAccess = enrolledCycleMap.has(
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
          );
          const hasAccess = el?.cycleSubjectChapter?.cycleSubject?.cycle?.id
            ? hasCycleAccess
            : hasCourseAccess || hasCycleAccess;

          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });
    } else if (
      hostName &&
      (hostName === config.academic_host_name ||
        hostName === config.academic_local_host_name)
    ) {
      liveClasses = liveClassesData
        ?.filter((el) =>
          enrollMentUniqueCycleCategories?.includes(
            el.cycleSubjectChapter?.cycleSubject?.cycle?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasAccess = enrolledCycleMap.has(
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
          );

          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });

      upcomingClasses = upcomingClassesData
        ?.filter((el) =>
          enrollMentUniqueCycleCategories?.includes(
            el.cycleSubjectChapter?.cycleSubject?.cycle?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasAccess = enrolledCycleMap?.has(
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
          );
          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });
    } else {
      liveClasses = liveClassesData
        ?.filter((el) =>
          enrollMentUniqueCourseCategories?.includes(
            el.courseSubjectChapter?.courseSubject?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasAccess = enrolledCourseMap.has(
            el?.courseSubjectChapter?.courseSubject?.course?.id ||
              el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
          );
          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });

      upcomingClasses = upcomingClassesData
        ?.filter((el) =>
          enrollMentUniqueCourseCategories?.includes(
            el.courseSubjectChapter?.courseSubject?.course?.Category,
          ),
        )
        ?.map((el) => {
          const hasAccess = enrolledCourseMap?.has(
            el?.courseSubjectChapter?.courseSubject?.course?.id ||
              el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
          );
          return {
            ...el,
            hasAccess,
            videoId: hasAccess ? el?.videoId : "varsity_",
          };
        });
    }
  } else if (decoded?.role === Enums.roles.ADMIN) {
    const result = await prisma.course.findMany({
      where: {
        AND: [
          { ...where },
          { isDeleted: false },
          hostName &&
          (hostName === config.frb_host_name ||
            hostName === config.frb_local_host_name)
            ? {
                AND: [
                  { Category: { contains: "Academic" } },
                  { productName: { contains: "FRB" } },
                  { cycleAvailable: false },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? { cycleAvailable: true }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      { Category: { contains: "Admission" } },
                      { NOT: { Category: { contains: "Academic" } } },
                      { cycleAvailable: false },
                    ],
                  }
                : {},
          {
            ...(decoded?.id &&
              decoded?.role === Enums.roles.ADMIN && {
                courseAdmin: {
                  some: { adminId: decoded?.id },
                },
              }),
          },
        ],
      },
      // Only `.id` is ever read from this result (see adminCourses Set below),
      // so this is the minimal, provably-safe select.
      select: { id: true },
    });

    const adminCourses = new Set(result?.map((el) => el?.id));

    liveClasses = liveClassesData
      ?.map((el) => {
        const hasAccess = adminCourses.has(
          el?.courseSubjectChapter?.courseSubject?.course?.id ||
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        );
        return {
          ...el,
          hasAccess,
          videoId: hasAccess ? el?.videoId : "varsity_",
        };
      })
      ?.filter((el) => el.hasAccess);

    upcomingClasses = upcomingClassesData
      ?.map((el) => {
        const hasAccess = adminCourses.has(
          el?.courseSubjectChapter?.courseSubject?.course?.id ||
            el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        );
        return {
          ...el,
          hasAccess,
          videoId: hasAccess ? el?.videoId : "varsity_",
        };
      })
      ?.filter((el) => el.hasAccess);
  }

  liveClasses = liveClasses
    ?.map((el) => {
      const { courseSubjectChapter: _, cycleSubjectChapter: foo, ...rest } = el;
      const courseSubjectChapter = {
        id: el?.courseSubjectChapter?.id,
        title: el?.courseSubjectChapter?.title,
        chapterId: el?.courseSubjectChapter?.chapter?.id,
        chapterName: el?.courseSubjectChapter?.chapter?.chapterName,
        chapterNo: el?.courseSubjectChapter?.chapter?.chapterNo,
      };

      const cycleSubjectChapter = {
        id: el?.cycleSubjectChapter?.id,
        title: el?.cycleSubjectChapter?.title,
        chapterId: el?.cycleSubjectChapter?.chapter?.id,
        chapterName: el?.cycleSubjectChapter?.chapter?.chapterName,
        chapterNo: el?.cycleSubjectChapter?.chapter?.chapterNo,
      };

      const courseSubject = {
        id: el?.courseSubjectChapter?.courseSubject?.id,
        subjectName: el?.courseSubjectChapter?.courseSubject?.subject?.title,
        subjectId: el?.courseSubjectChapter?.courseSubject?.subject?.id,
        title: el?.courseSubjectChapter?.title,
      };

      const cycleSubject = {
        id: el?.cycleSubjectChapter?.cycleSubject?.id,
        subjectName: el?.cycleSubjectChapter?.cycleSubject?.subject?.title,
        subjectId: el?.cycleSubjectChapter?.cycleSubject?.subject?.id,
        title: el?.cycleSubjectChapter?.title,
      };

      const course = {
        id:
          el?.courseSubjectChapter?.courseSubject?.course?.id ||
          el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        title:
          el?.courseSubjectChapter?.courseSubject?.course?.productName ||
          el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.productName,
        subTitle:
          el?.courseSubjectChapter?.courseSubject?.course?.productFullName,
        facebookGroupUrl:
          el?.courseSubjectChapter?.courseSubject?.course?.facebookGroup ||
          el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.facebookGroup,
      };
      const cycle = {
        id: el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
        title: el?.cycleSubjectChapter?.cycleSubject?.cycle?.title,
        cycleImage: el?.cycleSubjectChapter?.cycleSubject?.cycle?.cycleImage,
      };
      rest.course = course;
      rest.cycle = cycle;
      rest.courseSubject = courseSubject;
      rest.cycleSubject = cycleSubject;
      rest.courseSubjectChapter = courseSubjectChapter;
      rest.cycleSubjectChapter = cycleSubjectChapter;
      rest.Permalink =
        el?.courseSubjectChapter?.courseSubject?.course?.Permalink ||
        el?.cycleSubjectChapter?.cycleSubject?.cycle?.Permalink;
      rest.courseTitle =
        el?.courseSubjectChapter?.courseSubject?.course?.productName ||
        el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.productName;
      return rest;
    })
    ?.map((item) =>
      sanitizeLiveClassResponse(
        item,
        decoded?.role === Enums.roles.ADMIN,
        decoded?.role === Enums.roles.STUDENT,
      ),
    )
    ?.sort((a, b) => {
      if (a.hasAccess === b.hasAccess) return 0;
      return a.hasAccess ? -1 : 1;
    });

  upcomingClasses = upcomingClasses
    ?.map((el) => {
      const { courseSubjectChapter: _, ...rest } = el;

      const courseSubjectChapter = {
        id: el?.courseSubjectChapter?.id,
        title: el?.courseSubjectChapter?.title,
        chapterId: el?.courseSubjectChapter?.chapter?.id,
        chapterName: el?.courseSubjectChapter?.chapter?.chapterName,
        chapterNo: el?.courseSubjectChapter?.chapter?.chapterNo,
      };

      const cycleSubjectChapter = {
        id: el?.cycleSubjectChapter?.id,
        title: el?.cycleSubjectChapter?.title,
        chapterId: el?.cycleSubjectChapter?.chapter?.id,
        chapterName: el?.cycleSubjectChapter?.chapter?.chapterName,
        chapterNo: el?.cycleSubjectChapter?.chapter?.chapterNo,
      };

      const courseSubject = {
        id: el?.courseSubjectChapter?.courseSubject?.id,
        subjectName: el?.courseSubjectChapter?.courseSubject?.subject?.title,
        subjectId: el?.courseSubjectChapter?.courseSubject?.subject?.id,
        title: el?.courseSubjectChapter?.title,
      };

      const cycleSubject = {
        id: el?.cycleSubjectChapter?.cycleSubject?.id,
        subjectName: el?.cycleSubjectChapter?.cycleSubject?.subject?.title,
        subjectId: el?.cycleSubjectChapter?.cycleSubject?.subject?.id,
        title: el?.cycleSubjectChapter?.title,
      };

      const course = {
        id:
          el?.courseSubjectChapter?.courseSubject?.course?.id ||
          el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        title:
          el?.courseSubjectChapter?.courseSubject?.course?.productName ||
          el?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.productName,
        subTitle:
          el?.courseSubjectChapter?.courseSubject?.course?.productFullName,
      };

      const cycle = {
        id: el?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
        title: el?.cycleSubjectChapter?.cycleSubject?.cycle?.title,
        cycleImage: el?.cycleSubjectChapter?.cycleSubject?.cycle?.cycleImage,
      };

      rest.course = course;
      rest.cycle = cycle;
      rest.courseSubject = courseSubject;
      rest.cycleSubject = cycleSubject;
      rest.courseSubjectChapter = courseSubjectChapter;
      rest.cycleSubjectChapter = cycleSubjectChapter;
      rest.Permalink =
        el?.courseSubjectChapter?.courseSubject?.course?.Permalink ||
        el?.cycleSubjectChapter?.cycleSubject?.cycle?.Permalink;
      return rest;
    })
    ?.map((item) =>
      sanitizeLiveClassResponse(
        item,
        decoded?.role === Enums.roles.ADMIN,
        decoded?.role === Enums.roles.STUDENT,
      ),
    )
    ?.sort((a, b) => {
      if (a.hasAccess === b.hasAccess) return 0;
      return a.hasAccess ? -1 : 1;
    });

  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  const result = {
    liveClasses,
    upcomingClasses,
  };

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//join Class
const joinLiveClassfromDb = async (liveClassId, user) => {
  const liveClassInfo = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });
  if (!liveClassInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  const videoId = liveClassInfo?.videoId;

  if (videoId && videoId.startsWith("varsity_")) {
    const suffix = videoId?.slice("varsity_".length);
    if (!suffix) {
      throw new AppErrors(404, "Please Enroll this course");
    }
  }
  const userInfo = await getUserByRole(user);

  const isLiveStatus = liveClassInfo?.status;
  const teacherOrCoTeacherIdentifier =
    userInfo?.role === Enums.roles.ADMIN && isLiveStatus === "live" ? 11 : 1;
  const data = {
    client_id: process.env.CLIENT_ID,
    auth_key: process.env.AUTH_KEY,
    room_id: videoId,
    user_id: userInfo?.id?.replace(/-/g, ""),
    name:
      userInfo?.name || userInfo?.email || userInfo?.phone || userInfo?.role,
    type:
      userInfo?.role === Enums.roles.STUDENT ? 3 : teacherOrCoTeacherIdentifier,
  };

  const config = {
    method: "post",
    url: "https://api.teachmint.com/add/user",
    headers: { "Content-Type": "application/json" },
    data,
  };

  const joinRes = await axios(config);

  //Custom Result
  const result = {
    isLive: joinRes?.data?.obj?.live,
    isLiveUrl: joinRes?.data?.obj?.url,
    secondaryUrl: liveClassInfo?.secondaryUrl,
  };
  return result;
};

//join Class
const joinFlowLiveClassfromDb = async (liveClassId, user) => {
  const liveClassInfo = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });
  if (!liveClassInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  const videoId = liveClassInfo?.videoId;

  const userInfo = await getUserByRole(user);

  const teacherOrCoTeacherIdentifier =
    userInfo?.role === Enums.roles.ADMIN ? "host" : "viewer";

  const data = {
    clientId: process.env.FLOW_CLIENT_ID,
    apiKey: process.env.FLOW_API_KEY,
    roomId: videoId,
    name: userInfo?.name,
    unique_id: userInfo?.id,
    type: teacherOrCoTeacherIdentifier,
  };

  const config = {
    method: "post",
    url: `${process.env.FLOW_BASE_URL}/live-session/room/add-user`,
    headers: { "Content-Type": "application/json" },
    data,
  };

  const joinRes = await axios(config);

  //Custom Result
  const result = {
    isLive: joinRes?.data?.data?.live,
    isLiveUrl: joinRes?.data?.data?.joinUrl,
    secondaryUrl: liveClassInfo?.secondaryUrl,
  };
  return result;
};

//Get single LiveClass Services
const getSingleLiveClassfromDb = async (liveClassId) => {
  const result = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });

  if (!result)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Create LiveClass Services
const createLiveClassIntoDb = async (LiveClassImage, payload, hostName) => {
  const {
    title,
    adminId,
    superAdminId,
    description,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime,
    instructor,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    classNumber,
    secondaryUrl,
    libraryId,
  } = payload;
  //room Id Creation
  const room_id = nanoid(10);

  let liveClassData;
  let courseOrCycleDbValue;
  if (courseSubjectChapterId) {
    const subjectRecord = await prisma.courseSubjectChapter.findFirst({
      where: { id: courseSubjectChapterId },
      select: {
        id: true,
        title: true,
        courseSubject: {
          select: {
            courseId: true,
            subject: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!subjectRecord) {
      throw new AppErrors(404, "Subject not found");
    }
    courseOrCycleDbValue = subjectRecord;
    const subjectName = subjectRecord?.courseSubject?.subject?.title;
  } else if (cycleSubjectChapterId) {
    const subjectRecord = await prisma.cycleSubjectChapter.findFirst({
      where: { id: cycleSubjectChapterId },
      select: {
        id: true,
        title: true,
        cycleSubject: {
          select: {
            cycleId: true,
            subject: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!subjectRecord) {
      throw new AppErrors(404, "Subject not found");
    }
    courseOrCycleDbValue = subjectRecord;
    const subjectName = subjectRecord?.cycleSubject?.subject?.title;
  } else {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Subject Chapter Id is required",
    );
  }
  const tmdata = JSON.stringify({
    client_id: process.env.CLIENT_ID,
    auth_key: process.env.AUTH_KEY,
    room_id: `varsity_${room_id}`,
    name: description,
    settings: {
      is_recording_on: true,
      is_mic_blocked: true,
      is_video_blocked: true,
      video_quality: "HD",
    },
    recording: {
      enabled: true,
      auto_start: true,
    },
  });

  const config = {
    method: "post",
    url: "https://api.teachmint.com/add/room",
    headers: {
      "Content-Type": "application/json",
    },
    data: tmdata,
  };

  // Create Teachmint room
  const tmRes = await axios(config);

  if (!tmRes?.data?.status) {
    throw new AppErrors(
      404,
      tmRes?.data?.msg || "Teachmint room creation failed",
    );
  }

  // Extract stream URL if available
  const streamUrl = tmRes?.data?.data?.stream_url || null;

  // transform updated fields
  liveClassData = {
    title,
    description,
    adminId,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime: convertToUTC(startTime),
    videoId: `varsity_${room_id}`,
    stream: streamUrl,
    instructor,
    thumbnail: LiveClassImage || null,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    status: "scheduled",
    vimeo: classNumber,
    secondaryUrl,
    libraryId,
  };

  const transformedData = transformUpdatedFields(liveClassData, []);

  // Save in Prisma DB
  const liveClassCreationResponse = await prisma.liveClass.create({
    data: transformedData,
  });
  await invalidateLiveClassCache(liveClassCreationResponse.id);

  if (transformedData?.courseSubjectChapterId) {
    const getCourse = await findCourseByLiveClass(
      liveClassCreationResponse?.id,
    );

    //upsert to course lookup
    await logLookUpTable(liveClassCreationResponse?.id, getCourse?.id);
  } else if (transformedData?.cycleSubjectChapterId) {
    const getCycle = await findCycleByLiveClass(liveClassCreationResponse?.id);

    //upsert to cycle lookup
    await logCycleLookUpTable(liveClassCreationResponse?.id, getCycle?.id);
    //upset to course lookup
    await logLookUpTable(liveClassCreationResponse?.id, getCycle?.course?.id);
  }

  //send notification
  if (liveClassCreationResponse?.status === "scheduled") {
    try {
      const courseOrCycle = getCourseOrCycleId(courseOrCycleDbValue);
      const notificationData = {
        ...courseOrCycle,
        title: `তোমার ${title} লাইভ ক্লাস শুরু হবে ${formatTime(startTime)}`,
        body: `লাইভ ক্লাসে তোমার সাথে থাকবেন ${instructor}`,
        data: {
          type: "LIVE CLASS SCHEDULE REMEMBER",
          deepLink: `${hostName}`,
          image:
            LiveClassImage ||
            "https://apars.b-cdn.net/fcm%20icon/1200%20x%20600%20without%20bg.png",
          actions:
            '[{"action":"open","title":"Open"},{"action":"dismiss","title":"Dismiss"}]',
        },
        eventKey: liveClassCreationResponse?.id,
      };

      // Fire and forget - don't wait for completion
      PushMessagingServices.broadcastPushMessageIntoDb(notificationData).catch(
        (error) => {
          console.error("Notification failed:", error);
        },
      );
    } catch (error) {
      console.error("Notification preparation failed:", error);
    }
  }

  //Modify Response
  const response = pickCreateAndUpdateResponse(
    liveClassCreationResponse,
    sendResponseFields,
  );
  return response;
};

const createLiveClassToFlow = async (LiveClassImage, payload, hostName) => {
  const {
    title,
    adminId,
    description,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime,
    instructor,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    classNumber,
    secondaryUrl,
    libraryId,
    webhook,
  } = payload;
  //room Id Creation
  const room_id = nanoid(10);

  let liveClassData;
  let courseOrCycleDbValue;
  if (courseSubjectChapterId) {
    const subjectRecord = await prisma.courseSubjectChapter.findFirst({
      where: { id: courseSubjectChapterId },
      select: {
        id: true,
        title: true,
        courseSubject: {
          select: {
            courseId: true,
            course: {
              select: {
                productName: true,
              },
            },
            subject: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!subjectRecord) {
      throw new AppErrors(404, "Subject not found");
    }
    courseOrCycleDbValue = subjectRecord;
    const subjectName = subjectRecord?.courseSubject?.subject?.title;
  } else if (cycleSubjectChapterId) {
    const subjectRecord = await prisma.cycleSubjectChapter.findFirst({
      where: { id: cycleSubjectChapterId },
      select: {
        id: true,
        title: true,
        cycleSubject: {
          select: {
            cycleId: true,
            cycle: {
              select: {
                course: {
                  select: {
                    productName: true,
                  },
                },
              },
            },
            subject: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!subjectRecord) {
      throw new AppErrors(404, "Subject not found");
    }
    courseOrCycleDbValue = subjectRecord;
    const subjectName = subjectRecord?.cycleSubject?.subject?.title;
  } else {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Subject Chapter Id is required",
    );
  }

  const courseName = getCourseName(courseOrCycleDbValue);

  const tmdata = JSON.stringify({
    sessionTitle: title,
    clientId: process.env.FLOW_CLIENT_ID,
    apiKey: process.env.FLOW_API_KEY,
    roomId: `varsity_${room_id}`,
    host: instructor,
    batchName: courseName?.course,
    webhook: webhook,
    sessionType: "private" || sessionType,
    startTime: new Date(startTime).toISOString(),
  });

  const config = {
    method: "POST",
    url: `${process.env.FLOW_BASE_URL}/live-session/register-session-tpStream`,
    headers: {
      "Content-Type": "application/json",
    },
    data: tmdata,
  };

  // Create Teachmint room
  let tmRes;

  try {
    tmRes = await axios(config);
    console.log(tmRes?.data, "ther data after ");
  } catch (error) {
    // console.log(error);
  }

  if (!tmRes?.data?.success) {
    throw new AppErrors(404, tmRes?.data?.msg || "Flow room creation failed");
  }

  // Extract stream URL if available
  const streamUrl = tmRes?.data?.data?.stream_url || null;

  // transform updated fields
  liveClassData = {
    title,
    description,
    adminId,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime: convertToUTC(startTime),
    videoId: `varsity_${room_id}`,
    stream: streamUrl,
    instructor,
    thumbnail: LiveClassImage || null,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    status: "scheduled",
    vimeo: classNumber,
    secondaryUrl,
    libraryId,
  };

  const transformedData = transformUpdatedFields(liveClassData, []);

  // Save in Prisma DB
  const liveClassCreationResponse = await prisma.liveClass.create({
    data: transformedData,
  });
  await invalidateLiveClassCache(liveClassCreationResponse.id);

  if (transformedData?.courseSubjectChapterId) {
    const getCourse = await findCourseByLiveClass(
      liveClassCreationResponse?.id,
    );

    //upsert to course lookup
    await logLookUpTable(liveClassCreationResponse?.id, getCourse?.id);
  } else if (transformedData?.cycleSubjectChapterId) {
    const getCycle = await findCycleByLiveClass(liveClassCreationResponse?.id);

    //upsert to cycle lookup
    await logCycleLookUpTable(liveClassCreationResponse?.id, getCycle?.id);
    //upset to course lookup
    await logLookUpTable(liveClassCreationResponse?.id, getCycle?.course?.id);
  }

  //send notification
  // if (liveClassCreationResponse?.status === "scheduled") {
  //   try {
  //     const courseOrCycle = getCourseOrCycleId(courseOrCycleDbValue);
  //     const notificationData = {
  //       ...courseOrCycle,
  //       title: `তোমার ${title} লাইভ ক্লাস শুরু হবে ${formatTime(startTime)}`,
  //       body: `লাইভ ক্লাসে তোমার সাথে থাকবেন ${instructor}`,
  //       data: {
  //         type: "LIVE CLASS SCHEDULE REMEMBER",
  //         deepLink: `${hostName}`,
  //         image:
  //           LiveClassImage ||
  //           "https://apars.b-cdn.net/fcm%20icon/1200%20x%20600%20without%20bg.png",
  //         actions:
  //           '[{"action":"open","title":"Open"},{"action":"dismiss","title":"Dismiss"}]',
  //       },
  //       eventKey: liveClassCreationResponse?.id,
  //     };

  //     // Fire and forget - don't wait for completion
  //     PushMessagingServices.broadcastPushMessageIntoDb(notificationData).catch(
  //       (error) => {
  //         console.error("Notification failed:", error);
  //       },
  //     );
  //   } catch (error) {
  //     console.error("Notification preparation failed:", error);
  //   }
  // }

  //Modify Response
  const response = pickCreateAndUpdateResponse(
    liveClassCreationResponse,
    sendResponseFields,
  );
  return response;
};

const updateFlowLiveClassStatusIntoDb = async (payload) => {
  const event = payload;
  if (!event) {
    throw new AppErrors(402, "Invalid payload");
  }

  switch (event?.event) {
    case "liveStart":
      return await handleSessionStarted(event);
    case "liveEnd":
      return await handleSessionEnded(event);
    case "recording.processed":
      return await handleRecordingReady(event);
    case "recording.failed":
      return await handleRecordingFailed(event);
    case "peer.joined":
      return await handlePeerJoined(event);
    case "peer.left":
      return await handlePeerLeft(event);
    case "whiteboard.new_file_saved":
      return await handleWhiteboardSaved(event);
    default:
      console.log("Unhandled event Name:", event.event_name);
      return {
        success: false,
      };
  }

  async function handleSessionStarted(event) {
    const {
      roomId,
      sessionTitle,
      batchName,
      host,
      startTime,
      resolution,
      status,
    } = event;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId: roomId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData?.id },
      data: {
        status: "live",
        startTime: startTime
          ? convertToUTC(startTime)
          : convertToUTC(new Date()),
        updatedAt: new Date(),
      },
    });
    await invalidateLiveClassCache(liveClassData.id);

    return updatedClass;
  }

  async function handleSessionEnded(event) {
    const {
      roomId,
      sessionTitle,
      batchName,
      host,
      startTime,
      endTime,
      duration,
      resolution,
      status,
      chatInfo,
    } = event;

    try {
      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId: roomId },
      });

      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "processing",
          endTime: endTime ? convertToUTC(endTime) : convertToUTC(new Date()),
          durationSec: duration || 0,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);
      //update participants and messages
      try {
        await handleParticipantsAndMeeages({}, roomId);
        return;
      } catch (error) {
        console.log("Auto Media Participants and Messages Retrive failed!");
      }
      return updatedClass;
    } catch (error) {
      console.log("Error getting session info:", error.message);
      const end_time = new Date(Number(time) / 1000);

      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });
      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "completed",
          endTime: end_time ? convertToUTC(end_time) : convertToUTC(new Date()),
          stream: session_id,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);

      return updatedClass;
    }
  }

  async function handleRecordingReady(event) {
    const { room_id: videoId, session_id } = event;

    const {
      raw_path,
      processed_path,
      thumbnail_256x144_path,
      thumbnail_path,
      _id: tsid,
      duration,
    } = event?.data;

    const liveClassData = await prisma.liveClass.findFirst({
      where: {
        videoId,
      },

      include: {
        courseSubjectChapter: true,
        cycleSubjectChapter: true,
        admin: true,
      },
    });

    if (!liveClassData) {
      throw new AppErrors(404, "Live class Data Not found");
    }

    let bunnyApiConfig = null;

    if (liveClassData?.libraryId) {
      bunnyApiConfig = await prisma.libApi.findFirst({
        where: {
          libraryId: liveClassData.libraryId,
        },
      });
    }

    const bunnyLibraryId = bunnyApiConfig
      ? liveClassData?.libraryId
      : process.env.BUNNY_LIBRATY_ID;

    const bunnyApiKey = bunnyApiConfig
      ? bunnyApiConfig.apiKey
      : process.env.BUNNY_AUTH_KEY;

    let bunnyVideoId = null;

    try {
      const response = await axios.post(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/fetch`,
        {
          url: processed_path,
        },
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: bunnyApiKey,
          },
          timeout: 15_000,
        },
      );

      bunnyVideoId = response?.data?.id;

      if (!bunnyVideoId) {
        throw new Error("Bunny video id not returned");
      }
    } catch (error) {
      console.error("Bunny upload failed:", error.message);

      throw new AppErrors(502, "Unable to start Bunny video upload");
    }

    const updatedClass = await prisma.liveClass.update({
      where: {
        id: liveClassData.id,
      },

      data: {
        status: "pending",
        stream: session_id,
        tsid,
        rec: processed_path,
        raw: raw_path,
        thumbnailPath: thumbnail_path,
        thumbnail256x144Path: thumbnail_256x144_path,
        durationSec: duration,
        bunnyVideoId,
        libraryId: `${bunnyLibraryId}`,
      },
    });
    await invalidateLiveClassCache(liveClassData.id);
    return updatedClass;
  }

  async function handleRecordingFailed(event) {
    const { room_id: videoId, session_id } = event;
    const {
      raw_path,
      processed_path,
      thumbnail_path,
      thumbnail_256x144_path,
      status,
      _id: tsid,
      duration,
    } = event?.data;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });
    if (!liveClassData) throw new AppErrors(404, "Not found");

    let bunnyVideoId = null;
    try {
      const getBunnyApiKey = await prisma.libApi.findFirst({
        where: {
          libraryId: liveClassData?.libraryId,
        },
      });

      const libraryId = getBunnyApiKey
        ? liveClassData?.libraryId
        : process.env.BUNNY_LIBRATY_ID;

      const accessKey = getBunnyApiKey
        ? getBunnyApiKey?.apiKey
        : process.env.BUNNY_AUTH_KEY;

      const uploadData = JSON.stringify({
        url: raw_path,
      });

      const response = await axios.post(
        `https://video.bunnycdn.com/library/${libraryId}/videos/fetch`,
        uploadData,
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: accessKey,
          },
        },
      );

      bunnyVideoId = response?.data?.id;
    } catch (error) {
      console.log("BunnyCDN upload failed:", error.message);
    }

    const updateData = {
      status: "recording_failed",
      stream: session_id,
      tsid: tsid,
      rec: raw_path,
      raw: raw_path,
      thumbnailPath: thumbnail_path,
      thumbnail256x144Path: thumbnail_256x144_path,
      durationSec: duration,
      bunnyVideoId: bunnyVideoId,
    };

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData?.id },
      data: updateData,
    });
    await invalidateLiveClassCache(liveClassData.id);

    return updatedClass;
  }

  async function handlePeerJoined(event) {
    const { room_id: videoId, data } = event;

    if (data.utype == 1) {
      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });

      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          uniqueViews: (liveClassData.uniqueViews || 0) + 1,
        },
      });

      return updatedClass;
    }
    return { status: 200, message: "Ping Received!" };
  }

  async function handlePeerLeft(event) {
    const { room_id: videoId, data } = event;

    if (data.utype == 1) {
      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });

      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          uniqueViews: Math.max(0, (liveClassData?.uniqueViews || 0) - 1),
        },
      });

      return updatedClass;
    }
    return { status: 200, message: "Ping Received!" };
  }

  async function handleWhiteboardSaved(event) {
    const { room_id: videoId, data } = event;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData.id },
      data: {
        slidesUrl: data.url,
      },
    });
    return updatedClass;
  }
};

//Live class Status update
const updateLiveClassStatusIntoDb = async (payload) => {
  const event = payload;
  if (!event) {
    throw new AppErrors(402, "Invalid teachmint payload");
  }

  switch (event?.event_name) {
    case "room.created":
      return await handleSessionStarted(event);
    case "room.closed":
      return await handleSessionEnded(event);
    case "recording.processed":
      return await handleRecordingReady(event);
    case "recording.failed":
      return await handleRecordingFailed(event);
    case "peer.joined":
      return await handlePeerJoined(event);
    case "peer.left":
      return await handlePeerLeft(event);
    case "whiteboard.new_file_saved":
      return await handleWhiteboardSaved(event);
    default:
      console.log("Unhandled event Name:", event.event_name);
      return {
        success: false,
      };
  }

  async function handleSessionStarted(event) {
    const { room_id: videoId, session_id, time } = event;
    const start_time = new Date(Number(time) / 1000);

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData?.id },
      data: {
        status: "live",
        stream: session_id,
        startTime: start_time
          ? convertToUTC(start_time)
          : convertToUTC(new Date()),
        updatedAt: new Date(),
      },
    });
    await invalidateLiveClassCache(liveClassData.id);

    return updatedClass;
  }

  async function handleSessionEnded(event) {
    const { room_id: videoId, session_id, time } = event;

    try {
      const sessionInfo = await axios.get(
        `https://api.teachmint.com/v2/rooms/${videoId}/sessions`,
        {
          headers: {
            clientId: process.env.CLIENT_ID,
            authKey: process.env.AUTH_KEY,
          },
        },
      );

      const end_time = new Date(Number(time) / 1000);
      const duration = sessionInfo?.data?.data?.sessions?.[0]?.duration;

      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });
      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "processing",
          roomClosedAt: end_time
            ? convertToUTC(end_time)
            : convertToUTC(new Date()),
          endTime: end_time ? convertToUTC(end_time) : convertToUTC(new Date()),
          durationSec: duration || 0,
          stream: session_id,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);

      // Teachmint room manually stop
      try {
        const datas = JSON.stringify({
          client_id: process.env.CLIENT_ID,
          auth_key: process.env.AUTH_KEY,
          room_id: videoId,
        });

        await axios.post("https://api.teachmint.com/remove/room", datas, {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.log("Room close API error:", error.message);
      }

      return updatedClass;
    } catch (error) {
      console.log("Error getting session info:", error.message);
      const end_time = new Date(Number(time) / 1000);

      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });
      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "completed",
          endTime: end_time ? convertToUTC(end_time) : convertToUTC(new Date()),
          stream: session_id,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);

      return updatedClass;
    }
  }

  async function handleRecordingReady(event) {
    const { room_id: videoId, session_id } = event;
    const {
      raw_path,
      processed_path,
      thumbnail_256x144_path,
      thumbnail_path,
      _id: tsid,
      duration,
    } = event?.data;

    // get live class
    const liveClassDatas = await prisma.liveClass.findFirst({
      where: { videoId },
      include: {
        courseSubjectChapter: true,
        cycleSubjectChapter: true,
        admin: true,
      },
    });
    if (!liveClassDatas) throw new AppErrors(404, "Live class Data Not found");

    const classNumber = liveClassDatas?.vimeo;
    const teacherThumbnail = liveClassDatas?.thumbnail;

    // upload to Bunny (outside transaction)
    let bunnyVideoId = null;

    let getBunnyApiKey = null;

    if (liveClassDatas?.libraryId) {
      getBunnyApiKey = await prisma.libApi.findFirst({
        where: {
          libraryId: liveClassDatas?.libraryId,
        },
      });
    }

    const bunnyLibraryId = getBunnyApiKey
      ? liveClassDatas?.libraryId
      : process.env.BUNNY_LIBRATY_ID;

    const bunnyApiKey = getBunnyApiKey
      ? getBunnyApiKey?.apiKey
      : process.env.BUNNY_AUTH_KEY;

    try {
      const response = await axios.post(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/fetch`,
        { url: processed_path },
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: bunnyApiKey,
          },
        },
      );
      // console.log(response, "response from bunny");
      bunnyVideoId = response?.data?.id;
    } catch (err) {
      console.error("Bunny upload failed:", err.message);
    }

    // const totalCount = await prisma.classContent.count({
    //   where: { isDeleted: false },
    // });
    const totalCount = Math.floor(Math.random() * 10) + 1;

    //  update DB atomically
    const [updatedClass, classUplodInfo] = await prisma.$transaction([
      prisma.liveClass.update({
        where: { id: liveClassDatas.id },
        data: {
          status: "pending",
          stream: session_id,
          tsid,
          rec: processed_path,
          raw: raw_path,
          thumbnailPath: thumbnail_path,
          thumbnail256x144Path: thumbnail_256x144_path,
          durationSec: duration,
          bunnyVideoId,
          libraryId: bunnyLibraryId,
          vimeo: "",
        },
      }),
      liveClassDatas?.courseSubjectChapterId
        ? prisma.classContent.create({
            data: {
              courseSubjectChapterId: liveClassDatas?.courseSubjectChapterId,
              adminId: liveClassDatas?.adminId,
              classTitle:
                liveClassDatas?.title ||
                `Class from ${liveClassDatas.startTime.toDateString()}`,
              classNo: classNumber || `${totalCount + 1}`,
              hostingType: "bunny",
              libraryId: bunnyLibraryId,
              videoUrl:
                bunnyVideoId ?? processed_path ?? liveClassDatas?.raw ?? "",
              description: liveClassDatas?.description,
              instructor: liveClassDatas?.instructor,
              thumbneil: teacherThumbnail ?? thumbnail_path,
              lectureSheet: liveClassDatas?.lectureSheet,
              practiceSheet: liveClassDatas?.practiceSheet,
              solutionSheet: liveClassDatas?.solutionSheet,
              markedBook: liveClassDatas?.markedBook,
              videoId: liveClassDatas.videoId,
            },
          })
        : prisma.cycleContent.create({
            data: {
              cycleSubjectChapterId: liveClassDatas?.cycleSubjectChapterId,
              adminId: liveClassDatas?.adminId,
              classTitle:
                liveClassDatas?.title ||
                `Class from ${liveClassDatas.startTime.toDateString()}`,
              classNo: classNumber || `${totalCount + 1}`,
              hostingType: "bunny",
              libraryId: bunnyLibraryId,
              videoUrl:
                bunnyVideoId ?? processed_path ?? liveClassDatas?.raw ?? "",
              description: liveClassDatas?.description,
              instructor: liveClassDatas?.instructor,
              thumbneil: teacherThumbnail ?? thumbnail_path,
              lectureSheet: liveClassDatas?.lectureSheet,
              practiceSheet: liveClassDatas?.practiceSheet,
              solutionSheet: liveClassDatas?.solutionSheet,
              markedBook: liveClassDatas?.markedBook,
              videoId: liveClassDatas.videoId,
            },
          }),
    ]);
    await invalidateLiveClassCache(liveClassDatas.id);

    if (liveClassDatas?.cycleSubjectChapterId) {
      const getCycle = await findCycleByLiveClass(liveClassDatas?.id);

      //upsert to cycle lookup
      await logCycleLookUpTable(classUplodInfo?.id, getCycle?.id);
      //upset to course lookup
      await logLookUpTable(classUplodInfo?.id, getCycle?.course?.id);
    } else if (liveClassDatas?.courseSubjectChapterId) {
      // lookups outside
      const getCourse = await findCourseByClassContent(
        classUplodInfo?.id,
        prisma,
      );
      await logLookUpTable(classUplodInfo?.id, getCourse?.id);
    }
    return { ...classUplodInfo, ...updatedClass };
  }

  async function handleRecordingFailed(event) {
    const { room_id: videoId, session_id } = event;
    const {
      raw_path,
      processed_path,
      thumbnail_path,
      thumbnail_256x144_path,
      status,
      _id: tsid,
      duration,
    } = event?.data;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });
    if (!liveClassData) throw new AppErrors(404, "Not found");

    let bunnyVideoId = null;
    try {
      const getBunnyApiKey = await prisma.libApi.findFirst({
        where: {
          libraryId: liveClassData?.libraryId,
        },
      });

      const libraryId = getBunnyApiKey
        ? liveClassData?.libraryId
        : process.env.BUNNY_LIBRATY_ID;

      const accessKey = getBunnyApiKey
        ? getBunnyApiKey?.apiKey
        : process.env.BUNNY_AUTH_KEY;

      const uploadData = JSON.stringify({
        url: raw_path,
      });

      const response = await axios.post(
        `https://video.bunnycdn.com/library/${libraryId}/videos/fetch`,
        uploadData,
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: accessKey,
          },
        },
      );

      bunnyVideoId = response?.data?.id;
    } catch (error) {
      console.log("BunnyCDN upload failed:", error.message);
    }

    const updateData = {
      status: "recording_failed",
      stream: session_id,
      tsid: tsid,
      rec: raw_path,
      raw: raw_path,
      thumbnailPath: thumbnail_path,
      thumbnail256x144Path: thumbnail_256x144_path,
      durationSec: duration,
      bunnyVideoId: bunnyVideoId,
    };

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData?.id },
      data: updateData,
    });
    await invalidateLiveClassCache(liveClassData.id);

    return updatedClass;
  }

  async function handlePeerJoined(event) {
    const { room_id: videoId, data } = event;

    if (data.utype == 1) {
      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });

      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          uniqueViews: (liveClassData.uniqueViews || 0) + 1,
        },
      });

      return updatedClass;
    }
    return { status: 200, message: "Ping Received!" };
  }

  async function handlePeerLeft(event) {
    const { room_id: videoId, data } = event;

    if (data.utype == 1) {
      const liveClassData = await prisma.liveClass.findFirst({
        where: { videoId },
      });

      if (!liveClassData) throw new AppErrors(404, "Not found");

      const updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          uniqueViews: Math.max(0, (liveClassData?.uniqueViews || 0) - 1),
        },
      });

      return updatedClass;
    }
    return { status: 200, message: "Ping Received!" };
  }

  async function handleWhiteboardSaved(event) {
    const { room_id: videoId, data } = event;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData.id },
      data: {
        slidesUrl: data.url,
      },
    });

    return updatedClass;
  }
};

const updateBunnyLiveClassVideoStatus = async (payload = {}) => {
  const { Status, VideoLibraryId, VideoGuid } = payload;

  const liveClassData = await prisma.liveClass.findFirst({
    where: {
      bunnyVideoId: VideoGuid,
    },
    include: {
      courseSubjectChapter: true,
      cycleSubjectChapter: true,
      admin: true,
    },
  });

  if (!liveClassData) {
    throw new AppErrors(404, "Live class not found");
  }

  if (Status === 0 || Status === 1 || Status === 2 || Status === 4) {
    // console.log("⏳ Bunny video still processing:", {
    //   liveClassId: liveClassData.id,
    //   Status,
    // });
    return null;
  }

  if (Status === 5) {
    console.error("Bunny video processing failed:", {
      liveClassId: liveClassData.id,
      bunnyVideoId: VideoGuid,
    });

    return null;
  }

  if (Status !== 3) {
    return null;
  }

  return publishRecordedLiveClass({
    liveClassData,
    bunnyVideoId: VideoGuid,
    bunnyLibraryId: `${VideoLibraryId}`,
  });
};

//Update LiveClass Services
const updateLiveClassIntoDb = async (liveClassId, liveClassImage, payload) => {
  const {
    title,
    description,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime,
    instructor,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    secondaryUrl,
    libraryId,
    adminId,
    superAdminId,
  } = payload;
  const isExistLiveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });

  if (!isExistLiveClass)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  const updatedFields = {
    title,
    description,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime,
    instructor,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    secondaryUrl,
    thumbnail: liveClassImage,
    libraryId,
  };
  const data = transformUpdatedFields(updatedFields, []);

  const existImageUrl = isExistLiveClass?.thumbnail;
  const isUpdatedImage = data?.thumbnail;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  if (data.startTime) {
    data.startTime = convertToUTC(startTime);
  }
  const result = await prisma.liveClass.update({
    where: {
      id: isExistLiveClass?.id,
    },
    data,
  });

  //new added cache
  await invalidateLiveClassCache(liveClassId);

  if (data?.courseSubjectChapterId) {
    const getCourse = await findCourseByLiveClass(isExistLiveClass?.id);
    //upsert to course lookup
    await logLookUpTable(isExistLiveClass?.id, getCourse?.id);
  } else if (data?.cycleSubjectChapterId) {
    const getCycle = await findCycleByLiveClass(isExistLiveClass?.id);
    //upsert to cycle lookup
    await logCycleLookUpTable(isExistLiveClass?.id, getCycle?.id);
    //upset to course lookup
    await logLookUpTable(isExistLiveClass?.id, getCycle?.course?.id);
  }

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log live class update
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
    let getCourse = null;
    if (isExistLiveClass?.courseSubjectChapterId)
      getCourse = await findCourseByLiveClass(liveClassId);
    else if (isExistLiveClass?.cycleSubjectChapterId)
      getCourse = await findCycleByLiveClass(liveClassId);
    const logTitle = `লাইভ ক্লাসের তথ্য এডিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName || getCourse?.course?.productName} কোর্সের ${isExistLiveClass?.instructor} শিক্ষকের ${isExistLiveClass?.title} ক্লাসের তথ্য এডিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on live class update");
  }

  return response;
};

//Delete LiveClass Services
const deleteLiveClassFromDb = async (liveClassId, payload) => {
  const { superAdminId, adminId } = payload;
  const isExistLiveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });

  if (!isExistLiveClass)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  const data = {
    isDeleted: true,
  };
  //update live class
  await prisma.liveClass.update({
    where: {
      id: isExistLiveClass?.id,
    },
    data,
  });
  await invalidateLiveClassCache(liveClassId);

  //log delete live class data
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

    let getCourse = null;

    if (isExistLiveClass?.courseSubjectChapterId)
      getCourse = await findCourseByLiveClass(liveClassId);
    if (isExistLiveClass?.cycleSubjectChapterId)
      getCourse = await findCycleByLiveClass(liveClassId);

    const logTitle = `লাইভ ক্লাস ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName || getCourse?.course?.productName} কোর্সের ${isExistLiveClass?.instructor} শিক্ষকের ${isExistLiveClass?.title} ক্লাসটি ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on delete live class");
  }

  return {};
};

//processing recorded class
const processingRecordedClass = async (courseSubjectChapterId) => {
  const result = await prisma.liveClass.findMany({
    where: {
      AND: [
        {
          OR: [
            { courseSubjectChapterId: courseSubjectChapterId },
            { cycleSubjectChapterId: courseSubjectChapterId },
          ],
        },
        { status: "processing" },
        { isDeleted: false },
      ],
    },
    select: uploadSelecFields,
  });

  if (!result)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Uploading Class not found");
  //Modify Response
  return result;
};

//live comments and poll request
const liveCommentAndPollViewer = async (videoId) => {
  if (!videoId)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  if (videoId && videoId.startsWith("varsity_")) {
    const suffix = videoId?.slice("varsity_".length);
    if (!suffix) {
      throw new AppErrors(404, "Please Enroll this course");
    }
  }

  const clientId = process.env.CLIENT_ID;
  const authKey = process.env.AUTH_KEY;

  if (!clientId || !authKey) {
    throw new AppErrors(
      402,
      "Missing CLIENT_ID or AUTH_KEY in environment variables",
    );
  }

  const config = {
    method: "get",
    url: `https://api.teachmint.com/v2/rooms/${videoId}/sessions`,
    headers: {
      clientId: clientId,
      authKey: authKey,
    },
  };

  const roomIdBasedRes = await axios(config);
  const roomSessions = roomIdBasedRes?.data?.data?.sessions?.map((session) => ({
    activeUsers: session.activeUsers,
    attendeesCount: session.attendeesCount,
    roomId: session.roomId,
    teachingDuration: session.teachingDuration,
    status: session.status,
    learningDuration: session.learningDuration,
  }));

  return roomSessions;
};

//live class data
const allSessionData = async (roomId, user) => {
  if (!roomId)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data not found");

  if (roomId?.startsWith("varsity_")) {
    const suffix = roomId.slice("varsity_".length);
    if (!suffix) {
      throw new AppErrors(
        StatusCodes.NOT_FOUND,
        "Please enroll in this course",
      );
    }
  }

  const clientId = process.env.CLIENT_ID;
  const authKey = process.env.AUTH_KEY;

  if (!clientId || !authKey) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Missing CLIENT_ID or AUTH_KEY in environment variables",
    );
  }

  //  Get all sessions of the room
  const roomConfig = {
    method: "get",
    url: `https://media.aparsclassroom.com/api/rooms/${roomId}/messages/export?type=json`,
    headers: {
      "x-client-id": process.env.CLIENT_ID,
      "x-auth-key": process.env.AUTH_KEY,
    },
  };

  const roomIdBasedRes = await axios(roomConfig);

  const chatMessages = roomIdBasedRes?.data || [];

  if (!chatMessages.length) {
    return { message: "No sessions found for this room", sessions: [] };
  }
  const processedChats =
    chatMessages?.map((chat) => ({
      chat_msg: chat?.content,
      from_msg: chat?.senderId,
      from_name: chat?.senderName,
      time: chat?.timestamp,
    })) || [];

  return processedChats;
};

// api for  teachment autometic price calculation
const teachmentAutometicSessionData = async (roomId, user) => {
  if (!roomId)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data not found");

  if (roomId?.startsWith("varsity_")) {
    const suffix = roomId.slice("varsity_".length);
    if (!suffix) {
      throw new AppErrors(
        StatusCodes.NOT_FOUND,
        "Applicable only for the new web application with the suffix 'varsity_'",
      );
    }
  }

  const clientId = process.env.CLIENT_ID;
  const authKey = process.env.AUTH_KEY;

  if (!clientId || !authKey) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Missing CLIENT_ID or AUTH_KEY in environment variables",
    );
  }

  //  Get all sessions of the room
  const roomConfig = {
    method: "get",
    url: `https://api.teachmint.com/v2/rooms/${roomId}/sessions`,
    headers: {
      clientId: clientId,
      authKey: authKey,
    },
  };

  const roomIdBasedRes = await axios(roomConfig);
  const sessions = roomIdBasedRes?.data?.data?.sessions || [];
  if (!sessions.length) {
    return { message: "No sessions found for this room", sessions: [] };
  }

  // Fetch data for all sessions in parallel
  const allSessionRes = await Promise.all(
    sessions?.map(async (session) => {
      const sessionId = session?._id || session?.session_id;
      if (!sessionId) return null;
      const sessionConfig = {
        method: "get",
        url: `https://api.teachmint.com/v2/sessions/${sessionId}`,
        headers: {
          clientId: clientId,
          authKey: authKey,
        },
      };
      const sessionRes = await axios(sessionConfig);
      const duration = ((s) =>
        `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`)(
        sessionRes?.data?.data?.session?.duration,
      );

      const liveClassInfo = await prisma.liveClass.findFirst({
        where: { videoId: roomId },
        include: {
          courseSubjectChapter: {
            include: {
              courseSubject: {
                include: {
                  course: true,
                  subject: true,
                },
              },
              chapter: true,
            },
          },
        },
      });

      return {
        Batch:
          liveClassInfo?.courseSubjectChapter?.courseSubject?.course
            ?.productName || "Unknown",
        Subject:
          liveClassInfo?.courseSubjectChapter?.courseSubject?.subject?.title ||
          "Unknown",
        Class: liveClassInfo?.title || "Unknown",
        Instructor: sessionRes?.data?.data?.session?.host?.[0]?.name,
      };
    }),
  );

  return allSessionRes?.[0];
};

//session data based
export const LiveClassServices = {
  getAllLiveClassfromDb,
  getSingleLiveClassfromDb,
  createLiveClassIntoDb,
  createLiveClassToFlow,
  updateLiveClassIntoDb,
  deleteLiveClassFromDb,
  joinLiveClassfromDb,
  joinFlowLiveClassfromDb,
  updateLiveClassStatusIntoDb,
  updateFlowLiveClassStatusIntoDb,
  updateBunnyLiveClassVideoStatus,
  processingRecordedClass,
  liveCommentAndPollViewer,
  allSessionData,
  teachmentAutometicSessionData,
};
