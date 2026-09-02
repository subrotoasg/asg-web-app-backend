import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { courseSubjectService } from "./courseSubject.services.js";
import {
  pickQueryFields,
  pickQueryForCourseBasedId,
} from "./courseSubject.constants.js";
import { pick } from "../../../../helper/pick.js";
import config from "../../../config/index.js";

const getAllCourseSubject = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const response = await courseSubjectService.getAllCourseSubject(query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course with subject retrived successfull",
    data: response,
  });
});

const getCourseSubjectById = catchAsync(async (req, res) => {
  const courseSubjectId = req?.params?.id;
  const response =
    await courseSubjectService.getCourseSubjectById(courseSubjectId);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subject-course retrived successfull",
    data: response,
  });
});

const getAllSubjectsByCourseId = catchAsync(async (req, res) => {
  const courseId = req?.params?.id;
  const payloadQuery = req?.query;
  const hostname =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const query = pick(payloadQuery, pickQueryForCourseBasedId);
  const response = await courseSubjectService.getAllSubjectsByCourseId(
    courseId,
    query,
    hostname,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subjects retrived by course successfull!",
    data: response,
  });
});

const courseSubjectCreate = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const response = await courseSubjectService.courseSubjectCreate(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subjects included to course successfull.",
    data: response,
  });
});

const updateCouseSubject = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const courseSubjectId = req.params.id;
  const courseSubjectImage = req.photoUrl;

  const result = await courseSubjectService.updateCouseSubject(
    courseSubjectId,
    courseSubjectImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Subject Updated Successfull",
    data: result,
  });
});

const deleteCourseSubject = catchAsync(async (req, res) => {
  const courseSubjectId = req.params.id;
  const result = await courseSubjectService.deleteCourseSubject(
    courseSubjectId,
    req?.body,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Subject Deleted Successfull",
    data: result,
  });
});

export const courseSubjectController = {
  courseSubjectCreate,
  getAllCourseSubject,
  getCourseSubjectById,
  getAllSubjectsByCourseId,
  updateCouseSubject,
  deleteCourseSubject,
};
