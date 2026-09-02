import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { HttpStatusCode } from "axios";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./courseAdminServiceOfferingSelection.constant.js";

//Get all CourseAdminServiceOfferingSelection Services
const getAllCourseAdminServiceOfferingSelectionfromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseAdminServiceOfferingSelection.findMany({
    where: {
      ...where,
      isDeleted: false,
      offering: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of AddOnes
  const totalCount = await prisma.courseAdminServiceOfferingSelection.count({
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

//Get single CourseAdminServiceOfferingSelection Services
const getSingleCourseAdminServiceOfferingSelectionfromDb = async (
  CourseAdminServiceOfferingSelectionId,
) => {
  const result = await prisma.courseAdminServiceOfferingSelection.findUnique({
    where: { id: CourseAdminServiceOfferingSelectionId },
    select: selectFields,
  });

  return result;
};

//Create CourseAdminServiceOfferingSelection Services
const createCourseAdminServiceOfferingSelectionIntoDb = async (
  payload = {},
) => {
  const { offeringId, selectedPriceId } = payload;

  const isExistCourseAdminServiceOfferingPrice =
    await prisma.courseAdminServiceOfferingPrice.findFirst({
      where: {
        id: selectedPriceId,
        isDeleted: false,
      },
    });

  if (!isExistCourseAdminServiceOfferingPrice) {
    throw new AppErrors(
      HttpStatusCode.NotFound,
      "Course Admin Service Offering Price not found",
    );
  }

  const isExistCourseOffering =
    await prisma.courseAdminServiceOffering.findFirst({
      where: {
        id: offeringId,
        isDeleted: false,
      },
    });

  if (!isExistCourseOffering) {
    throw new AppErrors(HttpStatusCode.NotFound, "Course Offering not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const selection = await tx.courseAdminServiceOfferingSelection.create({
      data: {
        offeringId,
        selectedPriceId,
      },
    });

    await tx.courseAdminServiceOffering.update({
      where: {
        id: offeringId,
      },
      data: {
        status: "ACCEPTED",
        decidedAt: new Date(),
      },
    });

    return selection;
  });

  // Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update CourseAdminServiceOfferingSelection Services
const updateCourseAdminServiceOfferingSelectionIntoDb = async (
  CourseAdminServiceOfferingSelectionId,
  payload = {},
) => {
  const { offeringId, selectedPriceId } = payload;

  const isExistCourseAdminServiceOfferingPrice =
    await prisma.courseAdminServiceOfferingPrice.findFirst({
      where: {
        id: selectedPriceId,
        isDeleted: false,
      },
    });

  if (!isExistCourseAdminServiceOfferingPrice) {
    throw new AppErrors(
      HttpStatusCode.NotFound,
      "Course Admin Service Offering Price not found",
    );
  }

  const isExistCourseOffering =
    await prisma.courseAdminServiceOffering.findFirst({
      where: {
        id: offeringId,
        isDeleted: false,
      },
    });

  if (!isExistCourseOffering) {
    throw new AppErrors(HttpStatusCode.NotFound, "Course Offering not found");
  }

  const updatedFields = transformUpdatedFields(
    { offeringId, selectedPriceId, selectedAt: new Date() },
    [],
  );

  // updated Database
  const result = await prisma.courseAdminServiceOfferingSelection.update({
    where: {
      id: CourseAdminServiceOfferingSelectionId,
    },
    data: updatedFields,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Delete CourseAdminServiceOfferingSelection Services
const deleteCourseAdminServiceOfferingSelectionFromDb = async (
  CourseAdminServiceOfferingSelectionId,
) => {
  const result = await prisma.courseAdminServiceOfferingSelection.update({
    where: {
      id: CourseAdminServiceOfferingSelectionId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

export const CourseAdminServiceOfferingSelectionServices = {
  getAllCourseAdminServiceOfferingSelectionfromDb,
  getSingleCourseAdminServiceOfferingSelectionfromDb,
  createCourseAdminServiceOfferingSelectionIntoDb,
  updateCourseAdminServiceOfferingSelectionIntoDb,
  deleteCourseAdminServiceOfferingSelectionFromDb,
};
