import { StatusCodes } from "http-status-codes";
import { PushMessagingServices } from "./pushMessaging.services.js";
import sendResponse from "../../../../../utlis/sendResponse.js";
import catchAsync from "../../../../../utlis/catchAsync.js";
import config from "../../../../../config/index.js";

//get all notification Data
const getAllNotificationController = catchAsync(async (req, res) => {
  const user = req?.body;
  const query = req?.query;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const result = await PushMessagingServices.getAllNotificationIntoDb(
    user,
    query,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Get All Notification logs successfully",
    data: result.data,
    meta: result.meta,
  });
});

//Create PushMessaging controller
const RegistercreatePushMessagingController = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await PushMessagingServices.RegisterDeviceCreatePushMessagingIntoDb(
      bodyData,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Register Push Messaging Created Successfull",
    data: result,
  });
});

//Send PushMessaging controller
const sendPushMessagingController = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const imageURL = req?.photoUrl;
  const result = await PushMessagingServices.sendPushMessaginIntoDb(
    bodyData,
    imageURL,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Send Message to User",
    data: result,
  });
});

//Send braodcast push message controller
const broadcastSendPushMessagingController = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const imageURL = req?.photoUrl;
  const result = await PushMessagingServices.broadcastPushMessageIntoDb(
    bodyData,
    imageURL,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Boadcast Message Send to user",
    data: result,
  });
});

//Send braodcast all user push message controller
const broadcastAllUserSendPushMessagingController = catchAsync(
  async (req, res) => {
    const bodyData = req?.body;
    const imageURL = req?.photoUrl;
    const result =
      await PushMessagingServices.broadcastAllUserPushMessageIntoDb(
        bodyData,
        imageURL,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "Boadcast all user Message Send Successfull",
      data: result,
    });
  },
);

//student all get notificaiton
const getAllStudentNotificationController = catchAsync(async (req, res) => {
  const result = await PushMessagingServices.getAllStudentNotificationFromDb(
    req.query,
    req.auth,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All notifications retrieved successfully",
    data: result.result,
    meta: result.meta,
  });
});

//student notification update
const studentNotificationUpdateController = catchAsync(async (req, res) => {
  const result = await PushMessagingServices.studentNotificationUpdateIntoDb(
    req.body,
    req.auth,
  );
  //send Student Based Notification
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notification updated successfully",
    data: result,
  });
});

//Send Single PushMessaging controller
const sendSingleUserPushMessagingController = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const imageURL = req?.photoUrl;
  const result = await PushMessagingServices.singleUserSendNotificationFromDb(
    bodyData,
    imageURL,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Single Student Send Notification Successfull",
    data: result,
  });
});

export const PushMessagingController = {
  getAllNotificationController,
  RegistercreatePushMessagingController,
  sendPushMessagingController,
  broadcastSendPushMessagingController,
  broadcastAllUserSendPushMessagingController,
  getAllStudentNotificationController,
  studentNotificationUpdateController,
  sendSingleUserPushMessagingController,
};
