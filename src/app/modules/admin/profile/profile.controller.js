import { StatusCodes } from "http-status-codes";
import { profileService } from "../../admin/profile/profile.services.js";
import sendResponse from "../../../utlis/sendResponse.js";
import catchAsync from "../../../utlis/catchAsync.js";

const changeProfilePhoto = catchAsync(async (req, res) => {
  let body = req?.body;
  body.photo = req?.photoUrl;
  body = { ...body, ...req?.user };
  const response = await profileService.changeProfilePhoto(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Profile Photo changed successfully!",
    data: response,
  });
});

export const profileController = {
  changeProfilePhoto,
};
