import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { ChepterServices } from "./chepter.services.js";
import { pick } from "../../../../helper/pick.js";
import {
  pickQueryFields,
  pickQueryForSubjectBasedId,
} from "./chepter.constants.js";

//get All Chepter controller
const GetAllChepter = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await ChepterServices.getAllChepterfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Chepter retrive Successfull",
    data: result,
  });
});

//get single Chepter controller
const GetSingleChepter = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await ChepterServices.getSingleChepterfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Chepter retrive Successfull",
    data: result,
  });
});

//get Subject Based all Chepter controller
const GetChepterBasedOnSubject = catchAsync(async (req, res) => {
  // console.log("hello");
  const id = req?.params?.subjectId;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForSubjectBasedId);
  const result = await ChepterServices.getChepterBasedOnSubjectIdfromDb(
    id,
    query,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Chepters retrive Successfull",
    data: result,
  });
});

//Create Chepter controller
const createChepter = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const chapterImage = req?.photoUrl;
  const result = await ChepterServices.createChepterIntoDb(
    chapterImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Chepter Created Successfull",
    data: result,
  });
});

//Update Chepter controller
const updateChepter = catchAsync(async (req, res) => {
  const chapterId = req.params.id;
  const chapterImage = req.photoUrl;
  const bodyData = req?.body;
  const result = await ChepterServices.updateChepterIntoDb(
    chapterId,
    chapterImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Chepter Updated Successfull",
    data: result,
  });
});

//Delete Chepter controller
const deleteChepter = catchAsync(async (req, res) => {
  const ChepterId = req.params.id;
  const result = await ChepterServices.deleteChepterFromDb(
    ChepterId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Chepter Deleted Successfull",
    data: result,
  });
});

export const ChepterController = {
  createChepter,
  updateChepter,
  GetAllChepter,
  GetSingleChepter,
  GetChepterBasedOnSubject,
  deleteChepter,
};
