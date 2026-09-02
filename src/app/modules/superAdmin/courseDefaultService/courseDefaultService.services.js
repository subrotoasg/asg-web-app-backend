import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./courseDefaultService.constant.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { HttpStatusCode } from "axios";

//Get all CourseDefaultService Services
const getAllCourseDefaultServicefromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseDefaultService.findMany({
    where: {
      ...where,
      isDeleted: false,
      isActive: true,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of AddOnes
  const totalCount = await prisma.courseDefaultService.count({
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

//Get single CourseDefaultService Services
const getSingleCourseDefaultServicefromDb = async (CourseDefaultServiceId) => {
  const result = await prisma.courseDefaultService.findUnique({
    where: { id: CourseDefaultServiceId },
    select: selectFields,
  });

  return result;
};

//Create CourseDefaultService Services
const createCourseDefaultServiceIntoDb = async (payload = {}) => {
  const { courseId, serviceId } = payload;
  const isExistCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });

  if (!isExistCourse) {
    throw new AppErrors(HttpStatusCode.NotFound, "Course not found");
  }
  const isExistAddOneService = await prisma.addOnService.findFirst({
    where: {
      id: serviceId,
      isDeleted: false,
    },
  });

  if (!isExistAddOneService) {
    throw new AppErrors(HttpStatusCode.NotFound, "Add one Service not found");
  }

  const result = await prisma.courseDefaultService.create({
    data: {
      courseId,
      serviceId,
    },
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update CourseDefaultService Services
const updateCourseDefaultServiceIntoDb = async (
  CourseDefaultServiceId,
  payload = {},
) => {
  const { isActive, serviceId } = payload;
  const updatedFields = transformUpdatedFields({ isActive, serviceId }, []);

  // updated Database
  const result = await prisma.courseDefaultService.update({
    where: {
      id: CourseDefaultServiceId,
    },
    data: updatedFields,
  });

  return { isActive: result.isActive };
};

//Delete CourseDefaultService Services
const deleteCourseDefaultServiceFromDb = async (CourseDefaultServiceId) => {
  const result = await prisma.courseDefaultService.update({
    where: {
      id: CourseDefaultServiceId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

export const CourseDefaultServiceServices = {
  getAllCourseDefaultServicefromDb,
  getSingleCourseDefaultServicefromDb,
  createCourseDefaultServiceIntoDb,
  updateCourseDefaultServiceIntoDb,
  deleteCourseDefaultServiceFromDb,
};
