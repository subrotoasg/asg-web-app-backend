import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { RoutineServices } from "./routine.services.js";
import { pickQueryForRoutine } from "./routine.constant.js";

const createRoutine = catchAsync(async (req, res) => {
  let body = req?.body;
  body.image = req?.photoUrl;
  body = { ...body, ...req?.user };
  const response = await RoutineServices.createRoutine(body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "routine created for course",
    data: response,
  });
});

const getAllRoutineByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForRoutine);
  const response = await RoutineServices.getAllRoutineByCourseId(id, query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "routine retrived for course",
    data: response,
  });
});

const getOneById = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await RoutineServices.getOneById(id);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "routine retrived by Id",
    data: response,
  });
});

const updateRoutine = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const body = { ...req?.body, ...req?.user };
  const image = req?.photoUrl;
  const response = await RoutineServices.updateRoutine(id, image, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "routine updated successful",
    data: response,
  });
});

const deleteRoutine = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const response = await RoutineServices.deleteRoutine(id, req?.body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "routine deleted successful",
    data: response,
  });
});

export const RoutineController = {
  createRoutine,
  getOneById,
  updateRoutine,
  deleteRoutine,
  getAllRoutineByCourseId,
};
