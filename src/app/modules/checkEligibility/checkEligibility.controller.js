import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utlis/catchAsync.js";
import sendResponse from "../../utlis/sendResponse.js";
import { pick } from "../../../helper/pick.js";
import { checkEligibilityServices } from "./checkEligibility.services.js";

//get All checkEligibility controller
const GetAllcheckEligibility = catchAsync(async (req, res) => {
  const payload = req.body;
  const result =
    await checkEligibilityServices.getAllcheckEligibilityfromDb(payload);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Student based university info retrive Successfull",
    data: result?.result,
    meta: result?.suggestedCourses,
  });
});

//get All University Info controller
const GetAllUniversityInfo = catchAsync(async (req, res) => {
  const payload = req.body;
  const result =
    await checkEligibilityServices.getAllUniversityInfofromDb(payload);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All university info retrive Successfull",
    data: result,
  });
});

//get single checkEligibility controller
const GetSinglecheckEligibility = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result =
    await checkEligibilityServices.getSinglecheckEligibilityfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Single university info retrive Successfull",
    data: result,
  });
});

const GetBoardResult = catchAsync(async (req, res) => {
  const bodyData = { ...req?.body, ...req?.user };
  const result = await checkEligibilityServices.GetBoardResult(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Board result retrieved successfull.",
    data: result,
  });
});

//get HSC Routine controller
const GetHscRoutine = catchAsync(async (req, res) => {
  const result = await checkEligibilityServices.GetHscRoutineFromGoogleSheet();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "HSC Routine retrieved successfull.",
    data: result,
  });
});

export const checkEligibilityController = {
  GetAllcheckEligibility,
  GetSinglecheckEligibility,
  GetAllUniversityInfo,
  GetBoardResult,
  GetHscRoutine,
};
