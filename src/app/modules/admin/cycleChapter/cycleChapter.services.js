import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./cycleChapter.constants.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  findCourseByCycle,
  findCycleByCycleSubject,
  findCycleByCycleSubjectChapter,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

const GetAllSubjectChapterByCycle = async (cycleId, query = {}) => {
  const isExistCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
    },
  });

  if (!isExistCycle) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "cycle not found");
  }

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.cycleSubjectChapter.findMany({
    where: {
      ...where,
      cycleSubject: {
        cycle: {
          id: cycleId,
        },
      },
    },
    skip,
    take,
    orderBy: [
      {
        serial: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    // orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.cycleSubjectChapter.count({
    where: {
      ...where,
      cycleSubject: {
        cycle: {
          id: cycleId,
        },
      },
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

const GetAllInfoByCourseId = async (courseId, query = {}) => {
  const isExistCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
      isDeleted: false,
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

  const cycles = getCycles?.map((item) => item.id);

  const getCycleSubjects = await prisma.cycleSubject.findMany({
    where: {
      cycleId: { in: cycles },
      isDeleted: false,
    },
  });

  // console.log(getCycleSubjects, "cy-su");

  const cycleSubjects = getCycleSubjects.map((item) => item.id);

  const result = await prisma.cycleSubjectChapter.findMany({
    where: {
      ...where,
      cycleSubjectId: { in: cycleSubjects },
      isDeleted: false,
    },
    skip,
    take,
    orderBy: [
      {
        serial: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    // orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.cycleSubjectChapter.count({
    where: {
      ...where,
      cycleSubjectId: { in: cycleSubjects },
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

//Get single CycleChapter Services
const getSingleCycleChapterfromDb = async (CycleChapterId) => {
  const isExistCycleChapter = await prisma.cycleSubjectChapter.findUnique({
    where: {
      id: CycleChapterId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExistCycleChapter)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Chapter Not Found");

  const result = await prisma.cycleSubjectChapter.findFirst({
    where: {
      AND: [
        {
          id: CycleChapterId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    select: selectFields,
  });

  return result;
};

//Get all Chapter based On the Subject
const getChapterBasedOnSubjectIdfromDb = async (subjectId, query = {}) => {
  const isExistSubject = await prisma.cycleSubject.findFirst({
    where: {
      id: subjectId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExistSubject)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Subject Not Found");

  //For Sorting  query
  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.cycleSubjectChapter.findMany({
    where: {
      AND: [
        {
          cycleSubjectId: subjectId,
        },
        {
          isDeleted: false,
        },
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
    // orderBy,
    select: selectFields,
  });

  return result;
};

//Create CycleChapter Services
const createCycleChapterIntoDb = async (CycleChapterImage, payload) => {
  const { cycleSubjectId, chapterId, adminId, superAdminId } = payload;

  const chapterIdsArray = [...new Set(chapterId)];

  // 1. Check if cycle subject exists with subjectId
  const existingCycleSubject = await prisma.cycleSubject.findUnique({
    where: {
      id: cycleSubjectId,
      isDeleted: false,
    },
    select: {
      subjectId: true,
    },
  });

  if (!existingCycleSubject) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid Cycle Subject: Cycle Subject does not exist.",
    );
  }

  const maxSerialRecord = await prisma.cycleSubjectChapter.aggregate({
    where: {
      cycleSubjectId: cycleSubjectId,
      isDeleted: false,
    },
    _max: {
      serial: true,
    },
  });

  const maxSerial = maxSerialRecord._max.serial ?? 0;

  const cycleSubjectSubjectId = existingCycleSubject?.subjectId;

  // 2. Fetch all chapters with subjectId to check
  const chapters = await prisma.chapter.findMany({
    where: {
      id: {
        in: chapterIdsArray,
      },
      isDeleted: false,
    },
    select: {
      id: true,
      subjectId: true,
    },
  });

  // 3. Validate if all chapters belong to the same subject
  const validChapters = chapters?.filter(
    (ch) => ch.subjectId == cycleSubjectSubjectId,
  );

  if (validChapters.length < 1) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "no valid chapters to assign");
  }

  const validChaptersArray = validChapters?.map((item) => item.id);

  // 4. Check already existing cycleSubjectChapters
  const isExistSubjectBaseChapter = await prisma.cycleSubjectChapter.findMany({
    where: {
      cycleSubjectId,
      chapterId: {
        in: validChaptersArray,
      },
      isDeleted: false,
    },
  });

  const existingChapterIds = isExistSubjectBaseChapter?.map(
    (item) => item.chapterId,
  );

  const filteredChapterIdsArray = validChaptersArray.filter(
    (id) => !existingChapterIds.includes(id),
  );

  if (filteredChapterIdsArray.length < 1) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "This Chapters already exists in this Subject",
    );
  }

  const datas = filteredChapterIdsArray?.map((chapterId, index) => ({
    cycleSubjectId,
    chapterId,
    adminId: payload?.adminId,
    serial: maxSerial + (index + 1) * 10,
  }));

  const result = await prisma.cycleSubjectChapter.createMany({
    data: datas,
    skipDuplicates: true,
  });

  //find newly created cycleSubjectChapters for log cycle look up

  const newlyCreatedChapters = await prisma.cycleSubjectChapter.findMany({
    where: {
      chapterId: {
        in: filteredChapterIdsArray,
      },
      cycleSubjectId: cycleSubjectId,
    },
    select: selectFields,
  });

  for (const el of newlyCreatedChapters) {
    const getCourse = await findCourseByCycle(el?.cycleSubject?.cycle?.id);
    await logLookUpTable(el?.id, getCourse?.id);
    await logCycleLookUpTable(el?.id, el?.cycleSubject?.cycle?.id);
  }

  //log cycle chapter
  try {
    const getCycle = await findCycleByCycleSubject(cycleSubjectId);
    const logTitle = `সাইকেল সাবজেক্ট এর নতুন চ্যাপ্টার যোগ হয়েছে`;
    const logDesc = `${getCycle?.course?.productName} কোর্সের ${getCycle?.title} সাইকেলে নতুন চ্যাপ্টার যোগ হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(
      error,
      "Error logging activity on cycle subject chapter assign",
    );
  }

  return result;
};

//Update CycleChapter Services
const updateCycleChapterIntoDb = async (
  CycleChapterId,
  CycleChapterImage,
  payload,
) => {
  const { title, adminId, superAdminId, serial } = payload;

  // 1. Get the existing cycleSubjectChapter with relation
  const existingCycleChapter = await prisma.cycleSubjectChapter.findUnique({
    where: { id: CycleChapterId, isDeleted: false },
    include: {
      cycleSubject: {
        select: {
          subjectId: true,
        },
      },
    },
  });

  if (!existingCycleChapter) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Invalid Chapter: Chapter does not exist.",
    );
  }

  // 4. Proceed to update
  const data = transformUpdatedFields(
    { cycleSubjectChapterImage: CycleChapterImage, title, serial },
    [],
  );

  //Remove Media file
  const existImageUrl = existingCycleChapter?.cycleSubjectChapterImage;
  const isUpdatedCycleSubjectChapterImage = data?.cycleSubjectChapterImage;

  // Check and delete Image URL if updated
  if (isUpdatedCycleSubjectChapterImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.cycleSubjectChapter.update({
    where: { id: CycleChapterId },
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log update cycle
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

    const getCycle = await findCycleByCycleSubjectChapter(CycleChapterId);
    const getChapter = await prisma.chapter.findFirst({
      where: {
        id: existingCycleChapter?.chapterId,
      },
    });

    const getSubject = await prisma.cycleSubject.findFirst({
      where: {
        id: existingCycleChapter?.cycleSubjectId,
      },
      select: {
        title: true,
        subject: true,
      },
    });

    const logTitle = `কোর্সের সাইকেল সাবজেক্ট-চ্যাপ্টার তথ্য পরিবর্তন হয়েছে`;
    const logDesc = `${getCycle?.course?.productName} কোর্সের ${getCycle?.title} সাইকেলের সাবজেক্ট ${getSubject?.title || getSubject?.subject?.title} এর ${getChapter?.title} চ্যাপ্টারে তথ্য পরিবর্তন হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on cycle chapter update");
  }

  return response;
};

//Delete CycleChapter Services
const deleteCycleChapterFromDb = async (CycleChapterId, payload = {}) => {
  const { superAdminId, adminId } = payload;
  const isExist = await prisma.cycleSubjectChapter.findUnique({
    where: {
      id: CycleChapterId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.NOT_FOUND, "Chapter Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.cycleSubjectChapter.update({
    where: {
      id: CycleChapterId,
    },
    data,
  });

  //log delete cycle subject chapter
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

    const getChapter = await prisma.chapter.findFirst({
      where: {
        id: isExist?.chapterId,
      },
    });

    const getCycle = await findCycleByCycleSubjectChapter(CycleChapterId);

    const logTitle = `সাইকেল সাবজেক্ট-চ্যাপ্টার ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCycle?.course?.productName} কোর্সের ${getCycle?.title} সাইকেল ${isExist?.title || getChapter?.chapterName} চ্যাপ্টার ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity delete cycle subject chapter");
  }

  return {};
};

export const CycleChapterServices = {
  GetAllInfoByCourseId,
  getSingleCycleChapterfromDb,
  getChapterBasedOnSubjectIdfromDb,
  GetAllSubjectChapterByCycle,
  createCycleChapterIntoDb,
  updateCycleChapterIntoDb,
  deleteCycleChapterFromDb,
};
