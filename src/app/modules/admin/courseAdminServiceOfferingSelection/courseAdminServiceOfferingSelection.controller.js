import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { CourseAdminServiceOfferingSelectionServices } from "./courseAdminServiceOfferingSelection.services.js";

//get All CourseAdminServiceOfferingSelection controller
const GetAllCourseAdminServiceOfferingSelection = catchAsync(
  async (req, res) => {
    const query = req?.query;
    const result =
      await CourseAdminServiceOfferingSelectionServices.getAllCourseAdminServiceOfferingSelectionfromDb(
        query,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "All CourseAdminServiceOfferingSelection retrive Successfull",
      data: result,
    });
  },
);

//get single CourseAdminServiceOfferingSelection controller
const GetSingleCourseAdminServiceOfferingSelection = catchAsync(
  async (req, res) => {
    const id = req?.params?.id;
    const result =
      await CourseAdminServiceOfferingSelectionServices.getSingleCourseAdminServiceOfferingSelectionfromDb(
        id,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "CourseAdminServiceOfferingSelection retrive Successfull",
      data: result,
    });
  },
);

//Create CourseAdminServiceOfferingSelection controller
const createCourseAdminServiceOfferingSelection = catchAsync(
  async (req, res) => {
    const bodyData = req?.body;
    const result =
      await CourseAdminServiceOfferingSelectionServices.createCourseAdminServiceOfferingSelectionIntoDb(
        bodyData,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "CourseAdminServiceOfferingSelection Created Successfull",
      data: result,
    });
  },
);

//Update CourseAdminServiceOfferingSelection controller
const updateCourseAdminServiceOfferingSelection = catchAsync(
  async (req, res) => {
    const CourseAdminServiceOfferingSelectionId = req.params.id;
    const bodyData = req?.body;
    const result =
      await CourseAdminServiceOfferingSelectionServices.updateCourseAdminServiceOfferingSelectionIntoDb(
        CourseAdminServiceOfferingSelectionId,
        bodyData,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "CourseAdminServiceOfferingSelection Updated Successfull",
      data: result,
    });
  },
);

//Delete CourseAdminServiceOfferingSelection controller
const deleteCourseAdminServiceOfferingSelection = catchAsync(
  async (req, res) => {
    const CourseAdminServiceOfferingSelectionId = req.params.id;
    const result =
      await CourseAdminServiceOfferingSelectionServices.deleteCourseAdminServiceOfferingSelectionFromDb(
        CourseAdminServiceOfferingSelectionId,
      );

    //send Response Backend
    return sendResponse(res, {
      statusCodes: StatusCodes.OK,
      success: true,
      message: "CourseAdminServiceOfferingSelection Deleted Successfull",
      data: result,
    });
  },
);

export const CourseAdminServiceOfferingSelectionController = {
  createCourseAdminServiceOfferingSelection,
  updateCourseAdminServiceOfferingSelection,
  GetAllCourseAdminServiceOfferingSelection,
  GetSingleCourseAdminServiceOfferingSelection,
  deleteCourseAdminServiceOfferingSelection,
};
