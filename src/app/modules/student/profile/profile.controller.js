import { StatusCodes } from "http-status-codes";
import sendResponse from "../../../utlis/sendResponse.js";
import catchAsync from "../../../utlis/catchAsync.js";
import { profileService } from "./profile.services.js";

const studentProfileUpdate = catchAsync(async (req, res) => {
  let body = req?.body;
  const payload = { ...body, ...req?.user };
  const userPhoto = req.photoUrl;
  const response = await profileService.studentProfileUpdateIntoDb(
    payload,
    userPhoto,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Profile updated successfully!",
    data: response,
  });
});

const studentInfoDownloader = catchAsync(async (req, res) => {
  const userInfo = req?.body;
  const response = await profileService.studentInfoDownloader(res, userInfo);
  // return sendResponse(res, {
  //   statusCodes: StatusCodes.OK,
  //   success: true,
  //   message: "Profile download successfully!",
  //   data: response,
  // });
});

const getMe = catchAsync(async (req, res) => {
  const userInfo = req?.body;
  const response = await profileService.getMe(userInfo);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Profile info retrieved successfully!",
    data: response,
  });
});

export const profileController = {
  getMe,
  studentProfileUpdate,
  studentInfoDownloader,
};
