import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { extractMediaLinks } from "../../../../helper/extractMediaLinks.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./cycleContent.constants.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  findCourseByCycle,
  findCycleByCycleContent,
  findCycleByCycleSubjectChapter,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { sendNotification } from "../../student/firebase/messaging/utils/notificationUtlis.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";
import config from "../../../config/index.js";
import axios from "axios";
import crypto from "crypto";

//Get all CycleContent Services
const getAllCycleContentfromDb = async (query) => {
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.cycleContent.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of cycle content
  const totalCount = await prisma.cycleContent.count({
    where: {
      ...where,
      isDeleted: false,
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//Get single CycleContent Services
const getSingleCycleContentfromDb = async (CycleContentId) => {
  const isExist = await prisma.cycleContent.findUnique({
    where: {
      id: CycleContentId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  try {
    await prisma.cycleContent.update({
      where: { id: CycleContentId },
      data: {
        views: { increment: 1 },
      },
    });
  } catch (error) {
    console.error("Could not update view count:", updateError.message);
  }

  const result = await prisma.cycleContent.findFirst({
    where: {
      AND: [
        {
          id: CycleContentId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    select: selectFields,
  });

  let zoneSecurityKey = result?.zoneSecurityKey; //||
  //result?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.zoneSecurityKey;

  if (!zoneSecurityKey && result?.hostingType === "bunny") {
    try {
      const getCourseExtraInfo = await prisma.course.findFirst({
        where: {
          id: result?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        },
      });

      const getLibraryInfo = await axios.get(
        `https://api.bunny.net/videolibrary/${result?.libraryId}`,
        {
          headers: {
            AccessKey:
              getCourseExtraInfo?.bunnyApiKey || config.bunny_main_api_key,
          },
        },
      );

      const getPullZoneInfo = await axios.get(
        `https://api.bunny.net/pullzone/${getLibraryInfo?.data?.PullZoneId}`,
        {
          headers: {
            AccessKey:
              getCourseExtraInfo?.bunnyApiKey || config.bunny_main_api_key,
          },
        },
      );

      zoneSecurityKey = getPullZoneInfo?.data?.ZoneSecurityKey;

      const updateZoneSecurityKey = await prisma.cycleContent.update({
        where: {
          id: CycleContentId,
        },
        data: {
          zoneSecurityKey: zoneSecurityKey,
        },
      });
    } catch (error) {
      console.error(error?.message, "error on zone security key");
    }
  }

  let v = {};
  try {
    v = createBunnyEmbedUrl(result?.videoUrl, zoneSecurityKey);
  } catch (error) {
    console.log(error?.message, "error on creating bunny embed url");
  }

  const { zoneSecurityKey: _zoneSecurityKey, ...resultWithoutZoneSecurityKey } =
    result || {};

  if (
    resultWithoutZoneSecurityKey?.cycleSubjectChapter?.cycleSubject?.cycle
      ?.course
  ) {
    const {
      zoneSecurityKey: _nestedZoneSecurityKey,
      ...courseWithoutZoneSecurityKey
    } =
      resultWithoutZoneSecurityKey.cycleSubjectChapter?.cycleSubject?.cycle
        ?.course;

    resultWithoutZoneSecurityKey.cycleSubjectChapter.cycleSubject.cycle.course =
      courseWithoutZoneSecurityKey;
  }

  return {
    ...resultWithoutZoneSecurityKey,
    token: v?.token,
    expires: v?.expires,
  };
};

const getCycleContentDownloadMetaData = async (CycleContentId, userData) => {
  const id = userData?.studentId;
  const classInfo = await prisma.cycleContent.findFirst({
    where: {
      id: CycleContentId,
      isDeleted: false,
    },
    select: selectFields,
  });

  if (!classInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Content Not Found");

  const courseInfo = await prisma.course.findFirst({
    where: {
      id: classInfo?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
    },
  });

  const libraryRes = await axios.get(
    `https://api.bunny.net/videolibrary/${classInfo.libraryId}`,
    {
      headers: {
        AccessKey: courseInfo?.bunnyApiKey || config.bunny_main_api_key,
      },
    },
  );

  const pullZoneRes = await axios.get(
    `https://api.bunny.net/pullzone/${libraryRes.data.PullZoneId}`,
    {
      headers: {
        AccessKey: courseInfo?.bunnyApiKey || config.bunny_main_api_key,
      },
    },
  );

  const securityKey = pullZoneRes.data.ZoneSecurityKey;
  const cdnHost = `https://${pullZoneRes.data.Hostnames?.[0]?.Value}`;
  const videoGuid = classInfo.videoUrl?.trim().replace(/^\/+|\/+$/g, "");

  if (!videoGuid)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid video ID");
  if (!securityKey)
    throw new AppErrors(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Missing CDN security key",
    );

  const filePath = `/${videoGuid}/original`;
  const expires = Math.floor(Date.now() / 1000) + 7200;

  const hash = crypto
    .createHash("md5")
    .update(securityKey + filePath + expires)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const downloadUrl = `${cdnHost}${filePath}?token=${hash}&expires=${expires}`;

  return { downloadUrl: downloadUrl, encryptionSecret: id };
};

//function for bunny token
function generateBunnyEmbedToken(videoId, zoneSecurityKey, expires) {
  const apiKey = zoneSecurityKey;

  if (!apiKey) {
    //console.log("Info: api key not found probably a youtube video");
    //throw new Error("Missing BUNNY_STREAM_API_KEY");
  }

  return crypto
    .createHash("sha256")
    .update(apiKey + videoId + expires)
    .digest("hex");
}

function createBunnyEmbedUrl(videoId, zoneSecurityKey) {
  const expires = Math.floor(Date.now() / 1000) + 25 * 60;

  const token = generateBunnyEmbedToken(videoId, zoneSecurityKey, expires);

  return {
    token,
    expires,
  };
}

//end of implementation bunny token

//Get Class based on cycle chapter  Services
const getClassBasedOnCycleChapterIdfromDb = async (
  cycleSubjectChapterId,
  query = {},
) => {
  const isExist = await prisma.cycleContent.findFirst({
    where: {
      cycleSubjectChapterId,
    },
  });
  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.cycleContent.findMany({
    where: {
      AND: [
        {
          cycleSubjectChapterId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy,
    select: selectFields,
  });

  const sorted = result.sort((a, b) => Number(a.classNo) - Number(b.classNo));

  return result;
};

const GetCycleContentByCycleId = async (cycleId, query = {}) => {
  const isExistCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
    },
  });

  if (!isExistCycle)
    throw new AppErrors(StatusCodes.NOT_FOUND, "cycle doesn't exists!");

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.cycleContent.findMany({
    where: {
      cycleSubjectChapter: {
        isDeleted: false,
        cycleSubject: {
          isDeleted: false,
          cycle: {
            isDeleted: false,
            id: cycleId,
          },
        },
      },
      isDeleted: false,
    },
    skip,
    take,
    orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.cycleContent.count({
    where: {
      cycleSubjectChapter: {
        isDeleted: false,
        cycleSubject: {
          isDeleted: false,
          cycle: {
            isDeleted: false,
            id: cycleId,
          },
        },
      },
      isDeleted: false,
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const GetCycleSubjectChapterContentInfoByCourseId = async (
  courseId,
  query = {},
) => {
  const isExistCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  if (!isExistCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not exists!");

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const getCycles = await prisma.cycle.findMany({
    where: {
      courseId,
      isDeleted: false,
    },
  });

  const cycles = getCycles.map((item) => item.id);

  const getCycleSubjects = await prisma.cycleSubject.findMany({
    where: {
      cycleId: { in: cycles },
    },
  });
  const cycleSubjects = getCycleSubjects.map((item) => item.id);

  const getCycleSubjectChapters = await prisma.cycleSubjectChapter.findMany({
    where: {
      cycleSubjectId: { in: cycleSubjects },
    },
  });

  const cycleSubjectChapters = getCycleSubjectChapters.map((item) => item.id);

  const result = await prisma.cycleContent.findMany({
    where: {
      ...where,
      cycleSubjectChapterId: { in: cycleSubjectChapters },
      isDeleted: false,
    },
    skip,
    take,
    orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.cycleContent.count({
    where: {
      ...where,
      cycleSubjectChapterId: { in: cycleSubjectChapters },
      isDeleted: false,
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const cleanVideoId = (videoId = "") => {
  return videoId.split(/[?&]/)[0].trim();
};

const uploadBufferToBunnyStorage = async (
  fileBuffer,
  fileName,
  contentType = "image/jpeg",
) => {
  const HOSTNAME = config.base_host_name; // e.g. storage.bunnycdn.com or region endpoint
  const STORAGE_ZONE_NAME = config.bunny_storage_zone_name;
  const ACCESS_KEY = config.bunny_storage_api_key;
  const CDN_URL = `https://apars.b-cdn.net/varsity`;

  const cdnPath = fileName;

  await axios.put(
    `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/varsity/${cdnPath}`,
    fileBuffer,
    {
      headers: {
        AccessKey: ACCESS_KEY,
        "Content-Type": contentType,
      },
      maxBodyLength: Infinity,
    },
  );

  return `${CDN_URL}/${cdnPath}`;
};

//Create CycleContent Services
const createCycleContentIntoDb = async (imageUrl, payload, hostName) => {
  const {
    cycleSubjectChapterId,
    classTitle,
    classNo,
    adminId,
    superAdminId,
    hostingType,
    libraryId,
    videoUrl,
    secondaryUrl,
    description,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    instructor,
    markedBook,
  } = payload;

  //Video Url not exist
  if (!videoUrl) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Video is Required");
  }

  //checking Cycle Chapter Id
  const existingCycleChapter = await prisma.cycleSubjectChapter.findUnique({
    where: { id: cycleSubjectChapterId, isDeleted: false },
  });

  if (!existingCycleChapter) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid Cycle Chapter: Chapter does not exist.",
    );
  }

  //auto thumbneil section
  let thumb = imageUrl;
  if (!imageUrl) {
    if (hostingType === "bunny") {
      try {
        const getPullZone = await axios.get(
          `https://api.bunny.net/videolibrary/${libraryId}`,
          {
            headers: {
              AccessKey: config.bunny_main_api_key,
            },
          },
        );

        const getZoneName = await axios.get(
          `https://api.bunny.net/pullzone/${getPullZone?.data?.PullZoneId}`,
          {
            headers: {
              AccessKey: config.bunny_main_api_key,
            },
          },
        );

        thumb = `https://${getZoneName?.data?.Name}.b-cdn.net/${videoUrl}/thumbnail.jpg`;

        const thumbRes = await axios.get(thumb, {
          responseType: "arraybuffer",
          validateStatus: () => true,
          headers: {
            Referer: "https://aparsclassroom.com/",
          },
        });

        if (thumbRes.status !== 200) {
          throw new Error(
            `Thumbnail download failed with status ${thumbRes.status}`,
          );
        }

        const contentType = thumbRes.headers["content-type"] || "image/jpeg";
        const ext = contentType.includes("png")
          ? "png"
          : contentType.includes("webp")
            ? "webp"
            : "jpg";

        thumb = await uploadBufferToBunnyStorage(
          thumbRes.data,
          `thumbnails/${videoUrl}.${ext}`,
          contentType,
        );
      } catch (error) {
        console.log(error, "Error on automatic bunny thumbnail");
      }
    } else {
      try {
        thumb = `https://img.youtube.com/vi/${cleanVideoId(videoUrl)}/hqdefault.jpg`;
      } catch (error) {
        console.log(error, "Error on automatic bunny thumbnail");
      }
    }
  }

  const data = {
    cycleSubjectChapterId,
    classTitle,
    classNo,
    description,
    hostingType,
    libraryId,
    videoUrl,
    secondaryUrl,
    thumbneil: thumb,
    instructor,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    adminId,
    markedBook,
  };

  const result = await prisma.cycleContent.create({
    data,
  });

  const getCycle = await findCycleByCycleSubjectChapter(cycleSubjectChapterId);

  const getCouse = await findCourseByCycle(getCycle?.id);

  await logLookUpTable(result?.id, getCouse?.id);

  await logCycleLookUpTable(result?.id, getCycle?.id);

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //send notification
  try {
    await sendNotification({
      type: "Cycle Class Uploaded",
      cycleId: getCouse?.id,
      title: `${classTitle} ক্লাসটি আপলোড করা হয়েছে`,
      body: `তোমার জন্য নতুন ক্লাস কনটেন্ট যুক্ত হয়েছে।ক্লাসটি এখনই দেখা শুরু করো`,
      deepLink: `${hostName}/course/${getCouse?.id}/content/${result?.id}?title=${result?.classTitle}`,
      image: imageUrl || "",
      eventKey: `${result?.id}_${result?.classTitle}_${getCouse?.id}`,
    });
  } catch (err) {
    console.error("Notification preparation failed:", err);
  }

  //log cycle contnet create
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

    const logTitle = `নতুন কোর্সের সাইকেলে কন্টেন্ট যোগ হয়েছে`;
    const logDesc = `${creatorName} ${getCouse?.productName} কোর্সের ${getCycle?.title} সাইকেলে ${classTitle} ক্লাসটি আপলোড করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on new cycle content");
  }

  return response;
};

//Update CycleContent Services
const updateCycleContentIntoDb = async (
  CycleContentId,
  uploadedFiles,
  payload,
) => {
  const {
    classTitle,
    classNo,
    description,
    hostingType,
    libraryId,
    videoUrl,
    secondaryUrl,
    instructor,
    markedBook,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    cycleSubjectChapterId,
    adminId,
    superAdminId,
  } = payload;

  const isExist = await prisma.cycleContent.findUnique({
    where: {
      id: CycleContentId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  //seperate imageUrl and videoUrl
  const { imageUrl } = extractMediaLinks(uploadedFiles);

  //Updated Data
  const updatedFields = transformUpdatedFields(
    {
      classTitle,
      classNo,
      videoUrl,
      secondaryUrl,
      libraryId,
      thumbneil: imageUrl,
      description,
      hostingType,
      instructor,
      lectureSheet,
      practiceSheet,
      solutionSheet,
      markedBook,
      cycleSubjectChapterId,
    },
    [],
  );

  //Remove Media file
  // const existVideoUrl = isExist?.videoUrl;
  const existThumbneilUrl = isExist?.thumbneil;

  // // Check and delete video URL if updated
  // if (updatedFields?.videoUrl) {
  //   await removeFiles.deleteFromBunnyCDN(existVideoUrl);
  // }

  // Check and delete thumbnail URL if updated
  if (updatedFields?.thumbneil) {
    // await removeFiles.deleteFromBunnyCDN(existThumbneilUrl);
  }

  //updated Database
  const result = await prisma.cycleContent.update({
    where: {
      id: CycleContentId,
    },
    data: updatedFields,
  });

  if (updatedFields?.cycleSubjectChapterId) {
    const getCycle = await findCycleByCycleSubjectChapter(
      updatedFields?.cycleSubjectChapterId,
    );

    const getCouse = await findCourseByCycle(getCycle?.id);

    await logLookUpTable(CycleContentId, getCouse?.id);

    await logCycleLookUpTable(CycleContentId, getCycle?.id);
  }

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log update class content
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

    const getCycle = await findCycleByCycleContent(CycleContentId);

    const logTitle = `সাইকেল এ ক্লাস কন্টেন্ট আপডেট হয়েছে`;
    const logDesc = `${creatorName} ${getCycle?.course?.productName} কোর্সের ${getCycle?.title} ${isExist?.classTitle} ক্লাসটির তথ্য আপডেট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update cycle content");
  }

  return response;
};

//Delete CycleContent Services
const deleteCycleContentFromDb = async (CycleContentId, payload) => {
  const { adminId, superAdminId } = payload;
  const isExist = await prisma.cycleContent.findUnique({
    where: {
      id: CycleContentId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.cycleContent.update({
    where: {
      id: CycleContentId,
    },
    data,
  });

  //log cycle content delete activity
  try {
    let creatorName = "";
    if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    } else if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    }

    const getCycle = await findCycleByCycleContent(CycleContentId);

    const logTitle = `সাইকেলের ক্লাস কন্টেন্ট ডিলিট হয়েছে`;
    const logDesc = `${creatorName} ${getCycle?.course?.productName} কোর্সের ${getCycle?.title} ${isExist?.classTitle} ক্লাসটি ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on cycle content delete");
  }

  return {};
};

const GodClass = async (thumbneil, payload) => {
  const {
    cycleId,
    cycleSubjectId,
    chapterId,
    adminId,
    classTitle,
    classNo,
    hostingType,
    videoUrl,
    description,
    lectureSheet,
    practiceSheet,
    solutionSheet,
  } = payload;

  return prisma.$transaction(async (tx) => {
    const isExistCycle = await tx.cycle.findUnique({
      where: {
        id: cycleId,
        isDeleted: false,
      },
    });

    if (!isExistCycle)
      throw new AppErrors(StatusCodes.NOT_FOUND, "cycle not found!");

    const isExistSubject = await tx.cycleSubject.findUnique({
      where: {
        id: cycleSubjectId,
        isDeleted: false,
      },
    });

    if (!isExistSubject)
      throw new AppErrors(StatusCodes.NOT_FOUND, "subject not found!");

    const isExistChapter = await tx.chapter.findUnique({
      where: {
        id: chapterId,
        subjectId: isExistSubject.subjectId,
        isDeleted: false,
      },
    });

    if (!isExistChapter)
      throw new AppErrors(StatusCodes.NOT_FOUND, "chapter not found!");

    const isExistCycleSubjectChapter = await tx.cycleSubjectChapter.findFirst({
      where: {
        cycleSubjectId,
        chapterId,
        isDeleted: false,
      },
    });

    let cycleSubjectChapter = isExistCycleSubjectChapter;

    if (!isExistCycleSubjectChapter)
      cycleSubjectChapter = await tx.cycleSubjectChapter.create({
        data: {
          cycleSubjectId: cycleSubjectId,
          chapterId: chapterId,
        },
      });

    const pushContent = await tx.cycleContent.create({
      data: {
        cycleSubjectChapterId: cycleSubjectChapter.id,
        adminId,
        classTitle,
        classNo,
        hostingType,
        videoUrl,
        description,
        thumbneil,
        lectureSheet,
        practiceSheet,
        solutionSheet,
      },
    });

    const response = pickCreateAndUpdateResponse(
      pushContent,
      sendResponseFields,
    );

    return response;
  });
};

export const CycleContentServices = {
  getAllCycleContentfromDb,
  getSingleCycleContentfromDb,
  getCycleContentDownloadMetaData,
  getClassBasedOnCycleChapterIdfromDb,
  GetCycleSubjectChapterContentInfoByCourseId,
  GetCycleContentByCycleId,
  createCycleContentIntoDb,
  updateCycleContentIntoDb,
  deleteCycleContentFromDb,
  GodClass,
};
