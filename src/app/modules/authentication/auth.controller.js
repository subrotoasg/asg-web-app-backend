import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utlis/catchAsync.js";
import sendResponse from "../../utlis/sendResponse.js";
import { authService } from "./auth.services.js";
import * as dotenv from "dotenv";
import { CookieHelper } from "../../../helper/cookieHelper.js";
import config from "../../config/index.js";
dotenv.config();

const signUp = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const requestInfo = req?.requestInfo || {};
  CookieHelper.clearTheCookie(res, cookieKey);
  const platform = req?.headers["platform"];
  const result = await authService.signUpV2(
    body,
    hostName,
    requestInfo,
    platform,
  );
  CookieHelper.setCookie(res, cookieKey, result.refreshToken);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Sign Up successfull!",
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.clearTheCookie(res, cookieKey);
  const { role, message } = await authService.logIn(body);
  CookieHelper.setCookie(res, "emailOrPhone", body.emailOrPhone);

  CookieHelper.setCookie(res, "role", role);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    meta: {
      role: role,
    },
    message,
  });
});

const loginV2 = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.clearTheCookie(res, cookieKey);

  const { message } = await authService.logInV2(body, hostName);

  CookieHelper.setCookie(res, "emailOrPhone", body.emailOrPhone);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: message,
    data: {},
  });
});

const verifyLogin = catchAsync(async (req, res) => {
  const body = req?.body;
  const { emailOrPhone, role } = req?.cookies;
  body.emailOrPhone = emailOrPhone;
  body.role = role;
  const hostName = CookieHelper.getFrontendHost(req);
  const requestInfo = req?.requestInfo || {};
  const response = await authService.verifyLogin(body, hostName, requestInfo);

  const cookieKey = CookieHelper.refreshCookieName(hostName);

  CookieHelper.setCookie(res, cookieKey, response?.refreshToken);

  CookieHelper.clearTheCookie(res, "emailOrPhone");
  CookieHelper.clearTheCookie(res, "role");

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = response;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: response?.message || "Login successful, welcome back!",
    data: rest,
  });
});

// const refreshTheToken = catchAsync(async (req, res) => {
//   const body = req?.body;

//   const hostName = CookieHelper.getFrontendHost(req);
//   const cookieKey = CookieHelper.refreshCookieName(hostName);

//   const refreshToken = req?.cookies?.[cookieKey];
//   body.refreshToken = refreshToken || body?.refreshToken;

//   const response = await authService.refreshTheToken(body);

//   return sendResponse(res, {
//     statusCodes: StatusCodes.OK,
//     success: true,
//     message: "refreshed token",
//     data: response,
//   });
// });

// const logOut = catchAsync(async (req, res) => {
//   const hostName = CookieHelper.getFrontendHost(req);

//   const cookieKey = CookieHelper.refreshCookieName(hostName);

//   CookieHelper.clearTheCookie(res, cookieKey);

//   return sendResponse(res, {
//     statusCodes: StatusCodes.OK,
//     success: true,
//     message: "logout successfull!",
//     data: {},
//   });
// });

const refreshTheToken = catchAsync(async (req, res) => {
  const hostName = CookieHelper.getFrontendHost(req);

  const cookieKey = CookieHelper.refreshCookieName(hostName);

  const cookieRefreshToken = req?.cookies?.[cookieKey];

  const refreshToken = cookieRefreshToken || req?.body?.refreshToken;

  const response = await authService.refreshTheToken(
    {
      refreshToken,
    },
    hostName,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "refreshed token",
    data: response,
  });
});

const logOut = catchAsync(async (req, res) => {
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const refreshToken = req?.cookies?.[cookieKey] || req?.body?.refreshToken;

  if (refreshToken) {
    await authService.logOut({
      refreshToken,
      hostName,
    });
  }

  CookieHelper.clearTheCookie(res, cookieKey);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "logout successfull!",
    data: {},
  });
});

const changePassword = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };

  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);

  const refreshToken = req?.cookies?.[cookieKey];
  const response = await authService.changePassword(body, refreshToken);
  console.log(response);
  CookieHelper.clearTheCookie(res, cookieKey);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "password changed successfully! please login",
    data: response,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await authService.forgetPassword(body, hostName);
  //Send Response
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Please check your email",
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body);

  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);

  CookieHelper.clearTheCookie(res, cookieKey);
  //Send Response
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Password Reset Successfull",
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const result = await authService.getProfile(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Profile retrived successfull",
    data: result,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };

  const profileImage = req?.photoUrl;

  const result = await authService.updateProfile(body, profileImage);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Profile updated successfull",
    data: result,
  });
});

const ping = catchAsync(async (req, res) => {
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "PONG",
    data: true,
  });
});

const deleteAccount = catchAsync(async (req, res) => {
  const hostName = CookieHelper.getFrontendHost(req);

  const cookieKey = CookieHelper.refreshCookieName(hostName);

  CookieHelper.clearTheCookie(res, cookieKey);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Account deleted successfully",
    data: {},
  });
});

const verifyCredential = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const requestInfo = req?.requestInfo || {};
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.clearTheCookie(res, cookieKey);

  const result = await authService.verifyCredential(
    body,
    hostName,
    requestInfo,
  );

  if (result?.refreshToken) {
    CookieHelper.setCookie(res, cookieKey, result.refreshToken);
  }

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message,
    data: result?.refreshToken ? rest : result,
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const body = req?.body;
  const platform = req?.headers["platform"];
  const result = await authService.verifyOtp(body, platform);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Phone verification successfull",
    data: result,
  });
});

const verifyOtpAndSignup = catchAsync(async (req, res) => {
  const body = req?.body;
  const platform = req?.headers["platform"];
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.clearTheCookie(res, cookieKey);
  const requestInfo = req?.requestInfo || {};

  const result = await authService.verifyOtpAndSignup(
    body,
    hostName,
    platform,
    requestInfo,
  );

  CookieHelper.setCookie(res, cookieKey, result.refreshToken);

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "verification successfull",
    data: rest,
  });
});

const signUpV2 = catchAsync(async (req, res) => {
  const body = req?.body;
  const platform = req?.headers["platform"];
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.clearTheCookie(res, cookieKey);
  const requestInfo = req?.requestInfo || {};

  const result = await authService.signUpV3(
    body,
    hostName,
    platform,
    requestInfo,
  );

  CookieHelper.setCookie(res, cookieKey, result.refreshToken);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "verification successfull",
    data: result,
  });
});

const oAuthLoginVerify = catchAsync(async (req, res) => {
  const body = req?.body;
  const platform = req?.headers["platform"];
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  // CookieHelper.clearTheCookie(res, cookieKey);
  const requestInfo = req?.requestInfo || {};

  const result = await authService.oAuthLoginVerify(
    body,
    platform,
    hostName,
    requestInfo,
  );

  CookieHelper.setCookie(res, cookieKey, result?.refreshToken);

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message || "Sign-in successfull. Welcome back!",
    data: rest,
  });
});

const verifyLoginV2 = catchAsync(async (req, res) => {
  const body = req?.body;
  const { emailOrPhone } = req?.cookies;
  const hostName = CookieHelper.getFrontendHost(req);
  const requestInfo = req?.requestInfo || {};

  const response = await authService.verifyLoginV2(
    body,
    emailOrPhone,
    hostName,
    requestInfo,
  );

  const cookieKey = CookieHelper.refreshCookieName(hostName);
  CookieHelper.setCookie(res, cookieKey, response?.refreshToken);
  CookieHelper.clearTheCookie(res, "emailOrPhone");

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = response;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: response?.message || "Login successful, welcome back!",
    data: rest,
  });
});

const syncStudentOauth = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const requestInfo = req?.requestInfo || {};
  CookieHelper.clearTheCookie(res, cookieKey);
  const result = await authService.syncStudentOauth(
    body,
    hostName,
    requestInfo,
  );
  CookieHelper.setCookie(res, cookieKey, result?.refreshToken);
  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Sync with OAuth successfull",
    data: rest,
  });
});

const checkSocialLogin = catchAsync(async (req, res) => {
  const body = req?.body;
  const result = await authService.checkSocialLogin(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "check social successfull",
    data: result,
  });
});

const existingAccountSocialLogin = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const requestInfo = req?.requestInfo || {};
  const result = await authService.existingAccountSocialLogin(
    body,
    hostName,
    requestInfo,
  );
  CookieHelper.setCookie(res, cookieKey, result?.refreshToken);
  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "existing user social linked successfull",
    data: rest,
  });
});

const sendSignUpOtp = catchAsync(async (req, res) => {
  const body = req?.body;
  const hostName = CookieHelper.getFrontendHost(req);
  const cookieKey = CookieHelper.refreshCookieName(hostName);
  const requestInfo = req?.requestInfo || {};
  CookieHelper.clearTheCookie(res, cookieKey);
  const result = await authService.sendSignUpOtp(body, hostName, requestInfo);

  if (result?.refreshToken) {
    CookieHelper.setCookie(res, cookieKey, result.refreshToken);
  }

  const {
    [cookieKey]: foo,
    ["message"]: bar,
    ["refreshToken"]: _,
    ...rest
  } = result;

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message,
    data: result?.refreshToken ? rest : result,
  });
});

const getSocialLinkedAccounts = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const result = await authService.getSocialLinkedAccounts(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message,
    data: result,
  });
});

const getUserForExam = catchAsync(async (req, res) => {
  const { uid } = req?.query;
  const result = await authService.getUserForExam(uid);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "user lookup successfull",
    data: result,
  });
});

const unlinkSocialAccount = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const result = await authService.unlinkSocialAccount(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "social unlink successfull",
    data: result,
  });
});

const linkSocialAccount = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const result = await authService.linkSocialAccount(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "social link successfull",
    data: result,
  });
});

const userDevicesInfoController = catchAsync(async (req, res) => {
  const payload = req?.requestInfo;
  const user = req?.body;
  const result = await authService.userLoginDeviceInfo(payload, user);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "User Device Info Retrived successfull",
    data: result,
  });
});

const getAllCoursesOfStudent = catchAsync(async (req, res) => {
  const uid = req?.params?.uid;
  const result = await authService.getAllCoursesOfStudent(uid);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student course list retrieved",
    data: result,
  });
});

export const authController = {
  signUp,
  login,
  loginV2,
  logOut,
  signUpV2,
  verifyOtp,
  verifyOtpAndSignup,
  oAuthLoginVerify,
  forgetPassword,
  verifyLogin,
  verifyLoginV2,
  changePassword,
  refreshTheToken,
  resetPassword,
  getProfile,
  updateProfile,
  ping,
  deleteAccount,
  verifyCredential,
  syncStudentOauth,
  checkSocialLogin,
  existingAccountSocialLogin,
  getSocialLinkedAccounts,
  sendSignUpOtp,
  getUserForExam,
  unlinkSocialAccount,
  linkSocialAccount,
  userDevicesInfoController,
  getAllCoursesOfStudent,
};
