import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { CourseAdminOfferPriseServices } from "./courseAdminServiceOfferingPrice.services.js";


//get All CourseAdminOfferPrise controller
const GetAllCourseAdminOfferPrise = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await CourseAdminOfferPriseServices.getAllCourseAdminOfferPrisefromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All CourseAdminOfferPrise retrive Successfull",
    data: result,
  });
});

//get single CourseAdminOfferPrise controller
const GetSingleCourseAdminOfferPrise = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CourseAdminOfferPriseServices.getSingleCourseAdminOfferPrisefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminOfferPrise retrive Successfull",
    data: result,
  });
});

//Create CourseAdminOfferPrise controller
const createCourseAdminOfferPrise = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await CourseAdminOfferPriseServices.createCourseAdminOfferPriseIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminOfferPrise Created Successfull",
    data: result,
  });
});

//Update CourseAdminOfferPrise controller
const updateCourseAdminOfferPrise = catchAsync(async (req, res) => {
  const CourseAdminOfferPriseId = req.params.id;
  const bodyData = req?.body;
  const result = await CourseAdminOfferPriseServices.updateCourseAdminOfferPriseIntoDb(
    CourseAdminOfferPriseId,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminOfferPrise Updated Successfull",
    data: result,
  });
});

//Delete CourseAdminOfferPrise controller
const deleteCourseAdminOfferPrise = catchAsync(async (req, res) => {
  const CourseAdminOfferPriseId = req.params.id;
  const result =
    await CourseAdminOfferPriseServices.deleteCourseAdminOfferPriseFromDb(CourseAdminOfferPriseId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminOfferPrise Deleted Successfull",
    data: result,
  });
});

export const CourseAdminOfferPriseController = {
  createCourseAdminOfferPrise,
  updateCourseAdminOfferPrise,
  GetAllCourseAdminOfferPrise,
  GetSingleCourseAdminOfferPrise,
  deleteCourseAdminOfferPrise,
};
