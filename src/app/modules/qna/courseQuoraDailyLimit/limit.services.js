import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { Enums } from "../../../constant/enums.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
} from "./limit.constants.js";

const createDailyLimitModel = async (payload) => {
  const { dailyLimit, courseId } = payload;

  const checkAlreadyLimit = await prisma.courseQuoraDailyLimit.findFirst({
    where: {
      courseId: courseId,
    },
  });

  if (checkAlreadyLimit) return {};

  const createALimitModel = await prisma.courseQuoraDailyLimit.create({
    data: {
      courseId: courseId,
      dailyLimit: dailyLimit,
      lastLimit: dailyLimit,
    },
  });

  return createALimitModel;
};

const getCourseQuoraDailyLimit = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields
  );

  const result = await prisma.courseQuoraDailyLimit.findMany({
    where: {
      ...where,
    },
    skip,
    take,
    orderBy,
    select: selectFields,
  });

  const totalCount = await prisma.courseQuoraDailyLimit.count({
    where: {
      ...where,
    },
  });

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

const updateDailyLimitModel = async (id, payload) => {
  const { dailyLimit } = payload;

  const result = await prisma.$transaction(async (tx) => {
    const updateLimit = await tx.courseQuoraDailyLimit.update({
      where: {
        id,
      },
      data: {
        dailyLimit: dailyLimit,
        lastLimit: dailyLimit,
      },
    });
    return updateLimit;
  });
  return result;
};

export const courseQuoraDailyLimitService = {
  createDailyLimitModel,
  getCourseQuoraDailyLimit,
  updateDailyLimitModel,
};
