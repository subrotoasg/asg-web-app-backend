import axios, { HttpStatusCode } from "axios";
import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../../errors/AppErrors.js";
import { prisma } from "../../../../../constants/index.js";
import {
  filterableFields,
  mediaServers,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./liveClass.constants.js";
import { getUserByRole } from "../../../../helper/userModelBasedInfo.js";
import { Enums } from "../../../constant/enums.js";
import { convertToUTC } from "../../../../helper/convertIntoUTCTime.js";
import config from "../../../config/index.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  findCourseByClassContent,
  findCourseByCourseSubjectChapter,
  findCourseByCycleSubjectChapter,
  findCourseByLiveClass,
  findCycleByLiveClass,
  logCycleLookUpTable,
  logLookUpTable,
  newfindCourseByAnyHierarchyId,
} from "../../../middleware/handleCourseAuth.js";
import {
  formatTime,
  getCourseOrCycleDomainUrl,
  getCourseOrCycleId,
} from "../liveClass/liveClass.utlis.js";
import { PushMessagingServices } from "../../student/firebase/messaging/pushMessaging/pushMessaging.services.js";
import { sendNotification } from "../../student/firebase/messaging/utils/notificationUtlis.js";
import { activity } from "../../../../helper/activityLog.js";
import { tryCatch } from "bullmq";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { RestrictionType } from "../../../middleware/studentRestriction.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { redisConnection } from "../../../utlis/redis.js";
import {
  getLiveClassJoinMeta,
  getStreamConfig,
  invalidateLiveClassCache,
} from "./liveClass.cache.js";
const userIdSchema = z.string().uuid();

//create live class
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
    cdnUrl,
    bunnyApiKey,
  } = payload;

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
            cycle: {
              select: {
                courseId: true,
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

  const instructorId = instructor;
  const teacherInfo = await prisma.admin.findFirst({
    where: {
      id: instructorId,
      isDeleted: false,
    },
  });
  if (!teacherInfo) {
    throw new AppErrors(404, "Instructor not found");
  }

  const liveClassCourseId =
    courseOrCycleDbValue?.courseSubject?.courseId ||
    courseOrCycleDbValue?.cycleSubject?.cycle?.courseId;

  const getCourseInfoExtra = await prisma.course.findUnique({
    where: {
      id: liveClassCourseId,
    },
  });

  let getBunnyApiKey = null;

  if (getCourseInfoExtra?.libraryId) {
    getBunnyApiKey = await prisma.libApi.findFirst({
      where: {
        libraryId: getCourseInfoExtra?.libraryId,
      },
    });
  }

  const isInstructorAvailableThisCourse = await prisma.courseAdmin.findFirst({
    where: {
      courseId: liveClassCourseId,
      adminId: teacherInfo?.id,
      isDeleted: false,
    },
  });

  if (!isInstructorAvailableThisCourse) {
    throw new AppErrors(
      404,
      `দুঃখিত! ${teacherInfo.name} এই কোর্সের শিক্ষক হিসেবে নিবন্ধিত নন`,
    );
  }

  const hostId = teacherInfo?.id;
  const hostNameValue = teacherInfo?.name;

  const tmdata = JSON.stringify({
    name: title,
    description: description,
    hostId: hostId,
    hostName: hostNameValue,
    hostPhoto:
      teacherInfo?.photo || "https://i.postimg.cc/wBHhmmZs/images-(4).png",
    scheduledAt: startTime,
    duration: 60,
    maxParticipants: 10000,
    features: {
      chat: true,
      recording: true,
    },
    ...(cdnUrl &&
      bunnyApiKey && {
        cdnConfig: {
          cdnUrl: cdnUrl,
          bunnyApiKey: bunnyApiKey,
        },
      }),
  });

  const streamClientId = getCourseInfoExtra?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = getCourseInfoExtra?.authKey || process.env.AUTH_KEY;

  if (!getCourseInfoExtra?.clientId || !getCourseInfoExtra?.authKey) {
    throw new AppErrors(
      StatusCodes.FAILED_DEPENDENCY,
      "দুঃখিত! আপনি আমাদের লাইভ স্ট্রিমিং সার্ভিসটি সাবস্ক্রাইব করেন নি",
    );
  }

  const config = {
    method: "post",
    url: "https://media.aparsclassroom.com/api/rooms",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": streamClientId,
      "x-auth-key": streamAuthKey,
    },
    data: tmdata,
  };
  // Create Media AparsClass  room
  const tmRes = await axios(config);

  if (!tmRes?.data?.success) {
    throw new AppErrors(
      404,
      tmRes?.data?.msg || "Media AparsClass room creation failed",
    );
  }

  // Extract stream URL if available
  const videoId = tmRes?.data?.data?.id;
  const status = tmRes?.data?.data?.status;
  const webrtc = tmRes?.data?.data?.playbackUrls?.webrtc;
  const hls = tmRes?.data?.data?.playbackUrls?.hls;
  const hlsDirect = tmRes?.data?.data?.playbackUrls?.hlsDirect;
  const rtmp = tmRes?.data?.data?.playbackUrls?.rtmp;

  // transform updated fields
  liveClassData = {
    title,
    description,
    adminId: hostId,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime: convertToUTC(startTime),
    videoId,
    instructor: hostNameValue || "",
    thumbnail: LiveClassImage || null,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    status: status === "waiting" && "scheduled",
    vimeo: classNumber,
    secondaryUrl,
    libraryId: getCourseInfoExtra?.libraryId || libraryId,
    webrtc,
    hls,
    hlsDirect,
    rtmp,
    cdnUrl,
    bunnyApiKey: getBunnyApiKey?.apiKey || bunnyApiKey,
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
  //       title: `তোমার ${title} লাইভ ক্লাসটি শুরু হবে ${formatTime(startTime)}`,
  //       body: `লাইভ ক্লাসে তোমার সাথে থাকবেন ${hostNameValue}`,
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

  //log live class services
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

    const logTitle = `নতুন লাইভ ক্লাস শিডিউল করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourseInfoExtra?.productName} কোর্সে ${teacherInfo?.name} শিক্ষকের ক্লাস শিডিউল করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on create new live class");
  }

  return response;
};

//app free video creation
const createAppFressClassIntoDb = async (LiveClassImage, payload, hostName) => {
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
    cdnUrl,
    bunnyApiKey,
    customHlsUrl,
    publicEmbed,
  } = payload;

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
            cycle: {
              select: {
                courseId: true,
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

  const instructorId = instructor;
  const teacherInfo = await prisma.admin.findFirst({
    where: {
      id: instructorId,
      isDeleted: false,
    },
  });
  if (!teacherInfo) {
    throw new AppErrors(404, "Instructor not found");
  }

  const liveClassCourseId =
    courseOrCycleDbValue?.courseSubject?.courseId ||
    courseOrCycleDbValue?.cycleSubject?.cycle?.courseId;

  const getCourseInfoExtra = await prisma.course.findUnique({
    where: {
      id: liveClassCourseId,
    },
  });

  let getBunnyApiKey = null;

  if (getCourseInfoExtra?.libraryId) {
    getBunnyApiKey = await prisma.libApi.findFirst({
      where: {
        libraryId: getCourseInfoExtra?.libraryId,
      },
    });
  }

  const isInstructorAvailableThisCourse = await prisma.courseAdmin.findFirst({
    where: {
      courseId: liveClassCourseId,
      adminId: teacherInfo?.id,
      isDeleted: false,
    },
  });

  if (!isInstructorAvailableThisCourse) {
    throw new AppErrors(
      404,
      `দুঃখিত! ${teacherInfo.name} এই কোর্সের শিক্ষক হিসেবে নিবন্ধিত নন`,
    );
  }

  const hostId = teacherInfo?.id;
  const hostNameValue = teacherInfo?.name;

  const tmdata = JSON.stringify({
    name: title,
    description: description,
    hostId: hostId,
    hostName: hostNameValue,
    hostPhoto:
      teacherInfo?.photo || "https://i.postimg.cc/wBHhmmZs/images-(4).png",
    scheduledAt: startTime,
    duration: 60,
    maxParticipants: 10000,
    customHlsUrl: customHlsUrl,
    publicEmbed: publicEmbed || false,
    ingestType: "webrtc",
    features: {
      chat: true,
      recording: true,
    },
    ...(cdnUrl &&
      bunnyApiKey && {
        cdnConfig: {
          cdnUrl: cdnUrl,
          bunnyApiKey: bunnyApiKey,
        },
      }),
  });

  const streamClientId = getCourseInfoExtra?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = getCourseInfoExtra?.authKey || process.env.AUTH_KEY;

  if (!getCourseInfoExtra?.clientId || !getCourseInfoExtra?.authKey) {
    throw new AppErrors(
      StatusCodes.FAILED_DEPENDENCY,
      "দুঃখিত! আপনি লাইভ স্ট্রিমিং সার্ভিসটি সাবস্ক্রাইব করেন নি",
    );
  }

  const config = {
    method: "post",
    url: "https://media.aparsclassroom.com/api/rooms",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": streamClientId,
      "x-auth-key": streamAuthKey,
    },
    data: tmdata,
  };
  // Create Media AparsClass  room
  const tmRes = await axios(config);

  if (!tmRes?.data?.success) {
    throw new AppErrors(
      404,
      tmRes?.data?.msg || "Media AparsClass room creation failed",
    );
  }

  console.log(tmRes);

  // Extract stream URL if available
  const videoId = tmRes?.data?.data?.id;
  const status = tmRes?.data?.data?.status;
  const webrtc = tmRes?.data?.data?.playbackUrls?.webrtc;
  const hls = tmRes?.data?.data?.playbackUrls?.hls;
  const hlsDirect = tmRes?.data?.data?.playbackUrls?.hlsDirect;
  const rtmp = tmRes?.data?.data?.playbackUrls?.rtmp;
  const customHlsUrlRes = tmRes?.data?.data?.customHlsUrl;
  const publicEmbedRes =
    tmRes?.data?.data?.publicEmbed === true ? "public_video" : "secure_video";

  // transform updated fields
  liveClassData = {
    title,
    description,
    adminId: hostId,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime: convertToUTC(startTime),
    videoId,
    instructor: hostNameValue || "",
    thumbnail: LiveClassImage || null,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    status: status === "waiting" && "recorded",
    vimeo: classNumber,
    secondaryUrl,
    libraryId: getCourseInfoExtra?.libraryId || libraryId,
    webrtc,
    hls,
    hlsDirect,
    rtmp,
    cdnUrl,
    bunnyApiKey: getBunnyApiKey?.apiKey || bunnyApiKey,
    customHlsUrl: customHlsUrlRes,
    publicEmbed: publicEmbedRes,
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

  //Modify Response
  const response = pickCreateAndUpdateResponse(
    liveClassCreationResponse,
    sendResponseFields,
  );

  //log live class services
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

    const logTitle = `পাবলিক ক্লাস আপলোড করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourseInfoExtra?.productName} কোর্সে পাবলিক ক্লাস আপলোড করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on create new live class");
  }

  return response;
};

//Create live class v4
const createLiveClassVersion4IntoDb = async (
  LiveClassImage,
  payload,
  hostName,
) => {
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
    cdnUrl,
    bunnyApiKey,
    customHlsUrl,
    publicEmbed,
    ingestType,
    mediaServer: requestedMediaServer,
    quality = "medium",
    preset = "veryfast",
    abr = null,
    streamingEngine = "mediaserver",
    latencyMode = "hls",
  } = payload || {};
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
            cycle: {
              select: {
                courseId: true,
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

  const instructorId = instructor;
  const teacherInfo = await prisma.admin.findFirst({
    where: {
      id: instructorId,
      isDeleted: false,
    },
  });
  if (!teacherInfo) {
    throw new AppErrors(404, "Instructor not found");
  }

  const liveClassCourseId =
    courseOrCycleDbValue?.courseSubject?.courseId ||
    courseOrCycleDbValue?.cycleSubject?.cycle?.courseId;

  const getCourseInfoExtra = await prisma.course.findUnique({
    where: {
      id: liveClassCourseId,
    },
  });

  let getBunnyApiKey = null;

  if (getCourseInfoExtra?.libraryId) {
    getBunnyApiKey = await prisma.libApi.findFirst({
      where: {
        libraryId: getCourseInfoExtra?.libraryId,
      },
    });
  }

  const isInstructorAvailableThisCourse = await prisma.courseAdmin.findFirst({
    where: {
      courseId: liveClassCourseId,
      adminId: teacherInfo?.id,
      isDeleted: false,
    },
  });

  if (!isInstructorAvailableThisCourse) {
    throw new AppErrors(
      404,
      `দুঃখিত! ${teacherInfo.name} এই কোর্সের শিক্ষক হিসেবে নিবন্ধিত নন`,
    );
  }

  const hostId = teacherInfo?.id;
  const hostNameValue = teacherInfo?.name;

  const tmdata = JSON.stringify({
    name: title,
    description: description,
    hostId: hostId,
    hostName: hostNameValue,
    hostPhoto:
      teacherInfo?.photo || "https://i.postimg.cc/wBHhmmZs/images-(4).png",
    scheduledAt: startTime,
    duration: 60,
    maxParticipants: 10000,
    customHlsUrl: customHlsUrl || null,
    publicEmbed: publicEmbed || false,
    ingestType: ingestType || "webrtc",
    features: {
      chat: true,
      recording: true,
    },
    ...(cdnUrl &&
      bunnyApiKey && {
        cdnConfig: {
          cdnUrl: cdnUrl,
          bunnyApiKey: bunnyApiKey,
        },
      }),

    //new
    streamSettings: {
      quality,
      preset,
      abr,
    },
    streamingEngine,
    latencyMode,
  });

  const streamClientId = getCourseInfoExtra?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = getCourseInfoExtra?.authKey || process.env.AUTH_KEY;

  if (!getCourseInfoExtra?.clientId || !getCourseInfoExtra?.authKey) {
    throw new AppErrors(
      StatusCodes.FAILED_DEPENDENCY,
      "দুঃখিত! আপনি আমাদের লাইভ স্ট্রিমিং সার্ভিসটি সাবস্ক্রাইব করেন নি",
    );
  }

  //design switching of servers here
  const classDurationMs = 2 * 60 * 60 * 1000;
  const serverCapacity = {
    europe: 5,
    malaysia: 1,
  };

  const scheduledStartTime = new Date(convertToUTC(startTime) ?? NaN);
  if (Number.isNaN(scheduledStartTime.getTime())) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid class start time");
  }

  const scheduledEndTime = new Date(
    scheduledStartTime.getTime() + classDurationMs,
  );
  const overlapWindowStart = new Date(
    scheduledStartTime.getTime() - classDurationMs,
  );

  const getExistingLiveClasses = await prisma.liveClass.findMany({
    where: {
      isDeleted: false,
      status: { in: ["scheduled", "live"] },
      startTime: {
        gt: overlapWindowStart,
        lt: scheduledEndTime,
      },
    },
    select: {
      startTime: true,
      mediaServer: true,
    },
  });

  const getPeakConcurrentClasses = (serverName) => {
    const classesOnServer = getExistingLiveClasses
      .filter((liveClass) => {
        const existingServer =
          liveClass.mediaServer === "malaysia" ? "malaysia" : "europe";
        return existingServer === serverName;
      })
      .map((liveClass) => ({
        start: liveClass.startTime.getTime(),
        end: liveClass.startTime.getTime() + classDurationMs,
      }));

    const timesToCheck = [
      scheduledStartTime.getTime(),
      ...classesOnServer
        .map((liveClass) => liveClass.start)
        .filter(
          (classStart) =>
            classStart >= scheduledStartTime.getTime() &&
            classStart < scheduledEndTime.getTime(),
        ),
    ];

    return Math.max(
      ...timesToCheck.map(
        (time) =>
          1 +
          classesOnServer.filter(
            (liveClass) => liveClass.start <= time && liveClass.end > time,
          ).length,
      ),
    );
  };

  const requestedServer =
    requestedMediaServer === "malaysia" ? "malaysia" : "europe";
  const fallbackServer = requestedServer === "europe" ? "malaysia" : "europe";
  const europePeakConcurrentClasses = getPeakConcurrentClasses("europe");
  const malaysiaPeakConcurrentClasses = getPeakConcurrentClasses("malaysia");

  const isEuropeCrowded = europePeakConcurrentClasses > serverCapacity.europe;
  const isMalaysiaCrowded =
    malaysiaPeakConcurrentClasses > serverCapacity.malaysia;
  const isRequestedServerCrowded =
    requestedServer === "europe" ? isEuropeCrowded : isMalaysiaCrowded;
  const isFallbackServerCrowded =
    fallbackServer === "europe" ? isEuropeCrowded : isMalaysiaCrowded;

  const mediaServer = !isRequestedServerCrowded
    ? requestedServer
    : !isFallbackServerCrowded
      ? fallbackServer
      : "europe";

  const wasServerSwitched = mediaServer !== requestedServer;
  const isForcedEuropeOverflow = isEuropeCrowded && isMalaysiaCrowded;

  let newTmData = {};

  if (isForcedEuropeOverflow) {
    newTmData = JSON.stringify({
      name: title,
      description: description,
      hostId: hostId,
      hostName: hostNameValue,
      hostPhoto:
        teacherInfo?.photo || "https://i.postimg.cc/wBHhmmZs/images-(4).png",
      scheduledAt: startTime,
      duration: 60,
      maxParticipants: 10000,
      customHlsUrl: customHlsUrl || null,
      publicEmbed: publicEmbed || false,
      ingestType: ingestType || "webrtc",
      features: {
        chat: true,
        recording: true,
      },
      ...(cdnUrl &&
        bunnyApiKey && {
          cdnConfig: {
            cdnUrl: cdnUrl,
            bunnyApiKey: bunnyApiKey,
          },
        }),
      streamSettings: {
        quality,
        preset: "veryfast",
        abr: false,
      },
      streamingEngine,
      latencyMode: "hls",
    });
  }

  //end of switching

  const mediaServerDomain = mediaServers[mediaServer] ?? mediaServers?.europe;

  const config = {
    method: "post",
    url: `${mediaServerDomain}/api/rooms`,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": streamClientId,
      "x-auth-key": streamAuthKey,
    },
    data: isForcedEuropeOverflow ? newTmData : tmdata,
  };
  // Create Media AparsClass  room
  const tmRes = await axios(config);

  if (!tmRes?.data?.success) {
    throw new AppErrors(
      404,
      tmRes?.data?.msg || "Media AparsClass room creation failed",
    );
  }

  // Extract stream URL if available
  const videoId = tmRes?.data?.data?.id;
  const status = tmRes?.data?.data?.status;
  const webrtc = tmRes?.data?.data?.playbackUrls?.webrtc;
  const hls = tmRes?.data?.data?.playbackUrls?.hls;
  const hlsDirect = tmRes?.data?.data?.playbackUrls?.hlsDirect;
  const rtmp = tmRes?.data?.data?.playbackUrls?.rtmp;
  const customHlsUrlRes = tmRes?.data?.data?.customHlsUrl;
  const publicEmbedRes = tmRes?.data?.data?.publicEmbed;
  const ingestTypeRes = tmRes?.data?.data?.ingestType;
  const rtmp_url = tmRes?.data?.data?.rtmpIngest?.url;
  const rtmp_streamKey = tmRes?.data?.data?.rtmpIngest?.streamKey;
  // transform updated fields
  liveClassData = {
    title,
    description,
    adminId: hostId,
    courseSubjectChapterId,
    cycleSubjectChapterId,
    startTime: convertToUTC(startTime),
    videoId,
    instructor: hostNameValue || "",
    thumbnail: LiveClassImage || null,
    practiceSheet,
    solutionSheet,
    markedBook,
    slidesUrl,
    status: status === "waiting" ? "scheduled" : status,
    vimeo: classNumber,
    secondaryUrl,
    libraryId: getCourseInfoExtra?.libraryId || libraryId,
    webrtc,
    hls,
    hlsDirect,
    rtmp,
    cdnUrl,
    bunnyApiKey: getBunnyApiKey?.apiKey || bunnyApiKey,
    customHlsUrl: customHlsUrlRes,
    publicEmbed: publicEmbedRes,
    ingestType: ingestTypeRes,
    rtmp_url: rtmp_url,
    rtmp_streamKey: rtmp_streamKey,
    isPredefined: customHlsUrl ? true : false,
    teacherButton: ingestTypeRes === "rtmp" ? false : true,
    mediaServer,
    isFreeClass: publicEmbed,
    freeClassUrl: publicEmbed
      ? `${mediaServerDomain}/embed/open/${videoId}`
      : "",
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
  //       title: `তোমার ${title} লাইভ ক্লাসটি শুরু হবে ${formatTime(startTime)}`,
  //       body: `লাইভ ক্লাসে তোমার সাথে থাকবেন ${hostNameValue}`,
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

  //log live class services
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

    const logTitle = `নতুন লাইভ ক্লাস শিডিউল করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourseInfoExtra?.productName} কোর্সে ${teacherInfo?.name} শিক্ষকের ক্লাস শিডিউল করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on create new live class");
  }

  return response;
};

const V5_CLASS_DURATION_MS = 2 * 60 * 60 * 1000;
const V5_SCHEDULING_LOCK_KEY = "live-class:v5:scheduling-lock";
const V5_NORMAL_SETTINGS = {
  quality: "medium",
  preset: "veryfast",
  abr: true,
  latencyMode: "hls",
};
const V5_SAFE_SETTINGS = {
  quality: "medium",
  preset: "veryfast",
  abr: true,
  latencyMode: "hls",
};

const acquireV5SchedulingLock = async () => {
  const token = randomUUID();
  const acquired = await redisConnection.set(
    V5_SCHEDULING_LOCK_KEY,
    token,
    "PX",
    60000,
    "NX",
  );

  if (acquired !== "OK") {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "Another live class is currently being scheduled. Please try again.",
    );
  }

  return token;
};

const releaseV5SchedulingLock = async (token) => {
  await redisConnection.eval(
    `if redis.call("get", KEYS[1]) == ARGV[1] then
       return redis.call("del", KEYS[1])
     end
     return 0`,
    1,
    V5_SCHEDULING_LOCK_KEY,
    token,
  );
};

const getV5MediaHeaders = (course) => ({
  "Content-Type": "application/json",
  "x-client-id": course?.clientId,
  "x-auth-key": course?.authKey,
});

const getV5RoomResult = (response) => {
  const room = response?.data?.data || {};

  return {
    videoId: room.id,
    status: room.status === "waiting" ? "scheduled" : room.status,
    webrtc: room.playbackUrls?.webrtc,
    hls: room.playbackUrls?.hls,
    hlsDirect: room.playbackUrls?.hlsDirect,
    rtmp: room.playbackUrls?.rtmp,
    customHlsUrl: room.customHlsUrl,
    publicEmbed: room.publicEmbed,
    ingestType: room.ingestType,
    rtmp_url: room.rtmpIngest?.url,
    rtmp_streamKey: room.rtmpIngest?.streamKey,
  };
};

const createV5MediaRoom = async ({ server, course, roomData }) => {
  const response = await axios({
    method: "post",
    url: `${mediaServers[server]}/api/rooms`,
    headers: getV5MediaHeaders(course),
    data: roomData,
    timeout: 15000,
  });

  if (!response?.data?.success) {
    throw new AppErrors(
      StatusCodes.BAD_GATEWAY,
      response?.data?.msg || "Media room creation failed",
    );
  }

  return getV5RoomResult(response);
};

const endV5MediaRoom = async ({ server, roomId, course }) => {
  if (!roomId) return;

  try {
    await axios({
      method: "post",
      url: `${mediaServers[server]}/api/rooms/${roomId}/end`,
      headers: getV5MediaHeaders(course),
      timeout: 10000,
    });
  } catch (error) {
    console.error("V5 orphan room cleanup failed", {
      server,
      roomId,
      message: error?.message,
    });
  }
};

const updateV5MediaRoomSettings = async ({
  server,
  roomId,
  course,
  settings,
}) => {
  const response = await axios({
    method: "patch",
    url: `${mediaServers[server]}/api/rooms/${roomId}/stream-settings`,
    headers: getV5MediaHeaders(course),
    data: settings,
    timeout: 10000,
  });

  if (response?.data?.success === false) {
    throw new AppErrors(
      StatusCodes.BAD_GATEWAY,
      response?.data?.msg || "Media stream settings update failed",
    );
  }

  return response;
};

const mergeV5SchedulingInfo = (extraInfo, schedulingInfo) => ({
  ...(extraInfo && typeof extraInfo === "object" && !Array.isArray(extraInfo)
    ? extraInfo
    : {}),
  v5Scheduling: schedulingInfo,
});

const buildV5RoomData = ({
  title,
  description,
  hostId,
  hostName,
  hostPhoto,
  scheduledAt,
  customHlsUrl,
  publicEmbed,
  ingestType,
  cdnUrl,
  bunnyApiKey,
  settings,
  streamingEngine,
}) => ({
  name: title,
  description,
  hostId,
  hostName,
  hostPhoto: hostPhoto || "https://i.postimg.cc/wBHhmmZs/images-(4).png",
  scheduledAt,
  duration: 60,
  maxParticipants: 10000,
  customHlsUrl: customHlsUrl || null,
  publicEmbed: publicEmbed || false,
  ingestType: ingestType || "webrtc",
  features: {
    chat: true,
    recording: true,
  },
  ...(cdnUrl &&
    bunnyApiKey && {
      cdnConfig: {
        cdnUrl,
        bunnyApiKey,
      },
    }),
  streamSettings: {
    quality: settings.quality,
    preset: settings.preset,
    abr: settings.abr,
  },
  streamingEngine: streamingEngine || "mediaserver",
  latencyMode: settings.latencyMode,
});

// Create live class v5. V4 intentionally remains unchanged as a rollback path.
const createLiveClassVersion5IntoDb = async (
  LiveClassImage,
  payload,
  hostName,
) => {
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
    cdnUrl,
    bunnyApiKey,
    customHlsUrl,
    publicEmbed,
    ingestType,
    mediaServer: requestedMediaServer,
    quality = V5_NORMAL_SETTINGS.quality,
    preset = V5_NORMAL_SETTINGS.preset,
    abr = V5_NORMAL_SETTINGS.abr,
    streamingEngine = "mediaserver",
    latencyMode = V5_NORMAL_SETTINGS.latencyMode,
  } = payload || {};
  const scheduledStartTime = new Date(convertToUTC(startTime) ?? NaN);
  if (Number.isNaN(scheduledStartTime.getTime())) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid class start time");
  }

  let courseOrCycleDbValue;
  if (courseSubjectChapterId) {
    courseOrCycleDbValue = await prisma.courseSubjectChapter.findFirst({
      where: { id: courseSubjectChapterId },
      select: {
        id: true,
        courseSubject: {
          select: {
            courseId: true,
            subject: { select: { title: true } },
          },
        },
      },
    });
  } else if (cycleSubjectChapterId) {
    courseOrCycleDbValue = await prisma.cycleSubjectChapter.findFirst({
      where: { id: cycleSubjectChapterId },
      select: {
        id: true,
        cycleSubject: {
          select: {
            cycleId: true,
            cycle: { select: { courseId: true } },
            subject: { select: { title: true } },
          },
        },
      },
    });
  } else {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Subject Chapter Id is required",
    );
  }

  if (!courseOrCycleDbValue) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Subject not found");
  }

  const teacherInfo = await prisma.admin.findFirst({
    where: { id: instructor, isDeleted: false },
  });
  if (!teacherInfo) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Instructor not found");
  }

  const liveClassCourseId =
    courseOrCycleDbValue?.courseSubject?.courseId ||
    courseOrCycleDbValue?.cycleSubject?.cycle?.courseId;
  const liveClassCycleId = courseOrCycleDbValue?.cycleSubject?.cycleId || null;

  const getCourseInfoExtra = await prisma.course.findUnique({
    where: { id: liveClassCourseId },
  });

  if (!getCourseInfoExtra?.clientId || !getCourseInfoExtra?.authKey) {
    throw new AppErrors(
      StatusCodes.FAILED_DEPENDENCY,
      "দুঃখিত! আপনি আমাদের লাইভ স্ট্রিমিং সার্ভিসটি সাবস্ক্রাইব করেন নি",
    );
  }

  const isInstructorAvailableThisCourse = await prisma.courseAdmin.findFirst({
    where: {
      courseId: liveClassCourseId,
      adminId: teacherInfo.id,
      isDeleted: false,
    },
  });
  if (!isInstructorAvailableThisCourse) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      `দুঃখিত! ${teacherInfo.name} এই কোর্সের শিক্ষক হিসেবে নিবন্ধিত নন`,
    );
  }

  let getBunnyApiKey = null;
  if (getCourseInfoExtra.libraryId) {
    getBunnyApiKey = await prisma.libApi.findFirst({
      where: { libraryId: getCourseInfoExtra.libraryId },
    });
  }

  const effectiveBunnyApiKey = getBunnyApiKey?.apiKey || bunnyApiKey;
  const normalSettings = {
    quality: quality || V5_NORMAL_SETTINGS.quality,
    preset: V5_NORMAL_SETTINGS.preset || preset,
    // abr: abr ?? V5_NORMAL_SETTINGS.abr,
    abr: V5_NORMAL_SETTINGS.abr,
    latencyMode: latencyMode || V5_NORMAL_SETTINGS.latencyMode,
  };

  const lockToken = await acquireV5SchedulingLock();
  let liveClassCreationResponse;

  try {
    const scheduledEndTime = new Date(
      scheduledStartTime.getTime() + V5_CLASS_DURATION_MS,
    );
    const capacityWindowStart = new Date(
      scheduledStartTime.getTime() - 2 * V5_CLASS_DURATION_MS,
    );
    const capacityWindowEnd = new Date(
      scheduledEndTime.getTime() + V5_CLASS_DURATION_MS,
    );

    const capacityClasses = await prisma.liveClass.findMany({
      where: {
        isDeleted: false,
        status: { in: ["scheduled", "live"] },
        startTime: {
          gt: capacityWindowStart,
          lt: capacityWindowEnd,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        adminId: true,
        startTime: true,
        status: true,
        mediaServer: true,
        videoId: true,
        instructor: true,
        cdnUrl: true,
        bunnyApiKey: true,
        customHlsUrl: true,
        publicEmbed: true,
        ingestType: true,
        isFreeClass: true,
        extraInfo: true,
        admin: {
          select: { id: true, name: true, photo: true },
        },
        courseSubjectChapter: {
          select: {
            courseSubject: {
              select: {
                courseId: true,
                course: {
                  select: {
                    id: true,
                    clientId: true,
                    authKey: true,
                  },
                },
              },
            },
          },
        },
        cycleSubjectChapter: {
          select: {
            cycleSubject: {
              select: {
                cycleId: true,
                cycle: {
                  select: {
                    course: {
                      select: {
                        id: true,
                        clientId: true,
                        authKey: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const overlapsNewClass = (liveClass) => {
      const existingStart = liveClass.startTime.getTime();
      const existingEnd = existingStart + V5_CLASS_DURATION_MS;
      return (
        existingStart < scheduledEndTime.getTime() &&
        existingEnd > scheduledStartTime.getTime()
      );
    };

    const overlappingClasses = capacityClasses.filter(overlapsNewClass);
    const courseIds = [
      ...new Set(
        overlappingClasses
          .map(
            (liveClass) =>
              liveClass.courseSubjectChapter?.courseSubject?.courseId,
          )
          .filter(Boolean),
      ),
    ];
    const cycleIds = [
      ...new Set(
        overlappingClasses
          .map(
            (liveClass) => liveClass.cycleSubjectChapter?.cycleSubject?.cycleId,
          )
          .filter(Boolean),
      ),
    ];
    if (liveClassCycleId) cycleIds.push(liveClassCycleId);
    else if (liveClassCourseId) courseIds.push(liveClassCourseId);

    const [courseEnrollmentRows, cycleEnrollmentRows] = await Promise.all([
      courseIds.length
        ? prisma.courseStudent.groupBy({
            by: ["courseId"],
            where: {
              courseId: { in: [...new Set(courseIds)] },
              status: "ACTIVE",
            },
            _count: { _all: true },
          })
        : [],
      cycleIds.length
        ? prisma.cycleStudent.groupBy({
            by: ["cycleId"],
            where: {
              cycleId: { in: [...new Set(cycleIds)] },
              status: "ACTIVE",
            },
            _count: { _all: true },
          })
        : [],
    ]);

    const courseEnrollmentMap = new Map(
      courseEnrollmentRows.map((row) => [row.courseId, row._count._all]),
    );
    const cycleEnrollmentMap = new Map(
      cycleEnrollmentRows.map((row) => [row.cycleId, row._count._all]),
    );
    const newEnrollmentCount = liveClassCycleId
      ? cycleEnrollmentMap.get(liveClassCycleId) || 0
      : courseEnrollmentMap.get(liveClassCourseId) || 0;

    const getEnrollmentCount = (liveClass) => {
      const cycleId =
        liveClass.cycleSubjectChapter?.cycleSubject?.cycleId || null;
      if (cycleId) return cycleEnrollmentMap.get(cycleId) || 0;

      const courseId =
        liveClass.courseSubjectChapter?.courseSubject?.courseId || null;
      return courseEnrollmentMap.get(courseId) || 0;
    };

    const normalizeServer = (server) =>
      server === "malaysia" ? "malaysia" : "europe";
    const getPeakWithCandidate = ({
      server,
      candidateStart,
      candidateEnd,
      excludeClassId,
    }) => {
      const intervals = capacityClasses
        .filter(
          (liveClass) =>
            liveClass.id !== excludeClassId &&
            normalizeServer(liveClass.mediaServer) === server,
        )
        .map((liveClass) => ({
          start: liveClass.startTime.getTime(),
          end: liveClass.startTime.getTime() + V5_CLASS_DURATION_MS,
        }))
        .filter(
          (interval) =>
            interval.start < candidateEnd && interval.end > candidateStart,
        );

      const timesToCheck = [
        candidateStart,
        ...intervals
          .map((interval) => interval.start)
          .filter(
            (intervalStart) =>
              intervalStart >= candidateStart && intervalStart < candidateEnd,
          ),
      ];

      return Math.max(
        ...timesToCheck.map(
          (time) =>
            1 +
            intervals.filter(
              (interval) => interval.start <= time && interval.end > time,
            ).length,
        ),
      );
    };

    const europePeakWithNew = getPeakWithCandidate({
      server: "europe",
      candidateStart: scheduledStartTime.getTime(),
      candidateEnd: scheduledEndTime.getTime(),
    });
    const malaysiaPeakWithNew = getPeakWithCandidate({
      server: "malaysia",
      candidateStart: scheduledStartTime.getTime(),
      candidateEnd: scheduledEndTime.getTime(),
    });

    const europeCapacity = 6;
    const malaysiaCapacity = 2;
    const requestedServer =
      requestedMediaServer === "malaysia" ? "malaysia" : "europe";
    let mediaServer = "europe";
    let newClassSettings = normalSettings;
    let moveCandidate = null;
    let downgradeCandidate = null;

    if (
      requestedServer === "malaysia" &&
      malaysiaPeakWithNew <= malaysiaCapacity
    ) {
      mediaServer = "malaysia";
    } else if (europePeakWithNew <= europeCapacity) {
      mediaServer = "europe";
    } else {
      const switchCandidates = overlappingClasses
        .filter(
          (liveClass) =>
            liveClass.status === "scheduled" &&
            Boolean(liveClass.videoId) &&
            normalizeServer(liveClass.mediaServer) === "europe" &&
            getEnrollmentCount(liveClass) < newEnrollmentCount,
        )
        .sort(
          (left, right) =>
            getEnrollmentCount(left) - getEnrollmentCount(right) ||
            left.startTime.getTime() - right.startTime.getTime() ||
            left.id.localeCompare(right.id),
        );

      moveCandidate =
        switchCandidates.find((candidate) => {
          const candidateStart = candidate.startTime.getTime();
          const candidateEnd = candidateStart + V5_CLASS_DURATION_MS;
          const europePeakWithoutCandidate = getPeakWithCandidate({
            server: "europe",
            candidateStart: scheduledStartTime.getTime(),
            candidateEnd: scheduledEndTime.getTime(),
            excludeClassId: candidate.id,
          });
          const malaysiaPeakWithCandidate = getPeakWithCandidate({
            server: "malaysia",
            candidateStart,
            candidateEnd,
            excludeClassId: candidate.id,
          });

          return (
            europePeakWithoutCandidate <= europeCapacity &&
            malaysiaPeakWithCandidate <= malaysiaCapacity
          );
        }) || null;

      if (moveCandidate) {
        mediaServer = "europe";
      } else if (malaysiaPeakWithNew <= malaysiaCapacity) {
        mediaServer = "malaysia";
      } else {
        mediaServer = "europe";
        downgradeCandidate = switchCandidates.find((candidate) => {
          const europePeakWithoutCandidate = getPeakWithCandidate({
            server: "europe",
            candidateStart: scheduledStartTime.getTime(),
            candidateEnd: scheduledEndTime.getTime(),
            excludeClassId: candidate.id,
          });
          return europePeakWithoutCandidate <= europeCapacity;
        });

        if (!downgradeCandidate) {
          newClassSettings = V5_SAFE_SETTINGS;
        }
      }
    }

    const getCandidateCourse = (candidate) =>
      candidate.courseSubjectChapter?.courseSubject?.course ||
      candidate.cycleSubjectChapter?.cycleSubject?.cycle?.course;
    // const getStoredCandidateSettings = (candidate) =>
    //   candidate.extraInfo?.v5Scheduling?.settings || V5_NORMAL_SETTINGS;
    const getStoredCandidateSettings = (candidate) =>
      V5_NORMAL_SETTINGS || candidate.extraInfo?.v5Scheduling?.settings;
    const buildCandidateRoomData = (candidate, settings) => ({
      title: candidate.title,
      description: candidate.description,
      hostId: candidate.adminId,
      hostName: candidate.instructor || candidate.admin?.name,
      hostPhoto: candidate.admin?.photo,
      scheduledAt: candidate.startTime.toISOString(),
      customHlsUrl: candidate.customHlsUrl,
      publicEmbed: candidate.publicEmbed ?? candidate.isFreeClass,
      ingestType: candidate.ingestType,
      cdnUrl: candidate.cdnUrl,
      bunnyApiKey: candidate.bunnyApiKey,
      settings,
      streamingEngine:
        candidate.extraInfo?.v5Scheduling?.streamingEngine || "mediaserver",
    });

    let replacementRoom = null;
    let newRoom = null;
    let downgradeWasApplied = false;
    const downgradePreviousSettings = downgradeCandidate
      ? getStoredCandidateSettings(downgradeCandidate)
      : null;

    try {
      if (moveCandidate) {
        const candidateCourse = getCandidateCourse(moveCandidate);
        replacementRoom = await createV5MediaRoom({
          server: "malaysia",
          course: candidateCourse,
          roomData: buildV5RoomData(
            buildCandidateRoomData(
              moveCandidate,
              getStoredCandidateSettings(moveCandidate),
            ),
          ),
        });
      }

      const newRoomData = buildV5RoomData({
        title,
        description,
        hostId: teacherInfo.id,
        hostName: teacherInfo.name,
        hostPhoto: teacherInfo.photo,
        scheduledAt: startTime,
        customHlsUrl,
        publicEmbed,
        ingestType,
        cdnUrl,
        bunnyApiKey: effectiveBunnyApiKey,
        settings: newClassSettings,
        streamingEngine,
      });
      newRoom = await createV5MediaRoom({
        server: mediaServer,
        course: getCourseInfoExtra,
        roomData: newRoomData,
      });

      if (downgradeCandidate) {
        await updateV5MediaRoomSettings({
          server: "europe",
          roomId: downgradeCandidate.videoId,
          course: getCandidateCourse(downgradeCandidate),
          settings: V5_SAFE_SETTINGS,
        });
        downgradeWasApplied = true;
      }

      const liveClassData = {
        title,
        description,
        adminId: teacherInfo.id,
        courseSubjectChapterId,
        cycleSubjectChapterId,
        startTime: convertToUTC(startTime),
        videoId: newRoom.videoId,
        instructor: teacherInfo.name || "",
        thumbnail: LiveClassImage || null,
        practiceSheet,
        solutionSheet,
        markedBook,
        slidesUrl,
        status: newRoom.status || "scheduled",
        vimeo: classNumber,
        secondaryUrl,
        libraryId: getCourseInfoExtra.libraryId || libraryId,
        webrtc: newRoom.webrtc,
        hls: newRoom.hls,
        hlsDirect: newRoom.hlsDirect,
        rtmp: newRoom.rtmp,
        cdnUrl,
        bunnyApiKey: effectiveBunnyApiKey,
        customHlsUrl: newRoom.customHlsUrl ?? customHlsUrl,
        publicEmbed: newRoom.publicEmbed ?? publicEmbed ?? false,
        ingestType: newRoom.ingestType ?? ingestType ?? "webrtc",
        rtmp_url: newRoom.rtmp_url,
        rtmp_streamKey: newRoom.rtmp_streamKey,
        isPredefined: customHlsUrl ? true : false,
        teacherButton:
          (newRoom.ingestType ?? ingestType) === "rtmp" ? false : true,
        mediaServer,
        isFreeClass: publicEmbed,
        freeClassUrl: publicEmbed
          ? `${mediaServers[mediaServer]}/embed/open/${newRoom.videoId}`
          : "",
        extraInfo: mergeV5SchedulingInfo(null, {
          enrollmentCount: newEnrollmentCount,
          settings: newClassSettings,
          streamingEngine,
          requestedServer,
          selectedServer: mediaServer,
          europeCapacity,
          malaysiaCapacity,
          europePeakWithNew,
          malaysiaPeakWithNew,
          isEuropeCrowded: europePeakWithNew > europeCapacity,
          isMalaysiaCrowded: malaysiaPeakWithNew > malaysiaCapacity,
          action: moveCandidate
            ? "moved-lower-enrollment-scheduled-class"
            : downgradeCandidate
              ? "reduced-lower-enrollment-scheduled-class-settings"
              : newClassSettings === V5_SAFE_SETTINGS
                ? "created-new-class-with-safe-settings"
                : mediaServer !== requestedServer
                  ? "switched-new-class-server"
                  : "used-requested-server",
          affectedLiveClassId:
            moveCandidate?.id || downgradeCandidate?.id || null,
          scheduledAt: new Date().toISOString(),
        }),
      };

      liveClassCreationResponse = await prisma.$transaction(async (tx) => {
        if (moveCandidate) {
          const currentCandidate = await tx.liveClass.findFirst({
            where: {
              id: moveCandidate.id,
              status: "scheduled",
              videoId: moveCandidate.videoId,
              isDeleted: false,
            },
            select: { id: true },
          });
          if (!currentCandidate) {
            throw new AppErrors(
              StatusCodes.CONFLICT,
              "The class selected for switching is no longer scheduled",
            );
          }

          await tx.liveClass.update({
            where: { id: moveCandidate.id },
            data: {
              videoId: replacementRoom.videoId,
              mediaServer: "malaysia",
              webrtc: replacementRoom.webrtc,
              hls: replacementRoom.hls,
              hlsDirect: replacementRoom.hlsDirect,
              rtmp: replacementRoom.rtmp,
              customHlsUrl:
                replacementRoom.customHlsUrl ?? moveCandidate.customHlsUrl,
              publicEmbed:
                replacementRoom.publicEmbed ?? moveCandidate.publicEmbed,
              ingestType:
                replacementRoom.ingestType ?? moveCandidate.ingestType,
              rtmp_url: replacementRoom.rtmp_url,
              rtmp_streamKey: replacementRoom.rtmp_streamKey,
              freeClassUrl:
                (moveCandidate.publicEmbed ?? moveCandidate.isFreeClass)
                  ? `${mediaServers.malaysia}/embed/open/${replacementRoom.videoId}`
                  : "",
              extraInfo: mergeV5SchedulingInfo(moveCandidate.extraInfo, {
                enrollmentCount: getEnrollmentCount(moveCandidate),
                settings: getStoredCandidateSettings(moveCandidate),
                streamingEngine:
                  moveCandidate.extraInfo?.v5Scheduling?.streamingEngine ||
                  "mediaserver",
                switchedFromRoomId: moveCandidate.videoId,
                scheduledAt: new Date().toISOString(),
              }),
            },
          });
        }

        if (downgradeCandidate) {
          const currentCandidate = await tx.liveClass.findFirst({
            where: {
              id: downgradeCandidate.id,
              status: "scheduled",
              videoId: downgradeCandidate.videoId,
              isDeleted: false,
            },
            select: { id: true },
          });
          if (!currentCandidate) {
            throw new AppErrors(
              StatusCodes.CONFLICT,
              "The class selected for reduced settings is no longer scheduled",
            );
          }

          await tx.liveClass.update({
            where: { id: downgradeCandidate.id },
            data: {
              extraInfo: mergeV5SchedulingInfo(downgradeCandidate.extraInfo, {
                enrollmentCount: getEnrollmentCount(downgradeCandidate),
                settings: V5_SAFE_SETTINGS,
                streamingEngine:
                  downgradeCandidate.extraInfo?.v5Scheduling?.streamingEngine ||
                  "mediaserver",
                scheduledAt: new Date().toISOString(),
              }),
            },
          });
        }

        return tx.liveClass.create({
          data: transformUpdatedFields(liveClassData, []),
        });
      });

      await invalidateLiveClassCache(liveClassCreationResponse.id);
    } catch (error) {
      if (downgradeWasApplied && downgradeCandidate) {
        try {
          await updateV5MediaRoomSettings({
            server: "europe",
            roomId: downgradeCandidate.videoId,
            course: getCandidateCourse(downgradeCandidate),
            settings: downgradePreviousSettings,
          });
        } catch (rollbackError) {
          console.error("V5 stream settings rollback failed", {
            roomId: downgradeCandidate.videoId,
            message: rollbackError?.message,
          });
        }
      }

      if (replacementRoom) {
        await endV5MediaRoom({
          server: "malaysia",
          roomId: replacementRoom.videoId,
          course: getCandidateCourse(moveCandidate),
        });
      }
      if (newRoom) {
        await endV5MediaRoom({
          server: mediaServer,
          roomId: newRoom.videoId,
          course: getCourseInfoExtra,
        });
      }
      throw error;
    }

    if (moveCandidate) {
      await endV5MediaRoom({
        server: "europe",
        roomId: moveCandidate.videoId,
        course: getCandidateCourse(moveCandidate),
      });
    }
  } finally {
    try {
      await releaseV5SchedulingLock(lockToken);
    } catch (error) {
      console.error("V5 scheduling lock release failed", error?.message);
    }
  }

  if (liveClassCreationResponse.courseSubjectChapterId) {
    const course = await findCourseByLiveClass(liveClassCreationResponse.id);
    await logLookUpTable(liveClassCreationResponse.id, course?.id);
  } else if (liveClassCreationResponse.cycleSubjectChapterId) {
    const cycle = await findCycleByLiveClass(liveClassCreationResponse.id);
    await logCycleLookUpTable(liveClassCreationResponse.id, cycle?.id);
    await logLookUpTable(liveClassCreationResponse.id, cycle?.course?.id);
  }

  try {
    let creatorName = "";
    if (superAdminId) {
      const creator = await prisma.superAdmin.findFirst({
        where: { id: superAdminId },
      });
      creatorName = creator?.email;
    } else if (adminId) {
      const creator = await prisma.admin.findFirst({
        where: { id: adminId },
      });
      creatorName = creator?.name;
    }

    await activity.logActivity(
      "নতুন লাইভ ক্লাস শিডিউল করা হয়েছে",
      `${creatorName} ${getCourseInfoExtra?.productName} কোর্সে ${teacherInfo?.name} শিক্ষকের ক্লাস শিডিউল করেছেন`,
      Enums.logType.course,
    );
  } catch (error) {
    console.log(error, "Error logging activity on create new V5 live class");
  }

  return {
    ...pickCreateAndUpdateResponse(
      liveClassCreationResponse,
      sendResponseFields,
    ),
    scheduling: liveClassCreationResponse.extraInfo?.v5Scheduling,
  };
};

//join class with cashe
const joinLiveClassfromDb = async (liveClassId, user) => {
  const userPromise = getUserByRole(user);
  const liveClassInfo = await getLiveClassJoinMeta(liveClassId);

  if (!liveClassInfo) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,

      "Live class data Not found",
    );
  }
  const [streamConfig, userInfo] = await Promise.all([
    getStreamConfig(liveClassInfo),

    userPromise,
  ]);

  if (!userInfo) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "User not found");
  }

  const streamClientId = streamConfig?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = streamConfig?.authKey || process.env.AUTH_KEY;
  const videoId = liveClassInfo?.videoId;
  const joinReqUserId = userInfo?.id;
  const liveClassHostSetId = liveClassInfo?.adminId;
  const isAdminAndHostAreSame = joinReqUserId === liveClassHostSetId;
  const userPhoto = userInfo?.profilePhoto || userInfo?.photo;
  const studentRestriction = userInfo?.studentRestrictions || [];
  const hasRestriction = studentRestriction.length > 0;

  const teacherOrCoTeacherIdentifier =
    userInfo.role === Enums.roles.ADMIN && isAdminAndHostAreSame
      ? liveClassInfo?.ingestType === "rtmp"
        ? "co-teacher"
        : "host"
      : "co-teacher";

  const tmdata = {
    userId: userInfo?.id,

    userName:
      userInfo?.name || userInfo?.email || userInfo?.phone || userInfo?.role,

    role:
      userInfo.role === Enums.roles.STUDENT
        ? "student"
        : teacherOrCoTeacherIdentifier,

    photo: userPhoto,
    banned: hasRestriction,
  };

  const mediaServerDomain =
    mediaServers[liveClassInfo.mediaServer] ?? mediaServers.europe;

  const joinRes = await axios.post(
    `${mediaServerDomain}/api/rooms/${videoId}/join`,
    tmdata,
    {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": streamClientId,
        "x-auth-key": streamAuthKey,
      },

      timeout: 5000,
    },
  );

  const embedUrl = joinRes?.data?.data?.embed_url;

  return {
    isLive: embedUrl,
    isLiveUrl: embedUrl,
    secondaryUrl: liveClassInfo.secondaryUrl,
    roomInfo: joinRes?.data?.data?.participant,
  };
};

//Live class Status update
const updateLiveClassStatusIntoDb = async (payload) => {
  const event = payload;

  if (!event) {
    throw new AppErrors(402, "Invalid Media AparsClass  payload");
  }

  switch (event?.event_name) {
    case "room.created":
      return await handleRoomCreated(event);
    case "room.live":
      return await handleLiveStarted(event);
    case "room.closed":
      return await handleRoomEnded(event);
    case "recording.available":
      return await handleRecordingReady(event);
    case "recording.failed":
      return await handleRecordingFailed(event);
    case "user.banned":
      return await handleBannedStudent(event);
    default:
      console.log("Unhandled event Name:", event.event_name);
      return {
        success: false,
      };
  }

  async function handleRoomCreated(event) {
    const { room_id: videoId, session_id, time } = event;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const isStatusWaiting = event?.data?.status === "waiting";

    let updatedClass;
    if (isStatusWaiting) {
      updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "scheduled",
          stream: session_id,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);
      return updatedClass;
    }
    return {};
  }

  async function handleLiveStarted(event) {
    const { room_id: videoId, session_id, time } = event;
    const start_time = new Date(Number(time) / 1000);

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    const isLive = event?.data?.status === "live";

    let updatedClass;
    if (isLive) {
      updatedClass = await prisma.liveClass.update({
        where: { id: liveClassData?.id },
        data: {
          status: "live",
          stream: session_id,
          roomClosedAt: null,
          startTime: start_time
            ? convertToUTC(start_time)
            : convertToUTC(new Date()),
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);
    }

    //send notification
    try {
      const courseSubjectChapterId =
        liveClassData?.courseSubjectChapterId || null;
      const cycleSubjectChapterId =
        liveClassData?.cycleSubjectChapterId || null;

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
                    courseId: true,
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
      } else {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "Subject Chapter Id is required",
        );
      }

      const courseOrCycle = getCourseOrCycleId(courseOrCycleDbValue);
      const deepLinkUrl = await getCourseOrCycleDomainUrl(courseOrCycleDbValue);

      await sendNotification({
        type: `live_class_started_${liveClassData?.title}_${Date.now()}_${liveClassData?.id}`,
        ...courseOrCycle,
        title: liveClassData?.title || "তোমার লাইভ ক্লাস শুরু হয়েছে",
        body: liveClassData?.description || `এখনি জয়েন করো তোমার লাইভ ক্লাসে`,
        deepLink: deepLinkUrl?.url || "",
        image: liveClassData?.thumbnail,
        eventKey: `${liveClassData?.id}_${Date.now()}`,
      });
    } catch (err) {
      console.error("Notification preparation failed:", err);
    }

    return {};
  }

  async function handleRoomEnded(event) {
    const { room_id: videoId, session_id, time } = event;

    try {
      const end_time = new Date(Number(time) / 1000);
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
          stream: session_id,
          updatedAt: new Date(),
        },
      });
      await invalidateLiveClassCache(liveClassData.id);
      return updatedClass;
    } catch (error) {
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
    const { mp4_url, duration, part_name } = event?.data;

    const key = `${videoId}|${session_id}|${part_name || ""}|${mp4_url}`;

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

    //lock generate
    let lock;
    try {
      lock = await prisma.recordingIngest.create({
        data: {
          videoId,
          sessionId: session_id,
          mp4Url: mp4_url,
          partName: part_name || null,
          status: "processing",
        },
      });
    } catch (e) {
      if (e?.code === "P2002") {
        console.log("[DUPLICATE SKIPPED]", key);
        return { skipped: true, reason: "Duplicate recording event" };
      }
      throw e;
    }

    //new thing after seperate video libraray
    let getCourse = null;

    if (liveClassDatas?.courseSubjectChapterId) {
      getCourse = await findCourseByCourseSubjectChapter(
        liveClassDatas?.courseSubjectChapterId,
      );
    } else if (liveClassDatas?.cycleSubjectChapterId) {
      getCourse = await findCourseByCycleSubjectChapter(
        liveClassDatas?.cycleSubjectChapterId,
      );
    }

    console.log(getCourse, "the course info before creating class content");

    const getCourseInfo = await prisma.course.findFirst({
      where: {
        id: getCourse?.id,
      },
    });

    // upload to Bunny (outside transaction)
    let bunnyVideoId = null;
    let getBunnyApiKey = null;
    let bunnyUploadInfo = null;

    if (!getCourseInfo?.libraryId && liveClassDatas?.libraryId) {
      getBunnyApiKey = await prisma.libApi.findFirst({
        where: { libraryId: liveClassDatas?.libraryId },
      });
    }

    if (getCourseInfo?.libraryId) {
      getBunnyApiKey = await prisma.libApi.findFirst({
        where: {
          libraryId: getCourseInfo?.libraryId,
        },
      });
    }

    const bunnyLibraryId =
      getCourseInfo?.libraryId ||
      liveClassDatas?.libraryId ||
      process.env.BUNNY_LIBRATY_ID;

    const bunnyApiKey = getBunnyApiKey
      ? getBunnyApiKey?.apiKey
      : process.env.BUNNY_AUTH_KEY;

    const bunnyZoneSecurityKey = getCourseInfo?.zoneSecurityKey;

    const thumbnailTime = 5000;

    try {
      bunnyUploadInfo = await axios.post(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/fetch?thumbnailTime=${thumbnailTime}`,
        {
          url: mp4_url,
          title: `${liveClassDatas?.title}${part_name === "Part 1" ? "" : " -" + part_name}`,
          thumbnailTime: 5000,
        },
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: bunnyApiKey,
          },
        },
      );
      bunnyVideoId = bunnyUploadInfo?.data?.id ?? null;
      await prisma.recordingIngest.update({
        where: { id: lock.id },
        data: { status: "done", bunnyVideoId },
      });
    } catch (err) {
      await prisma.recordingIngest.update({
        where: { id: lock.id },
        data: { status: "failed" },
      });
      console.log("[BUNNY UPLOAD FAILED]", key, err?.message);
      throw err;
    }

    const videoGuid =
      bunnyUploadInfo?.data?.guid || bunnyUploadInfo?.data?.VideoGuid;

    const thumbnailPath = teacherThumbnail || null;

    const baseTitle =
      liveClassDatas?.title ||
      `Class from ${liveClassDatas.startTime.toDateString()}`;

    //  Single transaction: increment partsCount + create content
    const result = await prisma.$transaction(async (tx) => {
      const liveState = await tx.liveClass.findUnique({
        where: { id: liveClassDatas.id },
        select: { roomClosedAt: true },
      });

      const shouldProcess = Boolean(liveState?.roomClosedAt);

      // increment partsCount
      const updatedLive = await tx.liveClass.update({
        where: { id: liveClassDatas.id },
        data: {
          status: shouldProcess ? "processing" : "live",
          stream: session_id,
          rec: mp4_url,
          raw: mp4_url,
          thumbnailPath,
          thumbnail256x144Path: thumbnailPath,
          durationSec: Number(duration) || 0,
          bunnyVideoId,
          libraryId:
            getCourseInfo?.libraryId ||
            liveClassDatas?.libraryId ||
            process.env.BUNNY_LIBRATY_ID,
          lastRecordingAt: new Date(),
          partsCount: { increment: 1 },
        },
        select: {
          id: true,
          partsCount: true,
          courseSubjectChapterId: true,
          cycleSubjectChapterId: true,
          adminId: true,
          description: true,
          instructor: true,
          lectureSheet: true,
          practiceSheet: true,
          solutionSheet: true,
          markedBook: true,
          videoId: true,
        },
      });

      const partIndex = updatedLive.partsCount;

      // title decide
      const newTitle =
        partIndex === 1 ? baseTitle : `${baseTitle} – Part ${partIndex}`;

      // create content for this part
      const content = updatedLive.courseSubjectChapterId
        ? await tx.classContent.create({
            data: {
              courseSubjectChapterId: updatedLive.courseSubjectChapterId,
              adminId: updatedLive.adminId,
              classTitle: newTitle,
              classNo: classNumber || `${Math.floor(Math.random() * 10) + 1}`,
              hostingType: "bunny",
              libraryId:
                getCourseInfo?.libraryId ||
                liveClassDatas?.libraryId ||
                process.env.BUNNY_LIBRATY_ID,
              zoneSecurityKey: bunnyZoneSecurityKey,
              videoUrl: bunnyVideoId ?? mp4_url ?? "",
              description: updatedLive.description,
              instructor: updatedLive.instructor,
              thumbneil: teacherThumbnail,
              lectureSheet: updatedLive.lectureSheet,
              practiceSheet: updatedLive.practiceSheet,
              solutionSheet: updatedLive.solutionSheet,
              markedBook: updatedLive.markedBook,
              videoId: updatedLive.videoId,
              partIndex,
            },
          })
        : await tx.cycleContent.create({
            data: {
              cycleSubjectChapterId: updatedLive.cycleSubjectChapterId,
              adminId: updatedLive.adminId,
              classTitle: newTitle,
              classNo: classNumber || `${Math.floor(Math.random() * 10) + 1}`,
              hostingType: "bunny",
              libraryId:
                getCourseInfo?.libraryId ||
                liveClassDatas?.libraryId ||
                process.env.BUNNY_LIBRATY_ID,
              zoneSecurityKey: bunnyZoneSecurityKey,
              videoUrl: bunnyVideoId ?? mp4_url ?? "",
              description: updatedLive.description,
              instructor: updatedLive.instructor,
              thumbneil: teacherThumbnail,
              lectureSheet: updatedLive.lectureSheet,
              practiceSheet: updatedLive.practiceSheet,
              solutionSheet: updatedLive.solutionSheet,
              markedBook: updatedLive.markedBook,
              videoId: updatedLive.videoId,
              partIndex,
            },
          });

      // if this is part 2, rename part 1 -> "Part 1"
      if (partIndex === 2) {
        if (updatedLive.courseSubjectChapterId) {
          const part1 = await tx.classContent.findFirst({
            where: {
              videoId: updatedLive.videoId,
              partIndex: 1,
              isDeleted: false,
            },
            select: { id: true },
          });
          if (part1) {
            await tx.classContent.update({
              where: { id: part1.id },
              data: { classTitle: `${baseTitle} – Part 1` },
            });
          }
        } else {
          const part1 = await tx.cycleContent.findFirst({
            where: {
              videoId: updatedLive.videoId,
              partIndex: 1,
              isDeleted: false,
            },
            select: { id: true },
          });
          if (part1) {
            await tx.cycleContent.update({
              where: { id: part1.id },
              data: { classTitle: `${baseTitle} – Part 1` },
            });
          }
        }
      }

      return { updatedLive, content, partIndex };
    });

    await invalidateLiveClassCache(liveClassDatas.id);

    // Lookup table - now use result.content.id (not classUplodInfo)
    if (liveClassDatas?.cycleSubjectChapterId) {
      const getCycle = await findCycleByLiveClass(liveClassDatas?.id);
      await logCycleLookUpTable(result.content?.id, getCycle?.id);
      await logLookUpTable(result.content?.id, getCycle?.course?.id);
    } else if (liveClassDatas?.courseSubjectChapterId) {
      const getCourse = await findCourseByClassContent(
        result.content?.id,
        prisma,
      );
      await logLookUpTable(result.content?.id, getCourse?.id);
    }

    // Return consistent payload
    return {
      ...result.content,
      liveClass: result.updatedLive,
      partIndex: result.partIndex,
    };
  }

  async function handleRecordingFailed(event) {
    const { room_id: videoId, session_id } = event;
    const { mp4_url, status, duration } = event?.data;

    const liveClassData = await prisma.liveClass.findFirst({
      where: { videoId },
    });

    if (!liveClassData) throw new AppErrors(404, "Not found");

    let bunnyVideoId = null;
    let bunnyUploadInfo;

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
        url: mp4_url,
        title: liveClassData?.title || "",
        thumbnailTime: 5000,
      });

      const thumbnailTime = 5000;

      bunnyUploadInfo = await axios.post(
        `https://video.bunnycdn.com/library/${libraryId}/videos/fetch?thumbnailTime=${thumbnailTime}`,
        uploadData,
        {
          headers: {
            accept: "application/json",
            "content-type": "application/*+json",
            AccessKey: accessKey,
          },
        },
      );

      bunnyVideoId = bunnyUploadInfo?.data?.id;
    } catch (error) {
      console.log("BunnyCDN upload failed:", error.message);
    }

    const thumbnailPath = `${config.bunny_stream_base_url || "https://vz-3017b1d3-c56.b-cdn.net"}/${videoGuid || bunnyVideoId}/thumbnail.jpg`;
    const updateData = {
      status: "recording_failed",
      stream: session_id,
      rec: mp4_url,
      raw: mp4_url,
      thumbnailPath: thumbnailPath,
      thumbnail256x144Path: thumbnailPath,
      durationSec: Number(duration) || 0,
      bunnyVideoId: bunnyVideoId,
    };

    const updatedClass = await prisma.liveClass.update({
      where: { id: liveClassData?.id },
      data: updateData,
    });

    await invalidateLiveClassCache(liveClassData.id);

    return updatedClass;
  }

  async function handleBannedStudent(event) {
    const { room_id } = event || {};
    const {
      user_id,
      user_name,
      room_name,
      banned_by,
      banned_by_name,
      banned_by_bot,
      reason,
      banned_at,
      permanent,
    } = event?.data || {};

    try {
      // Validate UUID
      const userIdResult = userIdSchema.safeParse(user_id);

      if (!userIdResult.success) {
        return {
          success: false,
          skipped: true,
          message: "Invalid user_id.",
        };
      }

      const isExistStudent = await prisma.student.findUnique({
        where: {
          id: user_id,
        },
      });
      if (!isExistStudent) {
        return {
          success: false,
          skipped: true,
          message: "Student not found or inactive.",
        };
      }

      let bannedUntil = null;

      bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + 7);

      await prisma.studentRestriction.upsert({
        where: {
          studentId_type: {
            studentId: user_id,
            type: RestrictionType.MEDIA_COMMENT,
          },
        },
        create: {
          studentId: isExistStudent?.id,
          type: RestrictionType.MEDIA_COMMENT,
          reason:
            `দুঃখিত! তোমার এই ফিচার বন্ধ করা হয়েছে। কারণ লাইভ ক্লাসে তুমি ${reason} লিখেছো/করেছো।` ||
            "লাইভ ক্লাসে অপ্রাসঙ্গিক অথবা অতিরিক্ত কমেন্ট!",
          room_name,
          banned_by,
          banned_by_name,
          banned_by_bot,
          bannedUntil,
          bannedAt: banned_at ? new Date(banned_at) : new Date(),
        },
        update: {
          reason,
          bannedUntil,
          room_name,
          banned_by,
          banned_by_name,
          banned_by_bot,
          bannedAt: banned_at ? new Date(banned_at) : new Date(),
        },
      });
      return {
        success: true,
        message: "Student restriction saved.",
      };
    } catch (error) {
      console.error("Media Webhooks Banned User Request Failed.", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
};

//room deleted
const deleteLiveClassRoomFromDb = async (liveClassId, payload) => {
  const { adminId, superAdminId } = payload;
  const isExistLiveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });
  if (!isExistLiveClass)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  //check course
  let getCourse;
  if (isExistLiveClass?.courseSubjectChapterId)
    getCourse = await findCourseByCourseSubjectChapter(
      isExistLiveClass?.courseSubjectChapterId,
    );
  if (isExistLiveClass?.cycleSubjectChapterId)
    getCourse = await findCourseByCycleSubjectChapter(
      isExistLiveClass?.cycleSubjectChapterId,
    );

  const streamClientId = getCourse?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = getCourse?.authKey || process.env.AUTH_KEY;

  const mediaServerDomain =
    mediaServers[isExistLiveClass?.mediaServer] ?? mediaServers?.europe;

  //media check status
  let mediaRoomInfo;
  try {
    //media status check
    const config = {
      method: "GET",
      url: `${mediaServerDomain}/api/rooms/${isExistLiveClass?.videoId}`,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": streamClientId,
        "x-auth-key": streamAuthKey,
      },
    };
    //  Media Room Info AparsClassroom
    const mediaResponse = await axios(config);
    mediaRoomInfo = mediaResponse?.data?.data;
  } catch (error) {
    const mediaRommMessage = error?.response?.data?.message;
    await prisma.liveClass.update({
      where: { id: liveClassId },
      data: { status: "recorded" },
    });
    //new cache added
    await invalidateLiveClassCache(liveClassId);
  }

  const mediaRoomStatus = mediaRoomInfo?.status;
  if (mediaRoomStatus != "ended") {
    const config = {
      method: "POST",
      url: `${mediaServerDomain}/api/rooms/${isExistLiveClass?.videoId}/end`,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": streamClientId,
        "x-auth-key": streamAuthKey,
      },
    };
    // Create Media AparsClass  room
    const roomEndInfo = await axios(config);
    const mediaStatusEnded = roomEndInfo?.data?.data?.status;

    if (mediaStatusEnded === "ended") {
      const data = {
        status: "recorded",
      };
      //update live class
      await prisma.liveClass.update({
        where: {
          id: isExistLiveClass?.id,
        },
        data,
      });

      //new cache added
      await invalidateLiveClassCache(liveClassId);
    }
  } else {
    const data = {
      status: "recorded",
    };
    //update live class
    await prisma.liveClass.update({
      where: {
        id: isExistLiveClass?.id,
      },
      data,
    });

    //new cache added
    await invalidateLiveClassCache(liveClassId);
  }

  //log delete live class form
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdminId.findFirst({
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
    const logDesc = `${creatorName} ${getCourse?.productName || getCourse?.course?.productName} কোর্সের ${isExistLiveClass?.instructor} শিক্ষকের ${isExistLiveClass?.title} ক্লাসটি ডিলিট করে দিয়েছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity for live class delete");
  }

  return {};
};

//join Class
const joinLiveClassFromAppfromDb = async (liveClassId, user) => {
  if (!liveClassId)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class id is required");
  const liveClassInfo = await prisma.liveClass.findFirst({
    where: { id: liveClassId, isDeleted: false },
  });
  if (!liveClassInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Live class data Not found");

  //get the course info
  let getCourse;

  if (liveClassInfo?.courseSubjectChapterId)
    getCourse = await findCourseByCourseSubjectChapter(
      liveClassInfo?.courseSubjectChapterId,
    );

  if (liveClassInfo?.cycleSubjectChapterId)
    getCourse = await findCourseByCycleSubjectChapter(
      liveClassInfo?.cycleSubjectChapterId,
    );

  const streamClientId = getCourse?.clientId || process.env.CLIENT_ID;
  const streamAuthKey = getCourse?.authKey || process.env.AUTH_KEY;

  const videoId = liveClassInfo?.videoId;
  const userInfo = await getUserByRole(user);

  const joinReqUserId = userInfo?.id;
  const liveClassHostSetId = liveClassInfo?.adminId;
  const isAdminAndHostAreSame = joinReqUserId === liveClassHostSetId;

  const userPhoto = userInfo?.profilePhoto || userInfo?.photo;
  const isLiveStatus = liveClassInfo?.status;

  const teacherOrCoTeacherIdentifier =
    userInfo?.role === Enums.roles.ADMIN && isAdminAndHostAreSame
      ? "host"
      : "co-teacher";

  const tmdata = {
    userId: userInfo?.id,
    userName:
      userInfo?.name || userInfo?.email || userInfo?.phone || userInfo?.role,
    role:
      userInfo?.role === Enums.roles.STUDENT
        ? "student"
        : teacherOrCoTeacherIdentifier,
    photo: userPhoto,
  };
  const config = {
    method: "post",
    url: `https://media.aparsclassroom.com/api/rooms/${videoId}/join`,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": streamClientId,
      "x-auth-key": streamAuthKey,
    },
    data: tmdata,
  };
  let joinRes;
  try {
    joinRes = await axios(config);
  } catch (error) {
    console.log(error, "Join live class failed in app");
  }

  if (!joinRes?.data?.data?.token) {
    throw new AppErrors(
      500,
      "দুঃখিত! লাইভ ক্লাসে জয়েন করা যায়নি, আবার চেষ্টা করুন",
    );
  }
  //Custom Result
  const result = {
    token: joinRes?.data?.data?.token,
    hls: liveClassInfo?.hls,
  };

  return result;
};

//Get participents and messages
const getParticipantsAndMessagesFronMediaServer = async (
  query = {},
  roomId,
) => {
  const liveClass = await prisma.liveClass.findFirst({
    where: {
      videoId: roomId,
      status: "recorded",
      isDeleted: false,
    },
  });
  let classParticipants = liveClass?.participants;
  let classMessages = liveClass?.messages;

  const needParticipants = !classParticipants;
  const needMessages = !classMessages;

  if (!roomId?.startsWith("room_")) {
    return {
      data: {
        classParticipants: [],
        classMessages: [],
      },
      meta: {
        participantsFound: !!classParticipants,
        messagesFound: !!classMessages,
      },
    };
  }

  if (!liveClass) {
    return {
      data: {
        classParticipants: [],
        classMessages: [],
      },
      meta: {
        participantsFound: !!classParticipants,
        messagesFound: !!classMessages,
      },
    };
  }

  if (!needParticipants && !needMessages) {
    return {
      data: {
        classParticipants,
        classMessages,
      },
      meta: null,
    };
  }

  // Participants Fetch
  if (needParticipants) {
    try {
      const { data } = await axios.get(
        `https://media.aparsclassroom.com/api/rooms/${roomId}/participants`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CLIENT_ID,
            "x-auth-key": process.env.AUTH_KEY,
          },
        },
      );

      classParticipants = data?.data ?? null;
    } catch (error) {
      console.error(
        "Participants API Error:",
        error?.response?.status || error?.message,
      );
    }
  }

  // Messages Fetch
  if (needMessages) {
    try {
      const { data } = await axios.get(
        `https://media.aparsclassroom.com/api/rooms/${roomId}/messages?limit=1000000`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CLIENT_ID,
            "x-auth-key": process.env.AUTH_KEY,
          },
        },
      );

      classMessages = data?.data ?? null;
    } catch (error) {
      console.error(
        "Messages API Error:",
        error?.response?.status || error?.message,
      );
    }
  }

  // update
  if (
    classParticipants !== liveClass.participants ||
    classMessages !== liveClass.messages
  ) {
    await prisma.liveClass.update({
      where: {
        id: liveClass.id,
      },
      data: {
        ...(classParticipants && { participants: classParticipants }),
        ...(classMessages && { messages: classMessages }),
      },
    });
  }

  //
  if (!classParticipants && !classMessages) {
    return {
      data: {
        classParticipants: [],
        classMessages: [],
      },
      meta: {
        participantsFound: !!classParticipants,
        messagesFound: !!classMessages,
      },
    };
  }

  return {
    data: {
      classParticipants,
      classMessages,
    },
    meta: {
      participantsFound: !!classParticipants,
      messagesFound: !!classMessages,
    },
  };
};

//session data based
export const LiveClassServices = {
  createLiveClassIntoDb,
  joinLiveClassfromDb,
  updateLiveClassStatusIntoDb,
  deleteLiveClassRoomFromDb,
  joinLiveClassFromAppfromDb,
  createAppFressClassIntoDb,
  createLiveClassVersion4IntoDb,
  createLiveClassVersion5IntoDb,
  getParticipantsAndMessagesFronMediaServer,
};
