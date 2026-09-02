import { StatusCodes } from "http-status-codes";
import { CycleContentServices } from "./cycleContent.services.js";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import {
  pickQueryFields,
  pickQueryForCycleChapterBasedId,
} from "./cycleContent.constants.js";
import { pick } from "../../../../helper/pick.js";
import config from "../../../config/index.js";

const GetCycleSubjectChapterContentInfoByCourseId = catchAsync(
  async (req, res) => {
    const id = req?.params.id;
    const payloadQuery = req?.query;
    const query = pick(payloadQuery, pickQueryFields);
    const result =
      await CycleContentServices.GetCycleSubjectChapterContentInfoByCourseId(
        id,
        query,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "All Cycle Subject Chapter Content retrive Successfull",
      data: result,
    });
  },
);

const GetCycleContentByCycleId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await CycleContentServices.GetCycleContentByCycleId(id, query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Cycle Subject Chapter Content retrive Successfull",
    data: result,
  });
});

const GetCycleContentDownloadMetaData = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const userData = req?.body;
  const result = await CycleContentServices.getCycleContentDownloadMetaData(
    id,
    userData,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "cycle content download metadata retrieved successful",
    data: result,
  });
});

//get All CycleContent controller
const GetAllCycleContent = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const result = await CycleContentServices.getAllCycleContentfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Cycle Content retrive Successfull",
    data: result,
  });
});

//get single CycleContent controller
const GetSingleCycleContent = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CycleContentServices.getSingleCycleContentfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CycleContent retrive Successfull",
    data: result,
  });
});

//get class Based on cycle chapter Id
const getClassBasedOnCycleChapterId = catchAsync(async (req, res) => {
  const id = req?.params?.id;

  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForCycleChapterBasedId);

  const result = await CycleContentServices.getClassBasedOnCycleChapterIdfromDb(
    id,
    query,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Chapter Based all Class retrive Successfull",
    data: result,
  });
});

//Create CycleContent controller
const createCycleContent = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const thumbneil = req?.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await CycleContentServices.createCycleContentIntoDb(
    thumbneil,
    body,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "CycleContent Created Successfull",
    data: result,
  });
});

//Update CycleContent controller
const updateCycleContent = catchAsync(async (req, res) => {
  const CycleContentId = req?.params?.id;
  const uploadedFiles = req?.uploadedFiles;
  const bodyData = req?.body;
  const result = await CycleContentServices.updateCycleContentIntoDb(
    CycleContentId,
    uploadedFiles,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Content Updated Successfull",
    data: result,
  });
});

//Delete CycleContent controller
const deleteCycleContent = catchAsync(async (req, res) => {
  const CycleContentId = req.params.id;
  const result = await CycleContentServices.deleteCycleContentFromDb(
    CycleContentId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class Deleted Successfull",
    data: result,
  });
});

const GodClass = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const thumneil = req?.photoUrl;
  const result = await CycleContentServices.GodClass(thumneil, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class created Successfull",
    data: result,
  });
});

export const CycleContentController = {
  createCycleContent,
  updateCycleContent,
  GetAllCycleContent,
  GetCycleContentByCycleId,
  GetCycleSubjectChapterContentInfoByCourseId,
  GetCycleContentDownloadMetaData,
  getClassBasedOnCycleChapterId,
  GetSingleCycleContent,
  deleteCycleContent,
  GodClass,
};
