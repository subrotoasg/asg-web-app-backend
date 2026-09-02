import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { QuoraServices } from "./quora.services.js";
import { pickQueryFields } from "./quora.constants.js";

//Create Class controllre
const postNewQuora = catchAsync(async (req, res) => {
  let bodyData = { ...req?.body, ...req?.user };
  const uploadedFiles = req?.uploadedFiles;

  const result = await QuoraServices.postNewQuora(uploadedFiles, bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Quora Posted Successfully",
    data: result,
  });
});

const forcePostQuora = catchAsync(async (req, res) => {
  const quoraId = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const result = await QuoraServices.forcePostQuora(quoraId, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Quora posted successfully",
    data: result,
  });
});

const getQuoras = catchAsync(async (req, res) => {
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);

  const result = await QuoraServices.getQuoras(token, query, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Quora Retrieved Successfully",
    data: result,
  });
});

const getQuoraDetails = catchAsync(async (req, res) => {
  const quoraId = req?.params?.id;
  const payloadQuery = req?.query;
  const body = { ...req?.body, ...req?.user };
  const query = pick(payloadQuery, pickQueryFields);

  const result = await QuoraServices.getQuoraDetails(quoraId, query, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Quora details retrieved successfully",
    data: result?.data,
    meta: result?.meta,
  });
});

const getSimilarSolvedQuoras = catchAsync(async (req, res) => {
  const quoraId = req?.params?.id;

  const result = await QuoraServices.getSimilarSolvedQuoras(quoraId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Quora details retrieved successfully",
    data: result,
  });
});

const postAnswer = catchAsync(async (req, res) => {
  const quoraId = req?.params?.id;
  const bodyData = { ...req?.body, ...req?.user };
  const uploadedFiles = req?.uploadedFiles;

  const result = await QuoraServices.postAnswer(
    quoraId,
    uploadedFiles,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "quora answer posted successfully",
    data: result,
  });
});

const markAsSolved = catchAsync(async (req, res) => {
  const answerId = req?.params?.id;
  const bodyData = { ...req?.body, ...req?.user };
  const result = await QuoraServices.markAsSolved(answerId, bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "answer marked as solve successfully",
    data: result,
  });
});

const giveUpvotes = catchAsync(async (req, res) => {
  const answerId = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const result = await QuoraServices.giveUpvotes(answerId, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "answer upvote successfully",
    data: result,
  });
});

const giveDownvotes = catchAsync(async (req, res) => {
  const answerId = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const result = await QuoraServices.giveDownvotes(answerId, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "answer downvote successfully",
    data: result,
  });
});

const commentOnAnswer = catchAsync(async (req, res) => {
  const answerId = req?.params?.id;
  const bodyData = { ...req?.body, ...req?.user };
  const uploadedFiles = req?.uploadedFiles;

  const result = await QuoraServices.commentOnAnswer(
    answerId,
    uploadedFiles,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "commented on answer successfully",
    data: result,
  });
});

const getAnswerComments = catchAsync(async (req, res) => {
  const answerId = req?.params?.id;
  const bodyData = { ...req?.body, ...req?.user };
  const result = await QuoraServices.getAnswerComments(answerId, bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "detailed answer comments retrived successful",
    data: result,
  });
});

export const QuoraController = {
  getSimilarSolvedQuoras,
  getQuoraDetails,
  postNewQuora,
  forcePostQuora,
  postAnswer,
  markAsSolved,
  giveUpvotes,
  giveDownvotes,
  getQuoras,
  commentOnAnswer,
  getAnswerComments,
};
