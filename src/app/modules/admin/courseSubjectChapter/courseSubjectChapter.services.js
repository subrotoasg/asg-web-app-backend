import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./courseSubjectChapter.constants.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  findCourseByCourseSubject,
  findCourseByCourseSubjectChapter,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

const getAllCourseSubjectChapter = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.courseSubjectChapter.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
    // orderBy,
    skip,
    take,
    select: selectFields,
  });

  const totalCount = await prisma.courseSubjectChapter.count({
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

const getAllSubjectChapterByCourse = async (courseId, query = {}) => {
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

  const getSubjects = await prisma.courseSubject.findMany({
    where: {
      courseId: courseId,
      isDeleted: false,
    },
  });

  const subjects = getSubjects.map((item) => item.id);

  const result = await prisma.courseSubjectChapter.findMany({
    where: {
      ...where,
      courseSubjectId: { in: subjects },
      isDeleted: false,
    },
    skip,
    take,
    orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
    // orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.courseSubjectChapter.count({
    where: {
      ...where,
      courseSubjectId: { in: subjects },
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

const getCourseSubjectChapterById = async (id) => {
  const isExistCourseSubjectChapter =
    await prisma.courseSubjectChapter.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });

  if (!isExistCourseSubjectChapter)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Not found!");

  const result = await prisma.courseSubjectChapter.findFirst({
    where: {
      AND: [
        {
          id,
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

const getAllChaptersByCourseSubjectId = async (id, query = {}) => {
  const isExistCourse = await prisma.courseSubject.findUnique({
    where: {
      id,
    },
  });

  if (!isExistCourse)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Subject not Found!");

  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.courseSubjectChapter.findMany({
    where: {
      AND: [
        {
          courseSubjectId: id,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy: {
      chapter: {
        chapterNo: "asc",
      },
    },
    select: selectFields,
  });

  const sorted = result.sort(
    (a, b) => Number(a.chapter.chapterNo) - Number(b.chapter.chapterNo),
  );

  return sorted;
};

const courseSubjectChapterCreate = async (payload) => {
  const { courseSubjectId, chapterId, adminId, superAdminId } = payload;
  const chapterIdArray = [...new Set(chapterId)];

  const isExistCourseSubject = await prisma.courseSubject.findUnique({
    where: {
      id: courseSubjectId,
      isDeleted: false,
    },
  });

  if (!isExistCourseSubject) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Invalid CourseSubject: courseSubject not exists.",
    );
  }

  const maxSerialRecord = await prisma.courseSubjectChapter.aggregate({
    where: {
      courseSubjectId: courseSubjectId,
      isDeleted: false,
    },
    _max: {
      serial: true,
    },
  });

  const maxSerial = maxSerialRecord._max.serial ?? 0;

  const existingChaptersWithCourseSubjectId =
    await prisma.courseSubjectChapter.findMany({
      where: {
        courseSubjectId,
        isDeleted: false,
      },
    });

  const existingchapterIdArray = existingChaptersWithCourseSubjectId?.map(
    (item) => item.chapterId,
  );

  // console.log("existing chaptes in that CourseSubject", existingchapterIdArray);

  const filterChapterIdArray = chapterIdArray.filter(
    (item) => !existingchapterIdArray.includes(item),
  );

  // console.log("after filtering ", filterChapterIdArray);

  if (filterChapterIdArray.length < 1)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "chapters already exists.");

  const existingChapterInSubject = await prisma.chapter.findMany({
    where: {
      subjectId: isExistCourseSubject.subjectId,
    },
  });

  const chapterArray = existingChapterInSubject.map((item) => item.id);

  // console.log("chapters in that subject", chapterArray);

  const againFilterChapterIdArray = filterChapterIdArray.filter((item) =>
    chapterArray.includes(item),
  );

  if (againFilterChapterIdArray.length < 1)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Chapters already exists!");

  // console.log("filtered chapters again", againFilterChapterIdArray);

  const data = againFilterChapterIdArray?.map((chapterId, index) => ({
    chapterId,
    courseSubjectId,
    serial: maxSerial + (index + 1) * 10,
  }));

  const result = await prisma.courseSubjectChapter.createMany({
    data,
    skipDuplicates: true,
  });

  const getCourse = await findCourseByCourseSubject(courseSubjectId);

  for (const el of data) {
    const getCourseSubjectChapter = await prisma.courseSubjectChapter.findFirst(
      {
        where: {
          courseSubjectId: el?.courseSubjectId,
          chapterId: el?.chapterId,
        },
      },
    );
    //upsert to course lookup
    await logLookUpTable(getCourseSubjectChapter?.id, getCourse?.id);
  }

  //log course subject chapter assign
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

    const logTitle = `কোর্সের সাবজেক্টএ চ্যাপ্টার এসাইন করা হয়েছে`;
    const logDesc = `${creatorName}, ${getCourse?.productName} কোর্সে নতুন চ্যাপ্টার এসাইন করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(
      error,
      "Error logging activity on course subject chapter create",
    );
  }

  // console.log(result);

  return result;
};

const updateCourseSubjectChapter = async (
  courseSubjectChapterId,
  courseSubjectChapterImage,
  payload,
) => {
  const { title, superAdminId, adminId, serial } = payload;
  const isExist = await prisma.courseSubjectChapter.findUnique({
    where: {
      id: courseSubjectChapterId,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Course Subject Chapter Not Found",
    );

  const data = transformUpdatedFields(
    {
      title,
      courseSubjectChapterImage,
      serial,
    },
    [],
  );

  const existImageUrl = isExist?.courseSubjectChapterImage;
  const isUpdatedImage = data?.courseSubjectChapterImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.courseSubjectChapter.update({
    where: {
      id: courseSubjectChapterId,
    },
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log course subject chapter edit
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
    const getCourse = await findCourseByCourseSubjectChapter(
      courseSubjectChapterId,
    );

    const getChapter = await prisma.chapter.findFirst({
      where: {
        id: isExist?.chapterId,
      },
    });

    const logTitle = `কোর্সে সাবজেক্ট-চ্যাপ্টার তথ্য পরিবর্তন করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের সাবজেক্ট-চ্যাপ্টার(${isExist?.title || getChapter?.title}) তথ্য পরিবর্তন করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(
      error,
      "Error logging activity on update course subject chapter",
    );
  }

  return response;
};

const deleteCourseSubjectChapter = async (
  courseSubjectChapterId,
  payload = {},
) => {
  const { superAdminId, adminId } = payload;

  const isExist = await prisma.courseSubjectChapter.findUnique({
    where: {
      id: courseSubjectChapterId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Course Subject Chapter Not Found",
    );

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.courseSubjectChapter.update({
    where: {
      id: courseSubjectChapterId,
    },
    data,
  });

  //log delete course subject chapter
  try {
    const getCourse = await findCourseByCourseSubjectChapter(
      courseSubjectChapterId,
    );

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

    const chapterInfo = await prisma.chapter.findFirst({
      where: {
        id: isExist?.chapterId,
      },
    });

    const logTitle = `কোর্সের সাবজেক্ট-চ্যাপ্টার তথ্য ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} কোর্স ${getCourse?.productName} এর ${chapterInfo?.title || isExist?.title} চ্যাপ্টার এর তথ্য ডিলিট করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(
      error,
      "Error logging activity on course subject chapter delete",
    );
  }

  return {};
};

export const courseSubjectChapterService = {
  courseSubjectChapterCreate,
  getAllCourseSubjectChapter,
  getAllSubjectChapterByCourse,
  getCourseSubjectChapterById,
  getAllChaptersByCourseSubjectId,
  updateCourseSubjectChapter,
  deleteCourseSubjectChapter,
};
