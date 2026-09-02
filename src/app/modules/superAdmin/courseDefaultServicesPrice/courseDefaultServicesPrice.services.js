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
} from "./courseDefaultServicesPrice.constant.js";
import { syncIsActiveWithIsDefault } from "./courseDefaultServicesPrice.helpers.js";

//Get all courseDefaultServicePrice Services
const getAllcourseDefaultServicePricefromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseDefaultServicePrice.findMany({
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
  const totalCount = await prisma.courseDefaultServicePrice.count({
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

//Get single courseDefaultServicePrice Services
const getSinglecourseDefaultServicePricefromDb = async (
  courseDefaultServicePriceId,
) => {
  const result = await prisma.courseDefaultServicePrice.findUnique({
    where: { id: courseDefaultServicePriceId },
    select: selectFields,
  });

  return result;
};

//Create courseDefaultServicePrice Services
const createcourseDefaultServicePriceIntoDb = async (payload = {}) => {
  const {
    courseDefaultServiceId,
    type,
    amount,
    currency,
    minQty,
    maxQty,
    isDefault,
    isActive,
    note,
  } = payload;

  let isActiveAndDefault = syncIsActiveWithIsDefault({ isDefault, isActive });

  const courseDefaultService = await prisma.courseDefaultService.findFirst({
    where: {
      id: courseDefaultServiceId,
      isDeleted: false,
      isActive: true,
    },
  });

  if (!courseDefaultService) {
    throw new AppErrors(
      HttpStatusCode.NotFound,
      "Course Default Service not found",
    );
  }

  let deactivatedPricesMessage = "";

  const existingDefaults = await prisma.courseDefaultServicePrice.findMany({
    where: {
      courseDefaultServiceId,
      isDefault: true,
      isActive: true,
      isDeleted: false,
    },
  });

  if (existingDefaults.length > 0 && isActiveAndDefault.isDefault) {
    await prisma.courseDefaultServicePrice.updateMany({
      where: {
        id: { in: existingDefaults.map((p) => p.id) },
      },
      data: {
        isDefault: false,
        isActive: false,
      },
    });

    const types = existingDefaults.map((p) => p.type).join(", ");
    deactivatedPricesMessage = `Previous active/default price(s) deactivated: ${types}`;
  }

  if (existingDefaults.length === 0) {
    isActiveAndDefault.isDefault = true;
    isActiveAndDefault.isActive = true;
  }

  const tempCreationData = {
    courseDefaultServiceId,
    type,
    amount,
    currency,
    minQty,
    maxQty,
    ...isActiveAndDefault,
    note,
  };

  const result = await prisma.courseDefaultServicePrice.create({
    data: tempCreationData,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  if (deactivatedPricesMessage) {
    response.message = `${response.message || "Price created successfully"}. ${deactivatedPricesMessage}`;
  } else if (existingDefaults.length === 0) {
    response.message = `${response.message || "Price created successfully"}. This price is set as default/active.`;
  }

  return response;
};

//Update courseDefaultServicePrice Services
const updatecourseDefaultServicePriceIntoDb = async (
  courseDefaultServicePriceId,
  payload = {},
) => {
  const { type, amount, currency, minQty, maxQty, note, isDefault, isActive } =
    payload;

  let updatedFields = transformUpdatedFields(
    { type, amount, currency, minQty, maxQty, note, isDefault, isActive },
    [],
  );
  updatedFields = syncIsActiveWithIsDefault(updatedFields);

  let deactivatedPricesMessage = "";

  if (updatedFields.isDefault) {
    const currentPrice = await prisma.courseDefaultServicePrice.findUnique({
      where: { id: courseDefaultServicePriceId },
    });

    if (!currentPrice) {
      throw new AppErrors(
        HttpStatusCode.NotFound,
        "Course Default Service Price not found",
      );
    }

    const existingDefaults = await prisma.courseDefaultServicePrice.findMany({
      where: {
        courseDefaultServiceId: currentPrice.courseDefaultServiceId,
        isDefault: true,
        isActive: true,
        isDeleted: false,
        NOT: { id: courseDefaultServicePriceId },
      },
    });

    if (existingDefaults.length > 0) {
      await prisma.courseDefaultServicePrice.updateMany({
        where: {
          id: { in: existingDefaults.map((p) => p.id) },
        },
        data: {
          isDefault: false,
          isActive: false,
        },
      });

      const types = existingDefaults?.map((p) => p.type).join(", ");
      deactivatedPricesMessage = `Previous active/default price(s) deactivated: ${types}`;
    }
  }

  const result = await prisma.courseDefaultServicePrice.update({
    where: { id: courseDefaultServicePriceId },
    data: updatedFields,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  if (deactivatedPricesMessage) {
    response.message = `${response.message || "Price updated successfully"}. ${deactivatedPricesMessage}`;
  }

  return response;
};

//Delete courseDefaultServicePrice Services
const deletecourseDefaultServicePriceFromDb = async (
  courseDefaultServicePriceId,
) => {
  const result = await prisma.courseDefaultServicePrice.update({
    where: {
      id: courseDefaultServicePriceId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

export const courseDefaultServicePriceServices = {
  getAllcourseDefaultServicePricefromDb,
  getSinglecourseDefaultServicePricefromDb,
  createcourseDefaultServicePriceIntoDb,
  updatecourseDefaultServicePriceIntoDb,
  deletecourseDefaultServicePriceFromDb,
};
