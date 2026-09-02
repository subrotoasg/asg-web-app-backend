import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { grandCelebrationAuth } from "./auth.services.js";
import * as dotenv from "dotenv";
import { CookieHelper } from "../../../../helper/cookieHelper.js";
import config from "../../../config/index.js";
dotenv.config();

const grandCelebrationSignUp = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);

  const result = await grandCelebrationAuth.granCelebrationSignUp(body);
  // CookieHelper.clearTheCookie(res, cookieKey);
  CookieHelper.setCookie(res, cookieKey, result.refreshToken);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "OTP Send To Your Phone",
    data: result,
  });
});

const verifySignUpOTP = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const refreshToken = req?.cookies?.[cookieKey];

  //   CookieHelper.clearTheCookie(res, cookieKey);
  const result = await grandCelebrationAuth.grandCelebrationVerifySignUp(
    body,
    refreshToken,
  );
  CookieHelper.setCookie(res, cookieKey, result.refreshToken);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "OTP ভেরিফিকেশন সফল হয়েছে",
    data: result,
  });
});

//resend OTP
const resendOTP = catchAsync(async (req, res) => {
  const user = req?.tempUser;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const refreshToken = req?.cookies?.[cookieKey];
  const result = await grandCelebrationAuth.grandCelebrationResendOtp(
    user,
    refreshToken,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "OTP পুনরায় পাঠানো হয়েছে",
    data: result,
  });
});

//login Request Otp
const loginRequestOTP = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);

  const result =
    await grandCelebrationAuth.grandCelebrationLoginRequestOtp(body);

  CookieHelper.clearTheCookie(res, cookieKey);
  CookieHelper.setCookie(res, cookieKey, result.refreshToken);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "লগইন OTP পাঠানো হয়েছে",
    data: result,
  });
});

//verify login
const verifyLoginOTP = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const refreshToken = req?.cookies?.[cookieKey];

  //   CookieHelper.clearTheCookie(res, cookieKey);
  const result = await grandCelebrationAuth.grandCelebrationLogin(
    body,
    refreshToken,
  );
  CookieHelper.setCookie(res, cookieKey, result.refreshToken);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "OTP ভেরিফিকেশন সফল হয়েছে",
    data: result,
  });
});

export const grandCelebrationController = {
  grandCelebrationSignUp,
  verifySignUpOTP,
  loginRequestOTP,
  verifyLoginOTP,
  resendOTP,
};
