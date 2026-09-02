import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { UsageTrackingServices } from "./usageTracking.services.js";

//routes internally by unit type
const trackUsage = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.routeApiHandler(req.body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Usage tracked successfully",
    data: result,
  });
});

// Monthly bill generation
const monthlyBillGenerate = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.monthlyBillGenerate(req.body);
  return sendResponse(res, {
    statusCodes: StatusCodes.CREATED,
    success: true,
    message: "Monthly bill generated successfully",
    data: result,
  });
});

// All admin usage overview
const allAdminUsageShow = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.allAdminUsageShow(req.query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Admin usage fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

// All bills with filters
const getAllBills = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.getAllBills(req.query);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Bills retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

// Single bill details
const getBillDetails = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.getBillDetails(req.params.id);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Bill details retrieved successfully",
    data: result,
  });
});

// Record a payment against a bill
const updateBillPayment = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.updateBillPayment(
    req.params.id,
    req.body,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Payment recorded successfully",
    data: result,
  });
});

// Courses assigned to a teacher (admin)
const getTeacherCourses = catchAsync(async (req, res) => {
  const result = await UsageTrackingServices.getTeacherCourses(
    req.params.adminId,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Teacher courses retrieved successfully",
    data: result,
  });
});

// Services for a teacher in a specific course
const getTeacherServices = catchAsync(async (req, res) => {
  const { adminId, courseId } = req.params;
  const result = await UsageTrackingServices.getTeacherServices(
    adminId,
    courseId,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Teacher services retrieved successfully",
    data: result,
  });
});

// Single service with its resolved price info
const getServiceWithPrice = catchAsync(async (req, res) => {
  const { serviceId, adminId, courseId } = req.params;
  const result = await UsageTrackingServices.getServiceWithPrice(
    serviceId,
    adminId,
    courseId,
  );
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Service details retrieved successfully",
    data: result,
  });
});

export const UsageTrackingController = {
  trackUsage,
  monthlyBillGenerate,
  allAdminUsageShow,
  getAllBills,
  getBillDetails,
  updateBillPayment,
  getTeacherCourses,
  getTeacherServices,
  getServiceWithPrice,
};
