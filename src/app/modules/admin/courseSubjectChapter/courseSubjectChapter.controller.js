import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { courseSubjectChapterService } from "./courseSubjectChapter.services.js";
import {
  pickQueryFields,
  pickQueryForCourseSubjectBasedId,
} from "./courseSubjectChapter.constants.js";
import { pick } from "../../../../helper/pick.js";

const getAllCourseSubjectChapter = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const response =
    await courseSubjectChapterService.getAllCourseSubjectChapter(query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All course with subject and chapter retrived successfull",
    data: response,
  });
});

const getAllSubjectChapterByCourse = catchAsync(async (req, res) => {
  const courseId = req?.params.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const response =
    await courseSubjectChapterService.getAllSubjectChapterByCourse(
      courseId,
      query,
    );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subject and chapters retrived successfull",
    data: response,
  });
});

const getCourseSubjectChapterById = catchAsync(async (req, res) => {
  const courseSubjectId = req?.params?.id;
  const response =
    await courseSubjectChapterService.getCourseSubjectChapterById(
      courseSubjectId,
    );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subject-course retrived successfull",
    data: response,
  });
});

const getAllChaptersByCourseSubjectId = catchAsync(async (req, res) => {
  const courseSubjectId = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForCourseSubjectBasedId);
  const response =
    await courseSubjectChapterService.getAllChaptersByCourseSubjectId(
      courseSubjectId,
      query,
    );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "chapters retrived by course subject successfull!",
    data: response,
  });
});

const courseSubjectChapterCreate = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const response =
    await courseSubjectChapterService.courseSubjectChapterCreate(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "chapters included to courseSubjectChapter successfull.",
    data: response,
  });
});

const updateCourseSubjectChapter = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const courseSubjectChapterId = req.params.id;
  const courseSubjectChapterImage = req.photoUrl;

  const result = await courseSubjectChapterService.updateCourseSubjectChapter(
    courseSubjectChapterId,
    courseSubjectChapterImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Subject Chapter Updated Successfull",
    data: result,
  });
});

const deleteCourseSubjectChapter = catchAsync(async (req, res) => {
  const courseSubjectChapterId = req.params.id;
  const result = await courseSubjectChapterService.deleteCourseSubjectChapter(
    courseSubjectChapterId,
    req?.body,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course Subject Chapter Deleted Successfull",
    data: result,
  });
});

export const courseSubjectChapterController = {
  courseSubjectChapterCreate,
  getAllCourseSubjectChapter,
  getAllSubjectChapterByCourse,
  getCourseSubjectChapterById,
  getAllChaptersByCourseSubjectId,
  updateCourseSubjectChapter,
  deleteCourseSubjectChapter,
  // getCourseSubjectById,
  // getAllSubjectsByCourseId,
};
