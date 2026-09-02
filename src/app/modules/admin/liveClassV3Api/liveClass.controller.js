import { StatusCodes } from "http-status-codes";
import { LiveClassServices } from "./liveClass.services.js";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import config from "../../../config/index.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./liveClass.constants.js";

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
//Create Free App Class Video controller
const createFreeClassUploader = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const LiveClassImage = req.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await LiveClassServices.createAppFressClassIntoDb(
    LiveClassImage,
    bodyData,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Free Class Created Successfull",
    data: result,
  });
});

//create live class version 4
const createLiveClassVersion4Controller = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const LiveClassImage = req.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await LiveClassServices.createLiveClassVersion5IntoDb(
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
const joinLiveClassFromApp = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const user = req?.body;
  const result = await LiveClassServices.joinLiveClassFromAppfromDb(id, user);
  // send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Join Live Class retrive Successfull",
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

//live class deleted
const deleteLiveClassRoom = catchAsync(async (req, res) => {
  const LiveClassId = req.params.id;
  const result = await LiveClassServices.deleteLiveClassRoomFromDb(
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

//get LiveClass Participants and Messages controller
const getParticipantsAndMessagesController = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);
  const roomId = req?.params?.id;
  const result =
    await LiveClassServices.getParticipantsAndMessagesFronMediaServer(
      query,
      roomId,
    );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Messages and Participants retrive Successfull",
    data: result?.data,
    meta: result?.meta,
  });
});

export const LiveClassController = {
  createLiveClass,
  joinLiveClass,
  joinLiveClassFromApp,
  updateLiveClassStatusIntoDb,
  deleteLiveClassRoom,
  createFreeClassUploader,
  createLiveClassVersion4Controller,
  getParticipantsAndMessagesController,
};
