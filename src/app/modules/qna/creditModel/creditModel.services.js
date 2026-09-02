import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { Enums } from "../../../constant/enums.js";

const createCreditModel = async (payload) => {
  const { perQuoraCredit, asgshop, solver } = payload;

  const createModel = await prisma.creditModel.create({
    data: {
      perQuoraCredit,
      asgshop,
      solver,
    },
  });

  return createModel;
};

const getCreditModel = async () => {
  const getLatestCreditModel = await prisma.creditModel.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });
  return getLatestCreditModel;
};

export const creditModelService = {
  createCreditModel,
  getCreditModel,
};
