import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { NoticeServices } from "./notice.services.js";
import { pickQueryFields, pickQueryForNotice } from "./notice.constants.js";
import config from "../../../config/index.js";

const createNotice = catchAsync(async (req, res) => {
  let body = req?.body;
  body.image = req?.photoUrl;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  body = { ...body, ...req?.user };
  const response = await NoticeServices.createNotice(body, hostName);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice created for course",
    data: response,
  });
});

const getAllNoticeByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const bodyData = req?.body;
  const response = await NoticeServices.getAllNoticeByCourseId(
    id,
    query,
    bodyData,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice retrived for course",
    data: response,
  });
});

const getAllNoticeByCycleId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForNotice);
  const bodyData = req?.body;
  const response = await NoticeServices.getAllNoticeByCycleId(
    id,
    query,
    bodyData,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice retrived for cycle",
    data: response,
  });
});

const getOneById = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await NoticeServices.getOneById(id);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice retrived by Id",
    data: response,
  });
});

const updateNotice = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const image = req?.photoUrl;
  const response = await NoticeServices.updateNotice(id, image, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice updated successful",
    data: response,
  });
});

const deleteNotice = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await NoticeServices.deleteNotice(id, req?.body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "notice deleted successful",
    data: response,
  });
});

export const NoticeController = {
  createNotice,
  getOneById,
  updateNotice,
  deleteNotice,
  getAllNoticeByCourseId,
  getAllNoticeByCycleId,
};
