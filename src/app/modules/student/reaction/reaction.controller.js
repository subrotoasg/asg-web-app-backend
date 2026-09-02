import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { ReactionServices } from "./reaction.services.js";

//get All Reaction controller
const GetAllReaction = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await ReactionServices.getAllReactionfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Reaction retrive Successfull",
    data: result,
  });
});

//get single Reaction controller
const GetMySingleReaction = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const user = req?.body;
  const result = await ReactionServices.getMyreactionFromDb({ ...user, id });

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "My Reaction retrive Successfull",
    data: result,
  });
});
//get single Reaction controller
const GetSingleReaction = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await ReactionServices.getSingleReactionfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Reaction retrive Successfull",
    data: result,
  });
});

//Create Reaction controller
const createReaction = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const user = req?.user;
  const body = { ...bodyData, ...user };
  const result = await ReactionServices.createReactionIntoDb(body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Reaction Created Successfull",
    data: result,
  });
});

//Update Reaction controller
const updateReaction = catchAsync(async (req, res) => {
  const ReactionId = req.params.id;
  const bodyData = req?.body;
  const result = await ReactionServices.updateReactionIntoDb(
    ReactionId,
    bodyData
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Reaction Updated Successfull",
    data: result,
  });
});

//Delete Reaction controller
const deleteReaction = catchAsync(async (req, res) => {
  const ReactionId = req.params.id;
  const result = await ReactionServices.deleteReactionFromDb(ReactionId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Reaction Deleted Successfull",
    data: result,
  });
});

export const ReactionController = {
  createReaction,
  updateReaction,
  GetAllReaction,
  GetSingleReaction,
  deleteReaction,
  GetMySingleReaction,
};
