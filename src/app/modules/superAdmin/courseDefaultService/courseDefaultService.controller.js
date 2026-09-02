import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { CourseDefaultServiceServices } from "./courseDefaultService.services.js";

//get All CourseDefaultService controller
const GetAllCourseDefaultService = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await CourseDefaultServiceServices.getAllCourseDefaultServicefromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All CourseDefaultService retrive Successfull",
    data: result,
  });
});

//get single CourseDefaultService controller
const GetSingleCourseDefaultService = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CourseDefaultServiceServices.getSingleCourseDefaultServicefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultService retrive Successfull",
    data: result,
  });
});

//Create CourseDefaultService controller
const createCourseDefaultService = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await CourseDefaultServiceServices.createCourseDefaultServiceIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultService Created Successfull",
    data: result,
  });
});

//Update CourseDefaultService controller
const updateCourseDefaultService = catchAsync(async (req, res) => {
  const CourseDefaultServiceId = req.params.id;
  const bodyData = req?.body;
  const result = await CourseDefaultServiceServices.updateCourseDefaultServiceIntoDb(
    CourseDefaultServiceId,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultService Updated Successfull",
    data: result,
  });
});

//Delete CourseDefaultService controller
const deleteCourseDefaultService = catchAsync(async (req, res) => {
  const CourseDefaultServiceId = req.params.id;
  const result =
    await CourseDefaultServiceServices.deleteCourseDefaultServiceFromDb(CourseDefaultServiceId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultService Deleted Successfull",
    data: result,
  });
});

export const CourseDefaultServiceController = {
  createCourseDefaultService,
  updateCourseDefaultService,
  GetAllCourseDefaultService,
  GetSingleCourseDefaultService,
  deleteCourseDefaultService,
};
