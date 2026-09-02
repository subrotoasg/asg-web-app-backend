import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { CycleChapterServices } from "./cycleChapter.services.js";
import { pick } from "../../../../helper/pick.js";
import {
  pickQueryFields,
  pickQueryForChapterBasedId,
} from "./cycleChapter.constants.js";

const GetAllSubjectChapterByCycle = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const cycelId = req?.params?.id;
  const query = pick(payloadQuery, pickQueryFields);
  const response = await CycleChapterServices.GetAllSubjectChapterByCycle(
    cycelId,
    query,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All subject and chapter by cycleId retrived successfull",
    data: response,
  });
});

const GetAllInfoByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const response = await CycleChapterServices.GetAllInfoByCourseId(id, query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "cycle subject chapter retrived successfull",
    data: response,
  });
});

//get single CycleChapter controller
const GetSingleCycleChapter = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CycleChapterServices.getSingleCycleChapterfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CycleChapter retrive Successfull",
    data: result,
  });
});

//get Chapter Based On Subject Id
const GetChapterBasedOnSubjectId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForChapterBasedId);
  const result = await CycleChapterServices.getChapterBasedOnSubjectIdfromDb(
    id,
    query,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Subject Based Chapter retrive Successfull",
    data: result,
  });
});

//Create CycleChapter controller
const createCycleChapter = catchAsync(async (req, res) => {
  let bodyData = req?.body;
  const CycleChapterImage = req?.photoUrl;

  //Merge body data with login user info
  bodyData = { ...bodyData, ...req?.user };

  const result = await CycleChapterServices.createCycleChapterIntoDb(
    CycleChapterImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Chapter Created Successfull",
    data: result,
  });
});

//Update CycleChapter controller
const updateCycleChapter = catchAsync(async (req, res) => {
  const CycleChapterId = req?.params?.id;
  const CycleChapterImage = req?.photoUrl;
  const bodyData = { ...req?.body, ...req?.user };
  const result = await CycleChapterServices.updateCycleChapterIntoDb(
    CycleChapterId,
    CycleChapterImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CycleChapter Updated Successfull",
    data: result,
  });
});

//Delete CycleChapter controller
const deleteCycleChapter = catchAsync(async (req, res) => {
  const CycleChapterId = req.params.id;
  const result = await CycleChapterServices.deleteCycleChapterFromDb(
    CycleChapterId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CycleChapter Deleted Successfull",
    data: result,
  });
});

export const CycleChapterController = {
  createCycleChapter,
  updateCycleChapter,
  GetAllInfoByCourseId,
  GetAllSubjectChapterByCycle,
  GetChapterBasedOnSubjectId,
  GetSingleCycleChapter,
  deleteCycleChapter,
};
