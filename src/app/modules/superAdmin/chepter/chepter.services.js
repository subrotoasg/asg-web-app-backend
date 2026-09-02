import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./chepter.constants.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

//Get all Chepter Services
const getAllChepterfromDb = async (query = {}) => {
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.chapter.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of courses
  const totalCount = await prisma.chapter.count({
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

//Get single Chepter Services
const getSingleChepterfromDb = async (chapterId) => {
  const isExist = await prisma.chapter.findUnique({
    where: {
      id: chapterId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Chapter Not Found");

  const result = await prisma.chapter.findFirst({
    where: {
      AND: [
        {
          id: chapterId,
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

//Get Subject ID Based all Chepter Services
const getChepterBasedOnSubjectIdfromDb = async (subjectId, query = {}) => {
  const isExist = await prisma.chapter.findFirst({
    where: {
      subjectId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Chapter Not Found");

  //For Sorting  query
  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.chapter.findMany({
    where: {
      AND: [
        {
          subjectId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy,
    select: selectFields,
  });
  return result;
};

//Create Chepter Services
const createChepterIntoDb = async (chapterImage, payload) => {
  const { chapterName, chapterNo, subjectId, superAdminId } = payload;

  //checking Existing Subject id
  const existingSubject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!existingSubject) {
    throw new AppErrors("Invalid subjectId: Subject does not exist.");
  }

  const data = {
    chapterName,
    chapterNo,
    subjectId,
    chapterImage,
  };

  const result = await prisma.chapter.create({
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const logTitle = `নতুন চ্যাপ্টার তৈরি করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email}, ${existingSubject?.title} সাবজেক্টে নতুন চ্যাপ্টার ${chapterName} তৈরি করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on chapter add");
  }

  return response;
};

//Update Chepter Services
const updateChepterIntoDb = async (chapterId, chapterImage, payload) => {
  const { chapterName, chapterNo, superAdminId } = payload;

  const isExistChapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
    },
  });

  if (!isExistChapter) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Chapter Not Found");
  }

  //updated fields
  const data = transformUpdatedFields(
    {
      chapterName,
      chapterNo,
      chapterImage,
    },
    [],
  );

  const existImageUrl = isExistChapter?.chapterImage;
  const isUpdatedImage = data?.chapterImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.chapter.update({
    where: {
      id: chapterId,
    },
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });
    const logTitle = `চ্যাপ্টার এর তথ্য আপডেট করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email} ${isExistChapter?.chapterName} এর তথ্য আপডেট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update chapter");
  }

  return response;
};

//Delete Chepter Services
const deleteChepterFromDb = async (ChapterId, payload = {}) => {
  const isExist = await prisma.chapter.findUnique({
    where: {
      id: ChapterId,
    },
  });

  const { superAdminId } = payload;

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Chapter Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.chapter.update({
    where: {
      id: ChapterId,
    },
    data,
  });

  //logging delete chapter
  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });
    const logTitle = `চ্যাপ্টার এর তথ্য ডিলিট করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email} চ্যাপ্টার ${isExist?.chapterName} এর তথ্য ডিলিট করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity in delete chapter");
  }

  return {};
};

export const ChepterServices = {
  getAllChepterfromDb,
  getSingleChepterfromDb,
  getChepterBasedOnSubjectIdfromDb,
  createChepterIntoDb,
  updateChepterIntoDb,
  deleteChepterFromDb,
};
