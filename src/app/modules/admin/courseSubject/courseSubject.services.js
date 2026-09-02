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
} from "./courseSubject.constants.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { logLookUpTable } from "../../../middleware/handleCourseAuth.js";
import config from "../../../config/index.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

const getAllCourseSubject = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.courseSubject.findMany({
    where: {
      ...where,
      isDeleted: false,
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
    skip,
    take,
    select: selectFields,
  });

  const totalCount = await prisma.courseSubject.count({
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

const getCourseSubjectById = async (id) => {
  const isExistCourseSubject = await prisma.courseSubject.findUnique({
    where: {
      id,
    },
  });

  if (!isExistCourseSubject)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Not found!");

  const result = await prisma.courseSubject.findFirst({
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

const getAllSubjectsByCourseId = async (id, query = {}, hostname) => {
  const isExistCourse = await prisma.course.findUnique({
    where: {
      id,
    },
  });

  if (!isExistCourse)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course not Found!");

  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const customOrderBy =
    hostname === config?.frb_host_name ||
    hostname === config?.frb_local_host_name
      ? [{ serial: "asc" }, { createdAt: "asc" }]
      : hostname === config?.varsity_host_name ||
          hostname === config?.admission_host_name
        ? [{ serial: "asc" }, { createdAt: "asc" }]
        : [
            { serial: "asc" },
            {
              subject: {
                title: "asc",
              },
            },
          ];

  const result = await prisma.courseSubject.findMany({
    where: {
      AND: [
        {
          courseId: id,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy: customOrderBy,
    select: selectFields,
  });

  return result;
};

// const courseSubjectCreate = async (payload) => {
//   const { adminId, courseId, subjectId } = payload;
//   const subjectIdsArray = [...new Set(subjectId)];
//   // console.log(courseId);
//   const existsCourse = await prisma.course.findUnique({
//     where: {
//       id: courseId,
//       isDeleted: false,
//     },
//   });

//   if (!existsCourse) {
//     throw new AppErrors(
//       StatusCodes.NOT_FOUND,
//       "Invalid course: course not exists."
//     );
//   }

//   const isExistCourseBaseSubject = await prisma.courseSubject.findMany({
//     where: {
//       courseId,
//       subjectId: {
//         in: subjectIdsArray,
//       },
//       isDeleted: false,
//     },
//   });

//   const existingSubjectIds = isExistCourseBaseSubject?.map(
//     (item) => item.subjectId
//   );

//   const filteredSubjectIdsArray = subjectIdsArray.filter(
//     (id) => !existingSubjectIds.includes(id)
//   );

//   if (filteredSubjectIdsArray.length < 1) {
//     throw new AppErrors(
//       StatusCodes.BAD_REQUEST,
//       "This Subjects Already added to this Course"
//     );
//   }

//   const data = filteredSubjectIdsArray?.map((subjectId) => ({
//     courseId,
//     subjectId,
//     adminId,
//   }));

//   console.log(data);

//   const result = await prisma.courseSubject.createMany({
//     data,
//     skipDuplicates: true,
//   });

//   await Promise.all(
//     data.map(async (theSubject) => {
//       const getChaptersForSubject = await prisma.chapter.findMany({
//         where: {
//           subjectId: theSubject.subjectId,
//         },
//       });

//       const subjectChapterData = getChaptersForSubject.map((el) => ({
//         courseSubjectId: theSubject.id,
//         chapterId: el.id,
//       }));

//       return prisma.courseSubjectChapter.createMany({
//         data: subjectChapterData,
//         skipDuplicates: true,
//       });
//     })
//   );

//   return result;
// };

const courseSubjectCreate = async (payload) => {
  const { adminId, superAdminId, courseId, subjectId } = payload;
  const subjectIdsArray = [...new Set(subjectId)]; // remove duplicates

  // 1️⃣ Validate course exists
  const existsCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });

  const getLastSerial = await prisma.courseSubject.aggregate({
    where: {
      courseId: courseId,
      isDeleted: false,
    },
    _max: {
      serial: true,
    },
  });

  const lastSerial = getLastSerial._max.serial ?? 0;

  if (!existsCourse) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Invalid course: course not exists.",
    );
  }

  // 2️⃣ Find already-linked subjects for this course
  const isExistCourseBaseSubject = await prisma.courseSubject.findMany({
    where: {
      courseId,
      subjectId: {
        in: subjectIdsArray,
      },
      isDeleted: false,
    },
  });

  const existingSubjectIds = isExistCourseBaseSubject.map(
    (item) => item.subjectId,
  );

  // 3️⃣ Filter out already-added subjects
  const filteredSubjectIdsArray = subjectIdsArray.filter(
    (id) => !existingSubjectIds.includes(id),
  );

  if (filteredSubjectIdsArray.length < 1) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "These subjects are already added to this course",
    );
  }

  // 4️⃣ Insert new courseSubject rows
  await prisma.courseSubject.createMany({
    data: filteredSubjectIdsArray.map((subjectId, index) => ({
      courseId,
      subjectId,
      adminId,
      serial: lastSerial + (index + 1) * 10, //add serial and keep gap of 10
    })),
    skipDuplicates: true,
  });

  // 5️⃣ Fetch the newly created courseSubjects with IDs
  const createdCourseSubjects = await prisma.courseSubject.findMany({
    where: {
      courseId,
      subjectId: { in: filteredSubjectIdsArray },
      isDeleted: false,
    },
    select: {
      id: true,
      subjectId: true,
    },
  });

  // 6️⃣ For each courseSubject, fetch its chapters & prepare linking data
  for (const courseSubject of createdCourseSubjects) {
    //upsert to course lookup
    await logLookUpTable(courseSubject?.id, existsCourse?.id);

    const getChaptersForSubject = await prisma.chapter.findMany({
      where: {
        subjectId: courseSubject.subjectId,
      },
      select: {
        id: true,
      },
    });

    if (getChaptersForSubject.length > 0) {
      const subjectChapterData = getChaptersForSubject.map(
        (chapter, index) => ({
          courseSubjectId: courseSubject.id,
          chapterId: chapter.id,
          serial: lastSerial + (index + 1) * 10, //new for serial. gap 10
        }),
      );

      await prisma.courseSubjectChapter.createMany({
        data: subjectChapterData,
        skipDuplicates: true,
      });

      const courseSubjectArray = subjectChapterData?.map(
        (el) => el?.courseSubjectId,
      );

      const getNewlyCourseSubjectChapter =
        await prisma.courseSubjectChapter.findMany({
          where: {
            courseSubjectId: { in: courseSubjectArray },
          },
          select: {
            id: true,
          },
        });

      for (const el of getNewlyCourseSubjectChapter) {
        await logLookUpTable(el?.id, courseId);
      }

      // const newCourseSubjectChapterData = getNewlyCourseSubjectChapter?.map(
      //   (el) => {
      //     return {
      //       entityId: el?.id,
      //       courseId: courseId,
      //     };
      //   }
      // );
    }
  }

  //log course subject addition
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
    const logTitle = `কোর্স এ নতুন সাবজেক্ট যোগ করা হয়েছে`;
    const logDesc = `${creatorName} দ্বারা ${existsCourse?.productFullName} কোর্সে নতুন সাবজেক্ট যোগ করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on course subject assign");
  }

  return {
    addedSubjectsCount: filteredSubjectIdsArray.length,
    courseSubjects: createdCourseSubjects,
  };
};

const updateCouseSubject = async (
  courseSubjectId,
  courseSubjectImage,
  payload,
) => {
  const { title, adminId, superAdminId, serial } = payload;
  const isExist = await prisma.courseSubject.findUnique({
    where: {
      id: courseSubjectId,
      isDeleted: false,
    },
  });
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Subject Not Found");

  const data = transformUpdatedFields(
    {
      title,
      courseSubjectImage,
      serial,
    },
    [],
  );
  const existImageUrl = isExist?.courseSubjectImage;
  const isUpdatedImage = data?.courseSubjectImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.courseSubject.update({
    where: {
      id: courseSubjectId,
    },
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

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
    const getSubject = await prisma.subject.findFirst({
      where: {
        id: isExist?.subjectId,
      },
    });
    const logTitle = `কোর্স এর সাবজেক্ট-চ্যাপ্টার এর তথ্য পরিবর্তন করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productFullName} কোর্সের ${isExist?.title || getSubject?.title} সাবজেক্ট এর তথ্য পরিবর্তন করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity in update course subject");
  }

  return response;
};

const deleteCourseSubject = async (courseSubjectId, payload = {}) => {
  const { adminId, superAdminId } = payload;

  const isExist = await prisma.courseSubject.findUnique({
    where: {
      id: courseSubjectId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Subject Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.courseSubject.update({
    where: {
      id: courseSubjectId,
    },
    data,
  });

  const softDeleteAllCourseSubjectChapter =
    await prisma.courseSubjectChapter.updateMany({
      where: {
        courseSubjectId: isExist?.id,
      },
      data: {
        isDeleted: true,
      },
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

    const getCourse = await prisma.course.findFirst({
      where: {
        id: isExist?.courseId,
      },
    });

    const getSubject = await prisma.subject.findFirst({
      where: {
        id: isExist?.subjectId,
      },
    });

    const logTitle = `কোর্স থেকে সাবজেক্ট অপসারণ করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productFullName} কোর্স থেকে ${isExist?.title || getSubject?.title} সাবজেক্ট অপসারণ করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on delete course subject");
  }

  return {};
};

export const courseSubjectService = {
  courseSubjectCreate,
  getAllCourseSubject,
  getCourseSubjectById,
  getAllSubjectsByCourseId,
  updateCouseSubject,
  deleteCourseSubject,
};
