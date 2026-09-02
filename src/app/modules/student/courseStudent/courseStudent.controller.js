import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { courseStudentServices } from "./courseStudent.services.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./courseStudent.constants.js";
import config from "../../../config/index.js";
import { CookieHelper } from "../../../../helper/cookieHelper.js";

// //get All courses controller
const getMyCourses = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const body = { ...req?.body, ...req?.user };
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const platform = req?.headers["platform"];

  const result = await courseStudentServices.getMyCoursesV2(
    query,
    body,
    hostName,
    platform,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Courses retrive Successfull",
    data: result,
  });
});

const getAllStudents = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const body = { ...req?.body, ...req?.user };
  const result = await courseStudentServices.getAllStudents(query, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Student list retrive Successfull",
    data: result,
  });
});

const getCycleStudents = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await courseStudentServices.getCycleStudents(id, query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle students retrive Successfull",
    data: result,
  });
});

const redeemCourse = catchAsync(async (req, res) => {
  let bodyData = req?.body;

  bodyData = { ...bodyData, ...req.user };

  const result = await courseStudentServices.redeemCourseV3(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Redeemed Successfull",
    data: result,
  });
});

const getCourseStudents = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await courseStudentServices.getCourseStudents(id, query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course students retrive Successfull",
    data: result,
  });
});

const getStudentInfoforCx = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await courseStudentServices.getStudentInfoforCx(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "students info retrive Successfull",
    data: result,
  });
});

const migrateFromOldApp = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await courseStudentServices.migrateFromOldApp(payload);
  const hasTokens = !!(result?.authToken && result?.refreshToken);

  //new migration user
  if (hasTokens) {
    const hostName = CookieHelper.getFrontendHost(req);
    const cookieKey = CookieHelper.refreshCookieName(hostName);
    CookieHelper.setCookie(res, cookieKey, result?.refreshToken);
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "অভিনন্দন! তোমার মাইগ্রেশন সফলভাবে সম্পন্ন হয়েছে।",
      data: {
        alreadyMigrated: false,
        authToken: result.authToken,
      },
    });
  }

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message:
      "তোমার অ্যাকাউন্ট ইতোমধ্যেই মাইগ্রেটেড। অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করো।",
    data: {
      alreadyMigrated: true,
      authToken: null,
    },
  });
});

//manually Course Access
const manuallyCourseAndCycleAccessController = catchAsync(async (req, res) => {
  let bodyData = req?.body;
  bodyData = { ...bodyData, ...req.user };

  const result =
    await courseStudentServices.manuallyCourseAccessIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Manually access Successfull",
    data: result,
  });
});

//Student Info
const studentInfoController = catchAsync(async (req, res) => {
  const studentId = req.query.id;
  const credential = req.headers["x-credentials"];
  const result = await courseStudentServices.studentInfoFromDb(
    studentId,
    credential,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Student information retrieved successfully",
    data: result,
  });
});

export const coursesStudentController = {
  redeemCourse,
  getMyCourses,
  getAllStudents,
  getCycleStudents,
  getCourseStudents,
  getStudentInfoforCx,
  migrateFromOldApp,
  manuallyCourseAndCycleAccessController,
  studentInfoController,
};
