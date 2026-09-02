import { StatusCodes } from "http-status-codes";
import { superAdminService } from "../admin/admin.services.js";
import sendResponse from "../../../utlis/sendResponse.js";
import catchAsync from "../../../utlis/catchAsync.js";
import { pickQueryFields } from "./admin.constants.js";
import { pick } from "../../../../helper/pick.js";

const createAdmin = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const response = await superAdminService.createAdmin(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "new admin Created Successfull",
    data: response,
  });
});

const getAllAdmins = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const { courseId } = payloadQuery;
  const query = pick(payloadQuery, pickQueryFields);

  const response = await superAdminService.getAllAdmins(query, courseId);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "all admin retrived",
    data: response,
  });
});

const getAllAdminsForSuperadminPortalCallController = catchAsync(
  async (req, res) => {
    const payloadQuery = req?.query;
    const { courseId } = payloadQuery;
    const query = pick(payloadQuery, pickQueryFields);

    const response =
      await superAdminService.getAllAdminsForSuperadminPortalCall(
        query,
        courseId,
      );

    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "all admin retrived",
      data: response,
    });
  },
);

const assignAdminCourse = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const response = await superAdminService.assignAdminToCourse(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "admin assigned to course successfull",
    data: response,
  });
});

const unassignAdminCourse = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const response = await superAdminService.unassignAdminCourse(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "admin un-assigned from course successfull",
    data: response,
  });
});

const deactiveAdmin = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const response = await superAdminService.deactiveAdmin(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "admin deactivated",
    data: response,
  });
});

const deleteAdmin = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const response = await superAdminService.deleteAdmin(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "admin deactivated",
    data: response,
  });
});

export const superAdminController = {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  deactiveAdmin,
  assignAdminCourse,
  unassignAdminCourse,
  getAllAdminsForSuperadminPortalCallController,
};
