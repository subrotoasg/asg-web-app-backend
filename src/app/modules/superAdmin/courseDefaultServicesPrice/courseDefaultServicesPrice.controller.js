import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { courseDefaultServicePriceServices } from "./courseDefaultServicesPrice.services.js";


//get All CourseDefaultServicesPrice controller
const GetAllCourseDefaultServicesPrice = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await courseDefaultServicePriceServices.getAllcourseDefaultServicePricefromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All CourseDefaultServicesPrice retrive Successfull",
    data: result,
  });
});

//get single CourseDefaultServicesPrice controller
const GetSingleCourseDefaultServicesPrice = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await courseDefaultServicePriceServices.getSinglecourseDefaultServicePricefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultServicesPrice retrive Successfull",
    data: result,
  });
});

//Create CourseDefaultServicesPrice controller
const createCourseDefaultServicesPrice = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await courseDefaultServicePriceServices.createcourseDefaultServicePriceIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultServicesPrice Created Successfull",
    data: result,
  });
});

//Update CourseDefaultServicesPrice controller
const updateCourseDefaultServicesPrice = catchAsync(async (req, res) => {
  const CourseDefaultServicesPriceId = req.params.id;
  const bodyData = req?.body;
  const result = await courseDefaultServicePriceServices.updatecourseDefaultServicePriceIntoDb(
    CourseDefaultServicesPriceId,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultServicesPrice Updated Successfull",
    data: result,
  });
});

//Delete CourseDefaultServicesPrice controller
const deleteCourseDefaultServicesPrice = catchAsync(async (req, res) => {
  const CourseDefaultServicesPriceId = req.params.id;
  const result =
    await courseDefaultServicePriceServices.deletecourseDefaultServicePriceFromDb(CourseDefaultServicesPriceId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseDefaultServicesPrice Deleted Successfull",
    data: result,
  });
});

export const CourseDefaultServicesPriceController = {
  createCourseDefaultServicesPrice,
  updateCourseDefaultServicesPrice,
  GetAllCourseDefaultServicesPrice,
  GetSingleCourseDefaultServicesPrice,
  deleteCourseDefaultServicesPrice,
};
