import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { courseQuoraDailyLimitService } from "./limit.services.js";
import { pickQueryFields } from "./limit.constants.js";

//Create Class controllre
const createDailyLimitModel = catchAsync(async (req, res) => {
  let bodyData = { ...req?.body, ...req?.user };

  const result =
    await courseQuoraDailyLimitService.createDailyLimitModel(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "course quora daily limit set successfully",
    data: result,
  });
});

const getCourseQuoraDailyLimit = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const result =
    await courseQuoraDailyLimitService.getCourseQuoraDailyLimit(query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Courses Quora limit retrive Successfull",
    data: result,
  });
});

const updateDailyLimitModel = catchAsync(async (req, res) => {
  let bodyData = { ...req?.body, ...req?.user };
  const limitModelId = req?.params?.id;
  const result = await courseQuoraDailyLimitService.updateDailyLimitModel(
    limitModelId,
    bodyData
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "course quora daily limit update successfully",
    data: result,
  });
});

export const courseQuoraDailyLimit = {
  createDailyLimitModel,
  getCourseQuoraDailyLimit,
  updateDailyLimitModel,
};
