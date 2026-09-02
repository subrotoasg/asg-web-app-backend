import { StatusCodes } from "http-status-codes";
import sendResponse from "../../../utlis/sendResponse.js";
import catchAsync from "../../../utlis/catchAsync.js";
import { SolverServices } from "./solver.service.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./solver.constants.js";

const registration = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const uniId = req?.photoUrl;

  const result = await SolverServices.registration(uniId, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message:
      "আপনার আবেদনটি গ্রহণ করা হয়েছে এবং বিবেচনার জন্য পাঠানো হয়েছে, আবেদনের ফলাফল আপনাকে ই-মেইলের মাধ্যমে জানানো হবে।",
    data: result,
  });
});

const getAllSolvers = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await SolverServices.getAllSolvers(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All solvers retrived successfully",
    data: result,
  });
});

const acceptOrRejectRegistration = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const body = { ...req?.body, ...req?.user };

  const result = await SolverServices.acceptOrRejectRegistration(id, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "application resolved successfully",
    data: result,
  });
});

export const SolverController = {
  acceptOrRejectRegistration,
  registration,
  getAllSolvers,
};
