import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { HttpStatusCode } from "axios";
import {
  searchableFields,
  sortableFields,
  filterableFields,
  selectFields,
  sendResponseFields,
} from "./courseAdminServiceOfferingPrice.constant.js";
import { normalizePriceFieldsByType } from "./courseAdminServiceOfferingPrice.utlis.js";

//Get all CourseAdminOfferPrise Services
const getAllCourseAdminOfferPrisefromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseAdminServiceOfferingPrice.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of AddOnes
  const totalCount = await prisma.courseAdminServiceOfferingPrice.count({
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

//Get single CourseAdminOfferPrise Services
const getSingleCourseAdminOfferPrisefromDb = async (
  CourseAdminOfferPriseId,
) => {
  const result = await prisma.courseAdminServiceOfferingPrice.findUnique({
    where: { id: CourseAdminOfferPriseId },
    select: selectFields,
  });

  return result;
};

//Create CourseAdminOfferPrise Services
const createCourseAdminOfferPriseIntoDb = async (payload = {}) => {
  const { offeringId, type, amount, currency, minQty, maxQty, note } = payload;

  const isExistAddOnService = await prisma.courseAdminServiceOffering.findFirst(
    {
      where: {
        id: offeringId,
        isDeleted: false,
      },
    },
  );

  if (!isExistAddOnService) {
    throw new AppErrors(HttpStatusCode.NotFound, "Offer Service not found");
  }

  const tempCreationData = transformUpdatedFields(
    { offeringId, type, amount, currency, minQty, maxQty, note },
    [],
  );

  const result = await prisma.courseAdminServiceOfferingPrice.create({
    data: tempCreationData,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update CourseAdminOfferPrise Services
const updateCourseAdminOfferPriseIntoDb = async (
  CourseAdminOfferPriseId,
  payload = {},
) => {
  const { type, amount, currency, minQty, maxQty, note } = payload;

  const existing = await prisma.courseAdminServiceOfferingPrice.findFirst({
    where: { id: CourseAdminOfferPriseId },
  });

  if (!existing) {
    throw new AppErrors(HttpStatusCode.NotFound, "Price not found");
  }

  const updatedFields = normalizePriceFieldsByType(existing, {
    type,
    amount,
    currency,
    minQty,
    maxQty,
    note,
  });

  // updated Database
  const result = await prisma.courseAdminServiceOfferingPrice.update({
    where: {
      id: CourseAdminOfferPriseId,
    },
    data: updatedFields,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Delete CourseAdminOfferPrise Services
const deleteCourseAdminOfferPriseFromDb = async (CourseAdminOfferPriseId) => {
  const result = await prisma.courseAdminServiceOfferingPrice.update({
    where: {
      id: CourseAdminOfferPriseId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

export const CourseAdminOfferPriseServices = {
  getAllCourseAdminOfferPrisefromDb,
  getSingleCourseAdminOfferPrisefromDb,
  createCourseAdminOfferPriseIntoDb,
  updateCourseAdminOfferPriseIntoDb,
  deleteCourseAdminOfferPriseFromDb,
};
