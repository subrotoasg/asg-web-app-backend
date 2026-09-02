import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./cycleSubject.constants.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  findCourseByCycle,
  findCycleByCycleSubject,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

//Get all CycleSubject Services
const getAllCycleSubjectfromDb = async (query = {}) => {
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.cycleSubject.findMany({
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

  // total count of cycleSubject
  const totalCount = await prisma.cycleSubject.count({
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

//Get single CycleSubject Services
const getSingleCycleSubjectfromDb = async (CycleSubjectId) => {
  const isExistCycleSubject = await prisma.cycleSubject.findUnique({
    where: {
      id: CycleSubjectId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExistCycleSubject)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Cycle Subject  Not Found");

  const result = await prisma.cycleSubject.findFirst({
    where: {
      AND: [
        {
          id: CycleSubjectId,
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

//Get all subject based On the Cycle Id
const getSubjectBasedOnCycleIdfromDb = async (cycleId, query = {}) => {
  const isExistCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExistCycle)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Cycle Not Found");

  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.cycleSubject.findMany({
    where: {
      AND: [
        {
          cycleId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy: [
      { serial: "asc" },
      {
        subject: {
          title: "asc",
        },
      },
    ],
    select: selectFields,
  });

  return result;
};

const GetCourseBasedCycleSubject = async (courseId, query = {}) => {
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
      courseId: courseId,
      isDeleted: false,
    },
  });

  const cycles = getCycles.map((item) => item.id);

  const result = await prisma.cycleSubject.findMany({
    where: {
      ...where,
      cycleId: { in: cycles },
      isDeleted: false,
    },
    skip,
    take,
    orderBy: [{ serial: "asc" }, { createdAt: "desc" }],
    // orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.cycleSubject.count({
    where: {
      ...where,
      cycleId: { in: cycles },
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

//Create CycleSubject Services
const createCycleSubjectIntoDb = async (CycleSubjectImage, payload) => {
  const { cycleId, subjectId, adminId, superAdminId } = payload;

  //Remove duplicate Subject Id
  const subjectIdsArray = [...new Set(subjectId)];

  // 1. Check if cycle exists
  const existingCycle = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
      isDeleted: false,
    },
  });

  if (!existingCycle) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid Cycle: Cycle does not exist.",
    );
  }

  const maxSerialRecord = await prisma.cycleSubject.aggregate({
    where: {
      cycleId: cycleId,
      isDeleted: false,
    },
    _max: {
      serial: true,
    },
  });

  const maxSerial = maxSerialRecord._max.serial ?? 0;

  // 2. Find existing subject IDs already added in this cycle
  const isExistCycleBaseSubject = await prisma.cycleSubject.findMany({
    where: {
      cycleId,
      subjectId: {
        in: subjectIdsArray,
      },
      isDeleted: false,
    },
  });

  // 3. Remove subject IDs that already exist in this cycle
  const existingSubjectIds = isExistCycleBaseSubject?.map(
    (item) => item.subjectId,
  );
  const filteredSubjectIdsArray = subjectIdsArray.filter(
    (id) => !existingSubjectIds.includes(id),
  );

  if (filteredSubjectIdsArray.length < 1) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "This Subject Already added in this cycle",
    );
  }

  //Subject Id array to subject creation
  const datas = filteredSubjectIdsArray?.map((subjectId, index) => ({
    cycleId,
    subjectId,
    adminId,
    serial: maxSerial + (index + 1) * 10,
  }));

  const result = await prisma.cycleSubject.createMany({
    data: datas,
    skipDuplicates: true,
  });

  //fetch the newly created cycle Subject with ids
  const createdCycleSubjects = await prisma.cycleSubject.findMany({
    where: {
      cycleId,
      subjectId: { in: filteredSubjectIdsArray },
      isDeleted: false,
    },
    select: {
      id: true,
      subjectId: true,
    },
  });

  for (const cycleSubject of createdCycleSubjects) {
    //upsert cycleSubject with cycle
    const getCourse = await findCourseByCycle(cycleId);
    await logLookUpTable(cycleSubject?.id, getCourse?.id);
    await logCycleLookUpTable(cycleSubject?.id, existingCycle?.id);
  }

  //log cycle subject assign
  try {
    const getCourse = await findCourseByCycle(cycleId);
    const logTitle = `সাইকেল এ নতুন সাবজেক্ট যোগ করা হয়েছ`;
    const logDesc = `${getCourse?.productName} কোর্সের ${existingCycle?.title} সাইকেল এ নতুন সাবজেক্ট যোগ করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on cycle subject assign");
  }

  return result;
};

//Update CycleSubject Services
const updateCycleSubjectIntoDb = async (
  CycleSubjectId,
  CycleSubjectImage,
  payload,
) => {
  const { subjectId, isDeleted, title, superAdminId, adminId, serial } =
    payload;

  //checking Existing Subject
  const existingSubject = await prisma.cycleSubject.findFirst({
    where: { id: CycleSubjectId, isDeleted: false },
  });

  if (!existingSubject) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid Subject: Subject does not exist.",
    );
  }

  //updated fields
  const data = transformUpdatedFields(
    {
      cycleSubjectImage: CycleSubjectImage,
      subjectId,
      title,
      isDeleted,
      serial,
    },
    [],
  );

  const existImageUrl = existingSubject?.cycleSubjectImage;
  const isUpdatedImage = data?.cycleSubjectImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.cycleSubject.update({
    where: {
      id: CycleSubjectId,
      isDeleted: false,
    },
    data,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log cycle subject update
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
    const getSubject = await prisma.subject.findFirst({
      where: {
        id: existingSubject?.subjectId,
      },
    });
    const getCycle = await findCycleByCycleSubject(CycleSubjectId);
    const logTitle = `কোর্সের সাইকেলে সাবজেক্টের তথ্য পরিবর্তন হয়েছে`;
    const logDesc = `${creatorName}, ${getCycle?.course?.productName} কোর্সের ${getCycle?.title} এর ${getSubject?.title || existingSubject?.title} সাবজেক্টের তথ্য পরিবর্তন করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update cycle subject info");
  }

  return response;
};

//Delete CycleSubject Services
const deleteCycleSubjectFromDb = async (CycleSubjectId, payload = {}) => {
  const { adminId, superAdminId } = payload;

  const isExist = await prisma.cycleSubject.findUnique({
    where: {
      id: CycleSubjectId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Subject Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.cycleSubject.update({
    where: {
      id: CycleSubjectId,
    },
    data,
  });

  //logging delete cycle subject
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
    const getSubject = await prisma.subject.findFirst({
      where: {
        id: isExist?.subjectId,
      },
    });

    const getCycle = await findCycleByCycleSubject(CycleSubjectId);
    const logTitle = `কোর্সের সাইকেলের সাবজেক্ট ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCycle?.course?.productName} কোর্সের ${getCycle?.title} এর ${isExist?.title || getSubject?.title} সাবজেক্ট ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on delete cycle subject");
  }

  return {};
};

export const CycleSubjectServices = {
  getAllCycleSubjectfromDb,
  GetCourseBasedCycleSubject,
  getSingleCycleSubjectfromDb,
  getSubjectBasedOnCycleIdfromDb,
  createCycleSubjectIntoDb,
  updateCycleSubjectIntoDb,
  deleteCycleSubjectFromDb,
};
