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
} from "./subject.constants.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

//Get all Subject Services
const getAllSubjectfromDb = async (query = {}) => {
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.subject.findMany({
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
  const totalCount = await prisma.subject.count({
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

//Get single subject Services
const getSingleSubjectfromDb = async (subjectId) => {
  const isExist = await prisma.subject.findUnique({
    where: {
      id: subjectId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Subject Not Found");

  const result = await prisma.subject.findFirst({
    where: {
      AND: [
        {
          id: subjectId,
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

//Create Subject Services
const createSubjectIntoDb = async (subjectImage, payload) => {
  const { title, superAdminId } = payload;

  const data = {
    title,
    superAdminId,
    subjectImage,
  };

  const result = await prisma.subject.create({
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log subject creation
  try {
    const superAdminInfo = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const logTitle = `নতুন সাবজেক্ট যোগ করা হয়েছে`;
    const logDesc = `${superAdminInfo?.name} নতুন সাবজেক্ট "${title}" যোগ করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity adding subject");
  }

  return response;
};

//Update Subject Services
const updateSubjectIntoDb = async (SubjectId, subjectImage, payload) => {
  const { title, superAdminId } = payload;

  const isExist = await prisma.subject.findUnique({
    where: {
      id: SubjectId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Subject Not Found");

  //updated fields
  const data = transformUpdatedFields(
    {
      title,
      subjectImage,
    },
    [],
  );

  const existImageUrl = isExist?.subjectImage;
  const isUpdatedImage = data?.subjectImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.subject.update({
    where: {
      id: SubjectId,
    },
    data,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log subject update
  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });
    const logTitle = `সাবজেক্ট এর তথ্য আপডেট হয়েছে`;
    const logDesc = `${getSuperAdmin?.email} "${isExist?.title}" সাবজেক্ট এর তথ্য আপডেট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity subject update");
  }

  return response;
};

//Delete Subject Services
const deleteSubjectFromDb = async (SubjectId, payload = {}) => {
  const { superAdminId } = payload;
  const isExist = await prisma.subject.findUnique({
    where: {
      id: SubjectId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Subject Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.subject.update({
    where: {
      id: SubjectId,
    },
    data,
  });

  //log subject delete
  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const logTitle = `সাবজেক্ট ডিলিট করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email}, সাবজেক্ট "${isExist?.title}" ডিলিট করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on subject delete");
  }

  return {};
};

export const SubjectServices = {
  getAllSubjectfromDb,
  getSingleSubjectfromDb,
  createSubjectIntoDb,
  updateSubjectIntoDb,
  deleteSubjectFromDb,
};
