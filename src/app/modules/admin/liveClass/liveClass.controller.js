import { StatusCodes } from "http-status-codes";
import { LiveClassServices } from "./liveClass.services.js";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./liveClass.constants.js";
import config from "../../../config/index.js";

//get All LiveClass controller
const GetAllLiveClass = catchAsync(async (req, res) => {
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const platform = req?.headers["platform"];
  const result = await LiveClassServices.getAllLiveClassfromDb(
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
    message: "All LiveClass retrive Successfull",
    data: result?.data,
    meta: result?.meta,
  });
});

//Join LiveClass controller
const joinLiveClass = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const user = req?.body;
  const result = await LiveClassServices.joinLiveClassfromDb(id, user);
  // send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Join Live Class retrive Successfull",
    data: result,
  });
});

//Join LiveClass controller
const joinFlowLiveClass = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const user = req?.body;
  const result = await LiveClassServices.joinFlowLiveClassfromDb(id, user);
  // send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Join Live Class retrive Successfull",
    data: result,
  });
});

//get single LiveClass controller
const GetSingleLiveClass = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await LiveClassServices.getSingleLiveClassfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "LiveClass retrive Successfull",
    data: result,
  });
});

//Create LiveClass controller
const createLiveClass = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const LiveClassImage = req.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await LiveClassServices.createLiveClassIntoDb(
    LiveClassImage,
    bodyData,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "LiveClass Created Successfull",
    data: result,
  });
});

//Create LiveClass to flow controller
const createLiveClassToFlow = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const LiveClassImage = req.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await LiveClassServices.createLiveClassToFlow(
    LiveClassImage,
    bodyData,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "LiveClass Created Successfull",
    data: result,
  });
});

//Update status LiveClass controller
const updateFlowLiveClassStatusIntoDb = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await LiveClassServices.updateFlowLiveClassStatusIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Live Class status Updated Successfull",
    data: result,
  });
});

//Update status LiveClass controller
const updateLiveClassStatusIntoDb = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result = await LiveClassServices.updateLiveClassStatusIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Live Class status Updated Successfull",
    data: result,
  });
});

//Update  status LiveClass Bunny
const updateBunnyLiveClassVideoStatus = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await LiveClassServices.updateBunnyLiveClassVideoStatus(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Live Class status Updated from bunny Successfull",
    data: result,
  });
});

//Update LiveClass controller
const updateLiveClass = catchAsync(async (req, res) => {
  const LiveClassId = req.params.id;
  const LiveClassImage = req.photoUrl;
  const bodyData = req?.body;
  const result = await LiveClassServices.updateLiveClassIntoDb(
    LiveClassId,
    LiveClassImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "LiveClass Updated Successfull",
    data: result,
  });
});

//Delete LiveClass controller
const deleteLiveClass = catchAsync(async (req, res) => {
  const LiveClassId = req.params.id;
  const result = await LiveClassServices.deleteLiveClassFromDb(
    LiveClassId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "LiveClass Deleted Successfull",
    data: result,
  });
});

//Delete LiveClass controller
const processingRecordedClass = catchAsync(async (req, res) => {
  const subjectChapterId = req.params.id;
  const result =
    await LiveClassServices.processingRecordedClass(subjectChapterId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Uploading class reterive Successfull",
    data: result,
  });
});

// Live comment and poll request controller
const liveCommentAndPollController = catchAsync(async (req, res) => {
  const roomId = req.params.id;
  const user = req?.body;
  const result = await LiveClassServices.liveCommentAndPollViewer(roomId, user);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Live comments and poll reterive Successfull",
    data: result,
  });
});
// Live comment and poll request controller
const allSessionDataController = catchAsync(async (req, res) => {
  const roomId = req.params.id;
  const user = req?.body;
  const result = await LiveClassServices.allSessionData(roomId, user);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "all session Data reterive Successfull",
    data: result,
  });
});

// Teachment autometic price calculation controller
const teachmentAutometicSessionDataController = catchAsync(async (req, res) => {
  const roomId = req.params.id;
  const user = req?.body;
  const result = await LiveClassServices.teachmentAutometicSessionData(
    roomId,
    user,
  );

  //send Response Backend
  return sendResponse(res, {
    success: true,
    statusCodes: StatusCodes.OK,
    message: "web app DB",
    data: result,
  });
});

export const LiveClassController = {
  createLiveClass,
  createLiveClassToFlow,
  updateLiveClass,
  GetAllLiveClass,
  GetSingleLiveClass,
  deleteLiveClass,
  joinLiveClass,
  joinFlowLiveClass,
  updateLiveClassStatusIntoDb,
  updateBunnyLiveClassVideoStatus,
  updateFlowLiveClassStatusIntoDb,
  processingRecordedClass,
  liveCommentAndPollController,
  allSessionDataController,
  teachmentAutometicSessionDataController,
};
