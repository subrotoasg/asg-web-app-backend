import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { CourseAdminServiceOfferServices } from "./courseAdminServiceOffer.services.js";
import config from "../../../config/index.js";

//get All CourseAdminServiceOffer controller
const GetAllCourseAdminServiceOffer = catchAsync(async (req, res) => {
  const query = req?.query;
  const result =
    await CourseAdminServiceOfferServices.getAllCourseAdminServiceOfferfromDb(
      query,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All CourseAdminServiceOffer retrive Successfull",
    data: result,
  });
});

//get All Admin Service controller
const GetAllAdminServiceOffer = catchAsync(async (req, res) => {
  const query = req?.query;
  const user = req?.body;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result =
    await CourseAdminServiceOfferServices.getAllAdminServiceOfferFromDb(
      user,
      query,
      hostName,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Admin Service Offer retrive Successfull",
    data: result,
  });
});

//get single CourseAdminServiceOffer controller
const GetSingleCourseAdminServiceOffer = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result =
    await CourseAdminServiceOfferServices.getSingleCourseAdminServiceOfferfromDb(
      id,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminServiceOffer retrive Successfull",
    data: result,
  });
});

//Create CourseAdminServiceOffer controller
const createCourseAdminServiceOffer = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await CourseAdminServiceOfferServices.createCourseAdminServiceOfferIntoDb(
      bodyData,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminServiceOffer Created Successfull",
    data: result,
  });
});

//Update CourseAdminServiceOffer controller
const updateCourseAdminServiceOffer = catchAsync(async (req, res) => {
  const CourseAdminServiceOfferId = req.params.id;
  const bodyData = req?.body;
  const result =
    await CourseAdminServiceOfferServices.updateCourseAdminServiceOfferIntoDb(
      CourseAdminServiceOfferId,
      bodyData,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminServiceOffer Updated Successfull",
    data: result,
  });
});

//Delete CourseAdminServiceOffer controller
const deleteCourseAdminServiceOffer = catchAsync(async (req, res) => {
  const CourseAdminServiceOfferId = req.params.id;
  const result =
    await CourseAdminServiceOfferServices.deleteCourseAdminServiceOfferFromDb(
      CourseAdminServiceOfferId,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CourseAdminServiceOffer Deleted Successfull",
    data: result,
  });
});

export const CourseAdminServiceOfferController = {
  createCourseAdminServiceOffer,
  updateCourseAdminServiceOffer,
  GetAllCourseAdminServiceOffer,
  GetSingleCourseAdminServiceOffer,
  deleteCourseAdminServiceOffer,
  GetAllAdminServiceOffer,
};
