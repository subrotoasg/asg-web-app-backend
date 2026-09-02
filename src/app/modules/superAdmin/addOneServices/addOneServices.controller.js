import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { AddOneServiceServices } from "./addOneServices.services.js";

//get All AddOneService controller
const GetAllAddOneService = catchAsync(async (req, res) => {
  const query = req?.query;
  const result = await AddOneServiceServices.getAllAddOneServicefromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All AddOneService retrive Successfull",
    data: result,
  });
});

//get all admin and course based info controller
const getAllAddOneServicePrices = catchAsync(async (req, res) => {
  const query = req?.query;
  const result =
    await AddOneServiceServices.getAllAddOneServicePricesfromDb(query);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All AddOneService prices retrive Successfull",
    data: result,
  });
});

//get admin id based
const getAdminIdBasedAddOneServicePricesData = catchAsync(async (req, res) => {
  const query = req?.query;
  const adminId = req.params.id;
  const result =
    await AddOneServiceServices.getAdminIdBasedAddOneServicePricesfromDb(
      adminId,
      query,
    );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "All admin id based prices retrive Successfull",
    data: result,
  });
});
//get admin id and course id based
const getAdminIdAndCourseIdBasedAddOneServiceAndPrices = catchAsync(
  async (req, res) => {
    const query = req?.query;
    const adminId = req.params.id;
    const courseId = req.params.courseId;
    const result =
      await AddOneServiceServices.getAdminIdAndCourseIdBasedAddOneServiceAndPricesfromDb(
        adminId,
        courseId,
        query,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "All admin id and course id  based prices retrive Successfull",
      data: result,
    });
  },
);

//get single AddOneService controller
const GetSingleAddOneService = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await AddOneServiceServices.getSingleAddOneServicefromDb(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "AddOneService retrive Successfull",
    data: result,
  });
});

//Create AddOneService controller
const createAddOneService = catchAsync(async (req, res) => {
  const bodyData = req?.body;
  const result =
    await AddOneServiceServices.createAddOneServiceIntoDb(bodyData);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "AddOneService Created Successfull",
    data: result,
  });
});

//Update AddOneService controller
const updateAddOneService = catchAsync(async (req, res) => {
  const AddOneServiceId = req.params.id;
  const bodyData = req?.body;
  const result = await AddOneServiceServices.updateAddOneServiceIntoDb(
    AddOneServiceId,
    bodyData,
  );

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "AddOneService Updated Successfull",
    data: result,
  });
});

//Delete AddOneService controller
const deleteAddOneService = catchAsync(async (req, res) => {
  const AddOneServiceId = req.params.id;
  const result =
    await AddOneServiceServices.deleteAddOneServiceFromDb(AddOneServiceId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "AddOneService Deleted Successfull",
    data: result,
  });
});

export const AddOneServiceController = {
  createAddOneService,
  updateAddOneService,
  GetAllAddOneService,
  GetSingleAddOneService,
  deleteAddOneService,
  getAllAddOneServicePrices,
  getAdminIdBasedAddOneServicePricesData,
  getAdminIdAndCourseIdBasedAddOneServiceAndPrices,
};
