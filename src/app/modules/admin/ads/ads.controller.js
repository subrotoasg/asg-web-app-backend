import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./ads.constants.js";
import { adsServices } from "./ads.services.js";

/* req.auth অথরাইজেশন মিডলওয়্যার বসায় — role আর userId দুইটাই ওখান থেকে */
const authOf = (req) => ({
  role: req?.auth?.role,
  userId: req?.auth?.userId,
});

const createAd = catchAsync(async (req, res) => {
  const imageURL = req?.photoUrl;
  const response = await adsServices.createAdIntoDb(
    req?.body,
    authOf(req),
    imageURL,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.CREATED,
    success: true,
    message: "Ad created successfully",
    data: response,
  });
});

const getAllAds = catchAsync(async (req, res) => {
  const query = {
    ...pick(req?.query, pickQueryFields),
    ...pick(req?.query, ["status", "placement", "courseId"]),
  };

  const response = await adsServices.getAllAdsFromDb(query, authOf(req));

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ads retrieved successfully",
    data: response.data,
    meta: response.meta,
  });
});

const getAdById = catchAsync(async (req, res) => {
  const response = await adsServices.getAdByIdFromDb(
    req?.params?.id,
    authOf(req),
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ad retrieved successfully",
    data: response,
  });
});

const updateAd = catchAsync(async (req, res) => {
  const imageURL = req?.photoUrl;
  const response = await adsServices.updateAdIntoDb(
    req?.params?.id,
    req?.body,
    authOf(req),
    imageURL,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ad updated successfully",
    data: response,
  });
});

const updateAdStatus = catchAsync(async (req, res) => {
  const response = await adsServices.updateAdStatusIntoDb(
    req?.params?.id,
    req?.body?.status,
    authOf(req),
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `Ad ${String(req?.body?.status).toLowerCase()} successfully`,
    data: response,
  });
});

const deleteAd = catchAsync(async (req, res) => {
  const response = await adsServices.deleteAdFromDb(
    req?.params?.id,
    authOf(req),
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ad deleted successfully",
    data: response,
  });
});

/* প্লেয়ার এই একটা কল করেই পুরো ব্রেক লিস্ট পায় */
const serveAds = catchAsync(async (req, res) => {
  const query = pick(req?.query, ["contextScope", "contextId"]);
  const response = await adsServices.serveAdsForContext(query, authOf(req));

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ads served successfully",
    data: response,
  });
});

const trackAdEvent = catchAsync(async (req, res) => {
  const response = await adsServices.trackAdEventIntoDb(
    req?.body,
    authOf(req),
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Ad event recorded",
    data: response,
  });
});

const getRunningAds = catchAsync(async (req, res) => {
  const query = pick(req?.query, ["courseId", "cycleId"]);
  const response = await adsServices.getRunningAdsFromDb(query, authOf(req));

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Running ads retrieved successfully",
    data: response,
  });
});

export const adsController = {
  createAd,
  getAllAds,
  getAdById,
  updateAd,
  updateAdStatus,
  deleteAd,
  serveAds,
  trackAdEvent,
  getRunningAds,
};
