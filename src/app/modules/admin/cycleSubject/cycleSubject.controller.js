import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { CycleSubjectServices } from "./cycleSubject.services.js";
import {
  pickQueryFields,
  pickQueryForSubjectBasedId,
} from "./cycleSubject.constants.js";
import { pick } from "../../../../helper/pick.js";

//get single CycleSubject controller
const GetSingleCycleSubject = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CycleSubjectServices.getSingleCycleSubjectfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Subject retrive Successfull",
    data: result,
  });
});

//get single CycleSubject controller
const GetCycleIdBasedSubjects = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForSubjectBasedId);
  const result = await CycleSubjectServices.getSubjectBasedOnCycleIdfromDb(
    id,
    query,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Based Subjects retrive Successfull",
    data: result,
  });
});

const GetCourseBasedCycleSubject = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const response = await CycleSubjectServices.GetCourseBasedCycleSubject(
    id,
    query,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subject and chapters retrived successfull",
    data: response,
  });
});

//Create CycleSubject controller
const createCycleSubject = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const CycleSubjectImage = req?.photoUrl;
  const result = await CycleSubjectServices.createCycleSubjectIntoDb(
    CycleSubjectImage,
    body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Subject Created Successfull",
    data: result,
  });
});

//Update CycleSubject controller
const updateCycleSubject = catchAsync(async (req, res) => {
  const CycleSubjectId = req.params.id;
  const CycleSubjectImage = req?.photoUrl;
  let body = req?.body;
  body = { ...body, ...req?.user };
  const result = await CycleSubjectServices.updateCycleSubjectIntoDb(
    CycleSubjectId,
    CycleSubjectImage,
    body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Subject Updated Successfull",
    data: result,
  });
});

//Delete CycleSubject controller
const deleteCycleSubject = catchAsync(async (req, res) => {
  const CycleSubjectId = req.params.id;
  const result = await CycleSubjectServices.deleteCycleSubjectFromDb(
    CycleSubjectId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Subject Deleted Successfull",
    data: result,
  });
});

export const CycleSubjectController = {
  createCycleSubject,
  updateCycleSubject,
  GetCycleIdBasedSubjects,
  GetSingleCycleSubject,
  GetCourseBasedCycleSubject,
  deleteCycleSubject,
};
