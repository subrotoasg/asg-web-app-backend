import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { extractMediaLinks } from "../../../../helper/extractMediaLinks.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./class.constants.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { getUserByRole } from "../../../../helper/userModelBasedInfo.js";
import {
  findCourseByClassContent,
  findCourseByCourseSubjectChapter,
  logLookUpTable,
  newfindCycleByAnyHierarchyId,
} from "../../../middleware/handleCourseAuth.js";
import config from "../../../config/index.js";
import { signBunnyUrl } from "../../../lib/bunnySign.js";
import { sendNotification } from "../../student/firebase/messaging/utils/notificationUtlis.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";
import axios from "axios";
import crypto from "crypto";
import { selectFieldsForDownload } from "../cycleContent/cycleContent.constants.js";
import {
  getContentIdToCourseId,
  getCurrentDomain,
} from "../../student/comment/comment.utlis.js";

//Get all Class Services
const getAllClassfromDb = async (query = {}) => {
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.classContent.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    skip,
    take,
    select: selectFields,
  });

  // total count of courses
  const totalCount = await prisma.classContent.count({
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

const getSingleClassfromDb = async (ClassId, userData) => {
  const id = userData?.superAdminId || userData?.adminId || userData?.studentId;

  const isExist = await prisma.classContent.findUnique({
    where: { id: ClassId },
  });
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  if (id && !isExist.uniqueViews.includes(id)) {
    try {
      await prisma.classContent.update({
        where: { id: ClassId },
        data: {
          uniqueViews: { push: id },
          views: { increment: 1 },
        },
      });
    } catch (updateError) {
      console.log("Could not update view count:", updateError.message);
    }
  } else {
    await prisma.classContent.update({
      where: { id: ClassId },
      data: {
        views: { increment: 1 },
      },
    });
  }

  const result = await prisma.classContent.findFirst({
    where: { id: ClassId, isDeleted: false },
    select: selectFields,
  });

  let zoneSecurityKey = result?.zoneSecurityKey; //||
  //result?.courseSubjectChapter?.courseSubject?.course?.zoneSecurityKey;

  if (!zoneSecurityKey && result?.hostingType === "bunny") {
    try {
      const getCourseExtraInfo = await prisma.course.findFirst({
        where: {
          id: result?.courseSubjectChapter?.courseSubject?.course?.id,
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

      const updateZoneSecurityKey = await prisma.classContent.update({
        where: {
          id: ClassId,
        },
        data: {
          zoneSecurityKey: zoneSecurityKey,
        },
      });
    } catch (error) {
      console.error(error, "error on zone security key");
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
    resultWithoutZoneSecurityKey?.courseSubjectChapter?.courseSubject?.course
  ) {
    const {
      zoneSecurityKey: _nestedZoneSecurityKey,
      ...courseWithoutZoneSecurityKey
    } = resultWithoutZoneSecurityKey.courseSubjectChapter.courseSubject.course;

    resultWithoutZoneSecurityKey.courseSubjectChapter.courseSubject.course =
      courseWithoutZoneSecurityKey;
  }

  return {
    ...resultWithoutZoneSecurityKey,
    token: v?.token,
    expires: v?.expires,
    uniqueViews: result?.uniqueViews?.length || 0,
  };
};

const getClassDownloadUrl = async (classId, userData) => {
  const id = userData?.studentId;
  const classInfo = await prisma.classContent.findFirst({
    where: {
      id: classId,
      isDeleted: false,
    },
    select: selectFields,
  });

  const cycleClassInfo = await prisma.cycleContent.findFirst({
    where: {
      id: classId,
      isDeleted: false,
    },
    select: selectFieldsForDownload,
  });

  if (!classInfo && !cycleClassInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  const libraryId = classInfo?.libraryId || cycleClassInfo?.libraryId;
  const videoUrl = classInfo?.videoUrl || cycleClassInfo?.videoUrl;

  if (cycleClassInfo) {
    const response = await newfindCycleByAnyHierarchyId(classId, prisma);
    let cycleIds = [];
    if (response?.markAsArchieve) {
      const getCycles = await prisma.cycle.findMany({
        where: {
          archieveCycleId: response?.id,
        },
      });

      cycleIds = getCycles?.map((el) => el?.id);
    }
    if (response?.isCycleFree) {
    } else {
      const checkStudentCycle = await prisma.cycleStudent.findFirst({
        where: {
          AND: [
            response?.markAsArchieve
              ? { cycleId: { in: cycleIds }, studentId: id }
              : { cycleId: response?.id, studentId: id },
          ],
        },
      });
      if (!checkStudentCycle) {
        throw new AppErrors(
          StatusCodes.FORBIDDEN,
          "you are not authorized for this content",
        );
      }
    }
  }

  const courseInfo = await prisma.course.findFirst({
    where: {
      id:
        classInfo?.courseSubjectChapter?.courseSubject?.course?.id ||
        cycleClassInfo?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
    },
    select: { bunnyApiKey: true },
  });

  const libraryRes = await axios.get(
    `https://api.bunny.net/videolibrary/${libraryId}`,
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
  const videoGuid = videoUrl?.trim().replace(/^\/+|\/+$/g, "");

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

//Get single Class Services
const GetClassByCourseSubjectChapter = async (
  courseSubjectChapterId,
  query = {},
) => {
  const isExist = await prisma.classContent.findFirst({
    where: {
      courseSubjectChapterId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  //For Sorting  query
  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.classContent.findMany({
    where: {
      AND: [
        {
          courseSubjectChapterId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy: {
      classNo: "asc", //order by class no
    },
    select: selectFields,
  });

  const changeResult = result.map((el) => {
    const uniqueViews = el?.uniqueViews?.length;
    return {
      ...el,
      uniqueViews,
    };
  });

  const sorted = changeResult.sort(
    (a, b) => Number(a.classNo) - Number(b.classNo),
  );

  return sorted;
};

const GetEveryThingAboutClassByCourseId = async (courseId, query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const isExistCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  if (!isExistCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not exists!");

  const getCourseSubject = await prisma.courseSubject.findMany({
    where: {
      courseId: courseId,
      isDeleted: false,
    },
  });

  const courseSubjects = getCourseSubject.map((item) => item.id);

  const getCourseSubjectChapter = await prisma.courseSubjectChapter.findMany({
    where: {
      courseSubjectId: { in: courseSubjects },
      isDeleted: false,
    },
  });

  const courseSubjectChapters = getCourseSubjectChapter.map((item) => item.id);

  const result = await prisma.classContent.findMany({
    where: {
      ...where,
      courseSubjectChapterId: { in: courseSubjectChapters },
      isDeleted: false,
    },
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
    select: selectFields,
  });

  const totalCount = await prisma.classContent.count({
    where: {
      ...where,
      courseSubjectChapterId: { in: courseSubjectChapters },
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

//Create Class Services
const createClassIntoDb = async (imageUrl, payload, hostName) => {
  const {
    courseSubjectChapterId,
    classTitle,
    classNo,
    hostingType,
    libraryId,
    videoUrl,
    secondaryUrl,
    description,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    instructor,
    adminId,
    superAdminId,
    markedBook,
  } = payload;

  //Video Url If not exist
  if (!videoUrl) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "class video_id is required");
  }

  //checking Chapter Id
  const existingChapter = await prisma.courseSubjectChapter.findUnique({
    where: { id: courseSubjectChapterId },
  });

  if (!existingChapter) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid ChapterId: Chapter Id does not exist.",
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
        console.log(error, "Error on automatic youtube thumbnail");
      }
    }
  }

  const data = {
    courseSubjectChapterId,
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

  const result = await prisma.classContent.create({
    data,
  });

  const getCourse = await findCourseByCourseSubjectChapter(
    courseSubjectChapterId,
  );
  //upsert to course lookup
  await logLookUpTable(result?.id, getCourse?.id);

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  // check-1; video Status ===3
  //

  //send notification
  try {
    await sendNotification({
      type: "Class Uploaded",
      courseId: getCourse?.id,
      title: `${classTitle} ক্লাসটি আপলোড করা হয়েছে`,
      body: `তোমার জন্য নতুন ক্লাস কনটেন্ট যুক্ত হয়েছে। ক্লাসটি এখনই দেখা শুরু করো`,
      deepLink: `${hostName}/course/${getCourse?.id}/content/${result?.id}?title=${result?.classTitle}`,
      image: imageUrl || "",
      eventKey: `${result?.id}_${result?.classTitle}_${getCourse?.id}`,
    });
  } catch (err) {
    console.error("Notification preparation failed:", err);
  }

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
    const logTitle = `নতুন ক্লাস আপলোড করা হয়েছে`;
    const logDesc = `${creatorName}, ${getCourse?.productName} কোর্সে নতুন ক্লাস "${classTitle}" আপলোড করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on class upload");
  }

  return response;
};

//Update Class Services
const updateClassIntoDb = async (ClassId, uploadedFiles, payload) => {
  const {
    classTitle,
    classNo,
    description,
    hostingType,
    libraryId,
    videoUrl,
    secondaryUrl,
    instructor,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    courseSubjectChapterId,
    markedBook,
    adminId,
    superAdminId,
  } = payload;

  const isExist = await prisma.classContent.findUnique({
    where: {
      id: ClassId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  //seperate imageUrl and videoUrl
  const { imageUrl } = extractMediaLinks(uploadedFiles);

  //Updated Data
  const fieldsToUpdate = {
    classTitle,
    classNo,
    videoUrl,
    secondaryUrl,
    libraryId,
    hostingType,
    instructor,
    description,
    lectureSheet,
    practiceSheet,
    solutionSheet,
    thumbneil: imageUrl,
    courseSubjectChapterId,
    markedBook,
  };

  //Premetive and non premetive data
  const updatedFields = transformUpdatedFields(fieldsToUpdate, []);

  //Remove Media file
  // const existVideoUrl = isExist?.videoUrl;
  const existThumbneilUrl = isExist?.thumbneil;

  // // Check and delete video URL if updated
  // if (updatedFields?.videoUrl) {
  //   await removeFiles.deleteFromBunnyCDN(existVideoUrl);
  // }

  // Check and delete thumbnail URL if updated
  if (updatedFields?.thumbneil) {
    try {
      // await removeFiles.deleteFromBunnyCDN(existThumbneilUrl);
    } catch (error) {
      console.log(error, "deleting form bunny");
    }
  }

  //updated Database
  const result = await prisma.classContent.update({
    where: {
      id: ClassId,
    },
    data: updatedFields,
  });

  if (updatedFields?.courseSubjectChapterId) {
    const getCourse = await findCourseByCourseSubjectChapter(
      updatedFields?.courseSubjectChapterId,
    );
    //upsert to course lookup
    await logLookUpTable(isExist?.id, getCourse?.id);
  }

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //logging class edit
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
    const logTitle = `ক্লাস কন্টেন্ট আপডেট হয়েছে`;
    const logDesc = `${creatorName}, কোর্সে "${isExist?.classTitle}" ক্লাস এর তথ্য পরিবর্তন করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on class content edit");
  }

  return response;
};

//Delete Class Services
const deleteClassFromDb = async (ClassId, payload = {}) => {
  const { adminId, superAdminId } = payload;
  const isExist = await prisma.classContent.findUnique({
    where: {
      id: ClassId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.classContent.update({
    where: {
      id: ClassId,
    },
    data,
  });

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
    const getCourse = await findCourseByClassContent(ClassId);
    const logTitle = `ক্লাস কন্টেন্ট ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের "${isExist?.classTitle}" ক্লাসটি ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on delete class content");
  }

  return {};
};

const GodClass = async (thumbneil, payload) => {
  const {
    courseId,
    subjectId,
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
    const isExistCourse = await tx.course.findUnique({
      where: {
        id: courseId,
        isDeleted: false,
      },
    });

    if (!isExistCourse)
      throw new AppErrors(StatusCodes.NOT_FOUND, "course not found!");

    const isExistSubject = await tx.subject.findUnique({
      where: {
        id: subjectId,
        isDeleted: false,
      },
    });

    if (!isExistSubject)
      throw new AppErrors(StatusCodes.NOT_FOUND, "subject not found!");

    const isExistChapter = await tx.chapter.findUnique({
      where: {
        id: chapterId,
        subjectId: subjectId,
        isDeleted: false,
      },
    });

    if (!isExistChapter)
      throw new AppErrors(StatusCodes.NOT_FOUND, "chapter not found!");

    const isExistCourseSubject = await tx.courseSubject.findFirst({
      where: {
        subjectId,
        courseId,
        isDeleted: false,
      },
    });

    let courseSubject = isExistCourseSubject;

    if (!isExistCourseSubject)
      courseSubject = await tx.courseSubject.create({
        data: {
          adminId,
          courseId,
          subjectId,
        },
      });

    const isExistCourseSubjectChapter = await tx.courseSubjectChapter.findFirst(
      {
        where: {
          courseSubjectId: courseSubject.id,
          chapterId,
        },
      },
    );

    let courseSubjectChapter = isExistCourseSubjectChapter;

    if (!isExistCourseSubjectChapter)
      courseSubjectChapter = await tx.courseSubjectChapter.create({
        data: {
          courseSubjectId: courseSubject.id,
          chapterId,
        },
      });

    const pushContent = await tx.classContent.create({
      data: {
        courseSubjectChapterId: courseSubjectChapter.id,
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

//authentication token based class
const getSinglAuthenticationTokenBasedClassfromDb = async (
  ClassId,
  userData,
) => {
  const id = userData?.superAdminId || userData?.adminId || userData?.studentId;

  const isExist = await prisma.classContent.findUnique({
    where: { id: ClassId },
  });
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  if (id && !isExist.uniqueViews.includes(id)) {
    try {
      await prisma.classContent.update({
        where: { id: ClassId },
        data: {
          uniqueViews: { push: id },
          views: { increment: 1 },
        },
      });
    } catch (updateError) {
      console.log("Could not update view count:", updateError.message);
    }
  } else {
    await prisma.classContent.update({
      where: { id: ClassId },
      data: {
        views: { increment: 1 },
      },
    });
  }

  const result = await prisma.classContent.findFirst({
    where: { id: ClassId, isDeleted: false },
    select: selectFields,
  });

  //auth token based
  const secretKey = config.bunny_Token;
  const baseUrl = config.bunny_stream_base_url;
  const ttl = Number(config.bunny_token_ttl_seconds || "300");
  const rawUrl = `${baseUrl}/${result?.videoUrl}/playlist.m3u8`;
  const userInfo = await getUserByRole(userData);
  const userEmail = userInfo?.email;
  const signedUrl = signBunnyUrl({
    fullUrl: rawUrl,
    secretKey,
    ttlSeconds: ttl,
  });
  return {
    ...result,
    playbackUrl: signedUrl,
    uniqueViews: result?.uniqueViews?.length || 0,
  };
};

//bunny video statistics
const getBunnyVideoStatisticsFromBunny = async (ClassId) => {
  let isExist = await prisma.classContent.findUnique({
    where: { id: ClassId },
  });

  // if not found → try cycleContent
  if (!isExist) {
    isExist = await prisma.cycleContent.findUnique({
      where: { id: ClassId },
    });
  }
  // still not found
  if (!isExist) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Content Not Found");
  }
  if (isExist?.hostingType !== "bunny") {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Class is not hosted on apars`media",
    );
  }
  const lib_api_key = await prisma.libApi.findFirst({
    where: {
      libraryId: isExist?.libraryId,
    },
  });
  try {
    const response = await axios.get(
      `https://video.bunnycdn.com/library/${isExist?.libraryId}/statistics?videoGuid=${isExist?.videoUrl}`,
      {
        headers: {
          AccessKey: lib_api_key?.apiKey,
        },
      },
    );
    return response?.data;
  } catch (error) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Error fetching bunny video statistics",
    );
  }
};

const BUNNY_STREAM_API = "https://video.bunnycdn.com";
const QUALITY_ORIGINAL = "original";

// MP4 fallback rungs Bunny can generate. Capped at 720p for standard
// multi-resolution ladders; add higher entries only if you encode a
// single high-res rung (Bunny's documented exception).
const FALLBACK_LADDER = ["240p", "360p", "480p", "720p", "1080p"];

const GetClassDownloadMetaDataV2 = async (classId, userData, query = {}) => {
  const id = userData?.studentId;
  const requestedQuality = (query.quality || "").trim() || null;

  const classInfo = await prisma.classContent.findFirst({
    where: {
      id: classId,
      isDeleted: false,
    },
    select: selectFields,
  });

  const cycleClassInfo = await prisma.cycleContent.findFirst({
    where: {
      id: classId,
      isDeleted: false,
    },
    select: selectFieldsForDownload,
  });

  if (!classInfo && !cycleClassInfo)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Class Not Found");

  const libraryId = classInfo?.libraryId || cycleClassInfo?.libraryId;
  const videoUrl = classInfo?.videoUrl || cycleClassInfo?.videoUrl;

  if (cycleClassInfo) {
    const response = await newfindCycleByAnyHierarchyId(classId, prisma);
    let cycleIds = [];
    if (response?.markAsArchieve) {
      const getCycles = await prisma.cycle.findMany({
        where: {
          archieveCycleId: response?.id,
        },
      });

      cycleIds = getCycles?.map((el) => el?.id);
    }
    if (response?.isCycleFree) {
    } else {
      const checkStudentCycle = await prisma.cycleStudent.findFirst({
        where: {
          AND: [
            response?.markAsArchieve
              ? { cycleId: { in: cycleIds }, studentId: id }
              : { cycleId: response?.id, studentId: id },
          ],
        },
      });
      if (!checkStudentCycle) {
        throw new AppErrors(
          StatusCodes.FORBIDDEN,
          "you are not authorized for this content",
        );
      }
    }
  }

  const courseInfo = await prisma.course.findFirst({
    where: {
      id:
        classInfo?.courseSubjectChapter?.courseSubject?.course?.id ||
        cycleClassInfo?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
    },
    select: { bunnyApiKey: true },
  });

  const accessKey = courseInfo?.bunnyApiKey || config.bunny_main_api_key;

  const libraryRes = await axios.get(
    `https://api.bunny.net/videolibrary/${libraryId}`,
    { headers: { AccessKey: accessKey } },
  );

  const pullZoneRes = await axios.get(
    `https://api.bunny.net/pullzone/${libraryRes.data.PullZoneId}`,
    { headers: { AccessKey: accessKey } },
  );

  const securityKey = pullZoneRes.data.ZoneSecurityKey;
  const cdnHost = `https://${pullZoneRes.data.Hostnames?.[0]?.Value}`;
  const videoGuid = videoUrl?.trim().replace(/^\/+|\/+$/g, "");

  if (!videoGuid)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid video ID");
  if (!securityKey)
    throw new AppErrors(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Missing CDN security key",
    );

  // 24h covers paused downloads that resume the next day. Tokens
  // can't be refreshed mid-download once issued.
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  const signPath = (filePath) => {
    const hash = crypto
      .createHash("md5")
      .update(securityKey + filePath + expires)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return `${cdnHost}${filePath}?token=${hash}&expires=${expires}`;
  };

  // ---- discover which MP4s exist by probing the deterministic ladder ----
  // Fallback files are named /{guid}/play_{height}p.mp4. HEAD is the source
  // of truth — no dependence on the Stream meta call's format or auth.
  const candidates = FALLBACK_LADDER.map((q) => ({
    quality: q,
    height: parseInt(q, 10) || 0,
    path: `/${videoGuid}/play_${q}.mp4`,
  }));

  const qualities = await Promise.all(
    candidates.map(async (c) => {
      const url = signPath(c.path);
      try {
        const head = await axios.head(url, { timeout: 5000 });
        const len = Number(head.headers["content-length"]);
        return {
          quality: c.quality,
          height: c.height,
          downloadUrl: url,
          sizeBytes: Number.isFinite(len) ? len : null,
        };
      } catch {
        // 404 means this rung wasn't encoded for this video — skip it.
        return null;
      }
    }),
  );

  const validQualities = qualities
    .filter(Boolean)
    .sort((a, b) => a.height - b.height);

  // Original is always available — it's the source upload.
  const originalUrl = signPath(`/${videoGuid}/original`);
  let originalSize = null;
  try {
    const head = await axios.head(originalUrl, { timeout: 5000 });
    const len = Number(head.headers["content-length"]);
    originalSize = Number.isFinite(len) ? len : null;
  } catch {
    // Leave size null — picker still works without it.
  }
  validQualities.push({
    quality: QUALITY_ORIGINAL,
    height: null,
    downloadUrl: originalUrl,
    sizeBytes: originalSize,
  });

  // ---- pick the URL handed back as the top-level downloadUrl ----
  let chosen = null;
  if (requestedQuality) {
    chosen = validQualities.find((q) => q.quality === requestedQuality) || null;
  }
  // Fallback chain: requested → original → first available.
  if (!chosen) {
    chosen =
      validQualities.find((q) => q.quality === QUALITY_ORIGINAL) ||
      validQualities[0];
  }

  return {
    downloadUrl: chosen.downloadUrl,
    encryptionSecret: id,
    qualityLabel: chosen.quality,
    qualities: validQualities,
  };
};

const contentIdToCourseInfoFromDb = async (payload = {}) => {
  const contentId = payload?.contentId;
  const contentType = payload?.contentType;

  if (contentType === "CLASS_CONTENT") {
    const courseInfo = await getContentIdToCourseId({
      classContentId: contentId,
    });

    const domainUrl = await getCurrentDomain(courseInfo);
    const link = `${domainUrl?.url}/course/${courseInfo?.course?.id}/subject/${courseInfo.cycleSubject?.id}/classes/${courseInfo.chapter?.id}/content/${courseInfo?.content?.id}?title=${courseInfo?.content?.classTitle}`;

    return {
      ...courseInfo,
      link,
    };
  } else if (contentType === "CYCLE_CONTENT") {
    const courseInfo = await getContentIdToCourseId({
      cycleContentId: contentId,
    });

    const domainUrl = await getCurrentDomain(courseInfo);
    const link = `${domainUrl?.url}/course/${courseInfo?.course?.id}/subject/${courseInfo.cycleSubject?.id}/chapter/${courseInfo.chapter?.id}/content/${courseInfo?.content?.id}?title=${courseInfo?.content?.classTitle}`;
    return {
      ...courseInfo,
      link,
    };
  } else {
    return {
      link: `https://aparsclassroom.com`,
    };
  }
};

export const ClassServices = {
  GodClass,
  getAllClassfromDb,
  getSingleClassfromDb,
  getClassDownloadUrl,
  GetClassByCourseSubjectChapter,
  GetEveryThingAboutClassByCourseId,
  createClassIntoDb,
  updateClassIntoDb,
  deleteClassFromDb,
  getSinglAuthenticationTokenBasedClassfromDb,
  getBunnyVideoStatisticsFromBunny,
  GetClassDownloadMetaDataV2,
  contentIdToCourseInfoFromDb,
};
