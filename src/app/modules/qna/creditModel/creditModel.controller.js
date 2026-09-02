import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { creditModelService } from "./creditModel.services.js";

//Create Class controllre
const createCreditModel = catchAsync(async (req, res) => {
  let bodyData = { ...req?.body, ...req?.user };

  const result = await creditModelService.createCreditModel(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "quora credit model set successfully",
    data: result,
  });
});

const getCreditModel = catchAsync(async (req, res) => {
  const result = await creditModelService.getCreditModel();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "quora credit model retrieved successfully",
    data: result,
  });
});

export const creditModelController = {
  createCreditModel,
  getCreditModel,
};
