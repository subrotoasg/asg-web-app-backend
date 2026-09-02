import { StatusCodes } from "http-status-codes";
import sendResponse from "../../../utlis/sendResponse.js";
import catchAsync from "../../../utlis/catchAsync.js";
import { CycleServices } from "./cycle.services.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "../../superAdmin/courses/courses.constants.js";
import { pickQueryForCourseBasedId } from "./cycle.constants.js";

//get All Cycle controller
const GetAllCycle = catchAsync(async (req, res) => {
  const query = pick(req?.query, pickQueryFields);
  const body = { ...req?.body, ...req?.user };
  const result = await CycleServices.getAllCyclefromDb(query, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Cycle retrive Successfull",
    data: result,
  });
});

const getAllArchiveCycles = catchAsync(async (req, res) => {
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const result = await CycleServices.getAllArchiveCycles(query, token);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Archieve cycles retrive Successfull",
    data: result,
  });
});

const getArchiveCycleByCycleId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CycleServices.getArchiveCycleByCycleId(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Archive Cycle retrive Successfull",
    data: result,
  });
});

//get single Cycle controller
const GetSingleCycle = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await CycleServices.getSingleCyclefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle retrive Successfull",
    data: result,
  });
});

const GetAllCyclebyCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const token = req?.headers["x-access-token"];
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForCourseBasedId);

  const result = await CycleServices.GetAllCyclebyCourseId(id, query, token);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle retrive Successfull",
    data: result,
  });
});

//Create Cycle controller
const createCycle = catchAsync(async (req, res) => {
  let body = req?.body;
  body = { ...body, ...req?.user };
  const CycleImage = req?.photoUrl;

  const result = await CycleServices.createCycleIntoDb(CycleImage, body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Created Successfull",
    data: result,
  });
});

//Update Cycle controller
const updateCycle = catchAsync(async (req, res) => {
  const CycleId = req.params.id;
  const CycleImage = req.photoUrl;
  let body = req?.body;
  body = { ...body, ...req?.user };
  const result = await CycleServices.updateCycleIntoDb(
    CycleId,
    CycleImage,
    body,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Updated Successfull",
    data: result,
  });
});

//Delete Cycle controller
const deleteCycle = catchAsync(async (req, res) => {
  const CycleId = req.params.id;
  const result = await CycleServices.deleteCycleFromDb(CycleId, req?.body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Cycle Deleted Successfull",
    data: result,
  });
});

const downloadCycleContent = catchAsync(async (req, res) => {
  try {
    await CycleServices.downloadCycleContent(req.params.cycleId, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const getCycleStudentsInfoLink = catchAsync(async (req, res) => {
  const body = { ...req?.user, ...req?.body };
  const cycleId = req?.params?.cycleId;
  const result = await CycleServices.getCycleStudentsInfoLink(body, cycleId);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result?.message || "Download Link Send To Email.",
    data: {},
  });
});

const downloadTheFile = catchAsync(async (req, res) => {
  const cycleId = req?.params?.cycleId;
  const query = req?.query;

  try {
    await CycleServices.downloadTheFile(cycleId, query, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export const CycleController = {
  createCycle,
  updateCycle,
  GetAllCycle,
  getAllArchiveCycles,
  GetSingleCycle,
  GetAllCyclebyCourseId,
  getArchiveCycleByCycleId,
  deleteCycle,
  downloadCycleContent,
  getCycleStudentsInfoLink,
  downloadTheFile,
};
