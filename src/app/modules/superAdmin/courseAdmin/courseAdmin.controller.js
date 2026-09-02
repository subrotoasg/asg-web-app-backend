import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pickQueryFields } from "./courseAdmin.constants.js";
import { pick } from "../../../../helper/pick.js";
import { courseAdminService } from "./courseAdmin.service.js";
import { StatusCodes } from "http-status-codes";

const getAdminCourseAll = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const response = await courseAdminService.getAdminCourseAll(query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course and Admin retrived",
    data: response,
  });
});

const getAdminsOfCourse = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const response = await courseAdminService.getAdminsOfCourse(id, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course and Admin retrived",
    data: response,
  });
});

const getCourseByAdminIdController = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const response = await courseAdminService.getCourseByAdminId(id, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course retrived successfully",
    data: response,
  });
});

export const courseAdminController = {
  getAdminsOfCourse,
  getAdminCourseAll,
  getCourseByAdminIdController,
};
