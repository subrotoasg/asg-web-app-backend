import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";

//get All Template controller
const GetAllTemplate = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await TemplateServices.getAllTemplatefromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All Template retrive Successfull",
    data: result,
  });
});

//get single Template controller
const GetSingleTemplate = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await TemplateServices.getSingleTemplatefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Template retrive Successfull",
    data: result,
  });
});

//Create Template controller
const createTemplate = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const TemplateImage = req.photoUrl;
  const result = await TemplateServices.createTemplateIntoDb(
    TemplateImage,
    bodyData
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Template Created Successfull",
    data: result,
  });
});

//Update Template controller
const updateTemplate = catchAsync(async (req, res) => {
  const TemplateId = req.params.id;
  const TemplateImage = req.photoUrl;
  const bodyData = req?.body;
  const result = await TemplateServices.updateTemplateIntoDb(
    TemplateId,
    TemplateImage,
    bodyData
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Template Updated Successfull",
    data: result,
  });
});

//Delete Template controller
const deleteTemplate = catchAsync(async (req, res) => {
  const TemplateId = req.params.id;
  const result = await TemplateServices.deleteTemplateFromDb(TemplateId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Template Deleted Successfull",
    data: result,
  });
});

export const TemplateController = {
  createTemplate,
  updateTemplate,
  GetAllTemplate,
  GetSingleTemplate,
  deleteTemplate,
};
