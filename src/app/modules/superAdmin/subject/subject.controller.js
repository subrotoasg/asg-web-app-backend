import { StatusCodes } from "http-status-codes";
import { SubjectServices } from "./subject.services.js";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pickQueryFields } from "./subject.constants.js";
import { pick } from "../../../../helper/pick.js";

//get All Subject controller
const GetAllSubject = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await SubjectServices.getAllSubjectfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Subject retrive Successfull",
    data: result,
  });
});

//get single Subject controller
const GetSingleSubject = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await SubjectServices.getSingleSubjectfromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Subject retrive Successfull",
    data: result,
  });
});

//Create Subject controller
const createSubject = catchAsync(async (req, res) => {
  let bodyData = req?.body;
  const subjectImage = req.photoUrl;

  //Merge body data with login user info
  bodyData = { ...bodyData, ...req.user };

  const result = await SubjectServices.createSubjectIntoDb(
    subjectImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Subject Created Successfull",
    data: result,
  });
});

//Update Subject controller
const updateSubject = catchAsync(async (req, res) => {
  const SubjectId = req.params.id;
  const subjectImage = req.photoUrl;
  const bodyData = req?.body;

  const result = await SubjectServices.updateSubjectIntoDb(
    SubjectId,
    subjectImage,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Subject Updated Successfull",
    data: result,
  });
});

//Delete Subject controller
const deleteSubject = catchAsync(async (req, res) => {
  const SubjectId = req.params.id;
  const result = await SubjectServices.deleteSubjectFromDb(
    SubjectId,
    req?.body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Subject Deleted Successfull",
    data: result,
  });
});

export const SubjectController = {
  createSubject,
  updateSubject,
  GetAllSubject,
  GetSingleSubject,
  deleteSubject,
};
