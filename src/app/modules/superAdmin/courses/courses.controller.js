import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { coursesServices } from "./courses.services.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./courses.constants.js";
import config from "../../../config/index.js";

//get All courses controller
const GetAllCourses = catchAsync(async (req, res) => {
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const platform = req?.headers["platform"];

  const result = await coursesServices.getAllCoursesfromDbV3(
    query,
    body,
    token,
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

const GetAllArchieveCourses = catchAsync(async (req, res) => {
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);
  const hostName =
    config.node_env === "development"
      ? req.hostName
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const platform = req?.headers["platform"];
  // console.log(hostName);
  const result = await coursesServices.GetAllArchieveCoursesV2(
    query,
    body,
    token,
    hostName,
    platform,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Archieve Courses retrive Successfull",
    data: result,
  });
});

const getArchieveCourseByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await coursesServices.getArchieveCourseByCourseId(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course retrive Successfull",
    data: result,
  });
});

//get single course controller
const GetSingleCourse = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await coursesServices.getSingleCoursesfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course retrive Successfull",
    data: result,
  });
});

//Create courses controller
const createCourses = catchAsync(async (req, res) => {
  let bodyData = req?.body;
  const courseImage = req?.photoUrl;

  //Merge body data with login user info
  bodyData = { ...bodyData, ...req.user };

  const result = await coursesServices.createCoursesIntoDb(
    bodyData,
    courseImage,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Created Successfull",
    data: result,
  });
});

//Update courses controller
const updateCourse = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const courseId = req.params.id;
  const courseImage = req.photoUrl;

  const result = await coursesServices.updateCoursesIntoDb(
    courseId,
    courseImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Updated Successfull",
    data: result,
  });
});

//Delete courses controller
const deleteCourse = catchAsync(async (req, res) => {
  const courseId = req.params.id;
  const result = await coursesServices.deleteCourseFromDb(courseId, req?.body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Deleted Successfull",
    data: result,
  });
});

const pullCourse = catchAsync(async (req, res) => {
  // console.log(req?.body);
  const body = { ...req?.body, ...req?.user };
  const result = await coursesServices.pullCourse(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Pulled Successfully",
    data: result,
  });
});

const cloneCourseOrCycle = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await coursesServices.cloneCourseOrCycle(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Clone successfull",
    data: result,
  });
});

const detectContent = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await coursesServices.detectContent(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "content detection successfull",
    data: result,
  });
});

const getCourseStats = catchAsync(async (req, res) => {
  const courseId = req?.params?.id;
  const query = req?.query;
  const result = await coursesServices.getCourseStats(courseId, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "course storage stats retrieved successfull",
    data: result,
  });
});

const getCourseStatsForCrm = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await coursesServices.getCourseStatsForCrm(
    query,
    req?.headers?.crmkey,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "course stats retrieved successfull",
    data: result,
  });
});

const getCourseEnrollStatsForCrm = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await coursesServices.getCourseEnrollStatsForCrm(
    query,
    req?.headers?.crmkey,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "course enroll stats retrieved successfull",
    data: result,
  });
});

const getAllCourseStats = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await coursesServices.getAllCourseStats(query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course stats retrieved.",
    data: result,
  });
});

const setActiveBiller = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result = await coursesServices.setActiveBiller(bodyData);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message,
    data: result?.inappropiateCourses,
  });
});

const getNoActiveBiller = catchAsync(async (req, res) => {
  const result = await coursesServices.getNoActiveBiller();

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message,
    data: "All Active course with no active biller retrieved",
  });
});

const getCourseApprovalBill = catchAsync(async (req, res) => {
  const courseId = req?.params?.id;
  const query = req?.query;
  const result = await coursesServices.getCourseApprovalBill(courseId, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message || "approval bill retrieved successfull",
    data: result,
  });
});

const getAfsAccessCount = catchAsync(async (req, res) => {
  const productId = req?.params?.productId;
  const apiKey = req?.headers["apikey"];
  const result = await coursesServices.getAfsAccessCount(productId, apiKey);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Retrieved AFS access count",
    data: result,
  });
});

const downloadCourseContent = catchAsync(async (req, res) => {
  try {
    await coursesServices.downloadCourseContent(req.params.courseId, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const getCourseStudentsInfoLink = catchAsync(async (req, res) => {
  const body = { ...req?.user, ...req?.body };
  const courseId = req?.params?.courseId;
  const result = await coursesServices.getCourseStudentsInfoLink(
    body,
    courseId,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message || "Download Link Send To Email.",
    data: {},
  });
});

const downloadTheFile = catchAsync(async (req, res) => {
  const courseId = req?.params?.courseId;
  const query = req?.query;

  try {
    await coursesServices.downloadTheFile(courseId, query, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export const coursesController = {
  createCourses,
  updateCourse,
  GetAllCourses,
  setActiveBiller,
  getArchieveCourseByCourseId,
  GetAllArchieveCourses,
  GetSingleCourse,
  deleteCourse,
  pullCourse,
  cloneCourseOrCycle,
  detectContent,
  getCourseStats,
  getCourseStatsForCrm,
  getAllCourseStats,
  getCourseEnrollStatsForCrm,
  getCourseApprovalBill,
  getNoActiveBiller,
  getAfsAccessCount,
  downloadCourseContent,
  getCourseStudentsInfoLink,
  downloadTheFile,
};
