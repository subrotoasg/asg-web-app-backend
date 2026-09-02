import { StatusCodes } from "http-status-codes";
import { ClassServices } from "./class.services.js";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { pickQueryFields } from "./class.constants.js";
import { pickQueryForCourseSubjectBasedId } from "../courseSubjectChapter/courseSubjectChapter.constants.js";
import config from "../../../config/index.js";

//get All Class controller
const GetAllClass = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await ClassServices.getAllClassfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Class retrive Successfull",
    data: result,
  });
});

//get single Class controller
const GetSingleClass = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const userData = req?.body;
  const result = await ClassServices.getSingleClassfromDb(id, userData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class retrive Successfull",
    data: result,
  });
});

const GetClassDownloadMetaData = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const userData = req?.body;
  const result = await ClassServices.getClassDownloadUrl(id, userData);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class metadata Successfull",
    data: result,
  });
});

//get Chepter Based All Video controller
const GetClassByCourseSubjectChapter = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryForCourseSubjectBasedId);
  const result = await ClassServices.GetClassByCourseSubjectChapter(id, query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Chapter Based all Class retrive Successfull",
    data: result,
  });
});

const GetEveryThingAboutClassByCourseId = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);

  const response = await ClassServices.GetEveryThingAboutClassByCourseId(
    id,
    query,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "subject chapter class info retrived successfull",
    data: response,
  });
});

//Create Class controller
const createClass = catchAsync(async (req, res) => {
  let bodyData = req?.body;
  // const uploadedFiles = req?.uploadedFiles;
  const thumbneil = req?.photoUrl;
  //Merge body data with login user info
  bodyData = { ...bodyData, ...req.user };
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const result = await ClassServices.createClassIntoDb(
    thumbneil,
    bodyData,
    hostName,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class Created Successfull",
    data: result,
  });
});

//Update Class controller
const updateClass = catchAsync(async (req, res) => {
  const ClassId = req?.params?.id;
  const bodyData = req?.body;
  const uploadedFiles = req?.uploadedFiles;
  const result = await ClassServices.updateClassIntoDb(
    ClassId,
    uploadedFiles,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class Updated Successfull",
    data: result,
  });
});

//Delete Class controller
const deleteClass = catchAsync(async (req, res) => {
  const ClassId = req?.params?.id;
  const result = await ClassServices.deleteClassFromDb(ClassId, req?.body);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class Deleted Successfull",
    data: result,
  });
});

const GodClass = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };
  const thumbneil = req?.photoUrl;
  const result = await ClassServices.GodClass(thumbneil, body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class created Successfull",
    data: result,
  });
});

//get single Class controller
const getSinglAuthenticationTokenBasedClassController = catchAsync(
  async (req, res) => {
    const id = req?.params?.id;
    const userData = req?.body;
    const result =
      await ClassServices.getSinglAuthenticationTokenBasedClassfromDb(
        id,
        userData,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "Class retrive Successfull",
      data: result,
    });
  },
);

//get bunny video statistics controller
const getBunnyVideoStatistics = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await ClassServices.getBunnyVideoStatisticsFromBunny(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Bunny video statistics retrive Successfull",
    data: result,
  });
});

const GetClassDownloadMetaDataV2 = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const userData = req?.body;
  const query = req?.query;
  const result = await ClassServices.GetClassDownloadMetaDataV2(
    id,
    userData,
    query,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Class metadata Successfull",
    data: result,
  });
});

const getContentToCourseInfo = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await ClassServices.contentIdToCourseInfoFromDb(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Content To Course Info Retrived Successfull",
    data: result,
  });
});

export const ClassController = {
  GodClass,
  createClass,
  updateClass,
  GetAllClass,
  GetSingleClass,
  GetClassDownloadMetaData,
  GetClassByCourseSubjectChapter,
  GetEveryThingAboutClassByCourseId,
  deleteClass,
  getSinglAuthenticationTokenBasedClassController,
  getBunnyVideoStatistics,
  GetClassDownloadMetaDataV2,
  getContentToCourseInfo,
};
