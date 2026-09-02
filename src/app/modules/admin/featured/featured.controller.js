import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { featuredServices } from "./featured.services.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields, pickQueryForFeatured } from "./featured.constants.js";
import config from "../../../config/index.js";

const createFeatured = catchAsync(async (req, res) => {
  let body = req?.body;
  body.image = req?.photoUrl;
  body = { ...body, ...req?.user };
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const response = await featuredServices.createFeatured(body, hostName);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured created for course",
    data: response,
  });
});

const getAllFeaturedByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const bodyData = req?.body;
  const response = await featuredServices.getAllFeaturedByCourseId(
    id,
    query,
    bodyData,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured retrived for course",
    data: response,
  });
});

const getAllFeaturedByCycleId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForFeatured);
  const bodyData = req?.body;
  const response = await featuredServices.getAllFeaturedByCycleId(
    id,
    query,
    bodyData,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured retrived for cycle",
    data: response,
  });
});

const getOneById = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await featuredServices.getOneById(id);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured retrived by Id",
    data: response,
  });
});

const updateFeatured = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const image = req?.photoUrl;
  const response = await featuredServices.updateFeatured(id, image, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured updated successful",
    data: response,
  });
});

const deleteFeatured = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await featuredServices.deleteFeatured(id);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "featured deleted successful",
    data: response,
  });
});

export const featuredController = {
  createFeatured,
  getOneById,
  updateFeatured,
  deleteFeatured,
  getAllFeaturedByCourseId,
  getAllFeaturedByCycleId,
};
