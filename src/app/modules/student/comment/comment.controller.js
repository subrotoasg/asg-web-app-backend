import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { CommentServices } from "./comment.services.js";
import { pickQueryFields } from "./comment.constant.js";
import config from "../../../config/index.js";

//get All Comment controller
const GetAllComment = catchAsync(async (req, res) => {
  const query = pick(req?.query, pickQueryFields);
  const user = req?.body;
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";
  const result = await CommentServices.getAllCommentfromDb(
    query,
    user,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Comment retrive Successfull",
    data: result?.data,
    meta: result?.meta,
  });
});

//get single Comment controller
const GetSingleComment = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CommentServices.getSingleCommentfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Comment retrive Successfull",
    data: result,
  });
});

//Create Comment controller
const createComment = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const user = req?.user;
  const body = { ...bodyData, ...user };
  const result = await CommentServices.createCommentIntoDb(body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Comment Created Successfull",
    data: result,
  });
});

//replay Comment controller
const replyToComment = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const user = req?.user;
  const body = { ...bodyData, ...user };
  const result = await CommentServices.replyToCommentIntoDb(body);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Comment Replay Successfull",
    data: result,
  });
});

//Update Comment controller
const updateComment = catchAsync(async (req, res) => {
  const CommentId = req.params.id;
  const bodyData = req?.body;
  const result = await CommentServices.updateCommentIntoDb(CommentId, bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Comment Updated Successfull",
    data: result,
  });
});

//Delete Comment controller
const deleteComment = catchAsync(async (req, res) => {
  const CommentId = req.params.id;
  const result = await CommentServices.deleteCommentFromDb(CommentId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Comment Deleted Successfull",
    data: result,
  });
});

export const CommentController = {
  createComment,
  updateComment,
  GetAllComment,
  GetSingleComment,
  replyToComment,
  deleteComment,
};
