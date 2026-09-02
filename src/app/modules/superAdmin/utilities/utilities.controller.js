import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../utlis/catchAsync.js";
import sendResponse from "../../../utlis/sendResponse.js";
import { pick } from "../../../../helper/pick.js";
import { utilitiesServices } from "./utilities.services.js";
import { pickQueryFields } from "../../student/courseStudent/courseStudent.constants.js";
import { coursesServices } from "../courses/courses.services.js";
import {
  pickQueryFieldsForActiveChat,
  pickQueryFieldsForUtilities,
} from "./utilities.constants.js";
import config from "../../../config/index.js";

const getSuperAdminInfo = catchAsync(async (req, res) => {
  const result = await utilitiesServices.getSuperAdminInfo();

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "super-admin info retrive successfull",
    data: result,
  });
});

const getStudentInfo = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await utilitiesServices.getStudentInfo(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Course students retrive Successfull",
    data: result,
  });
});

const getShopInfo = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await utilitiesServices.getShopInfo(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student shop info",
    data: result,
  });
});

const fixUid = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const studentId = req?.params?.studentId;
  const result = await utilitiesServices.fixUid(id, studentId);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student uid fix",
    data: result,
  });
});

const getStudent = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await utilitiesServices.getStudent(id);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student retrive Successfull",
    data: result,
  });
});

const getBannedStudents = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFields);
  const result = await utilitiesServices.getBannedStudents(query);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "banned students retrive Successfull",
    data: result,
  });
});

const updateStudent = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payload = req?.body;
  const result = await utilitiesServices.updateStudent(id, payload);

  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student info update successfull",
    data: result,
  });
});

const studentAction = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const payload = req?.body;
  const result = await utilitiesServices.studentAction(id, payload);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `student ${
      result?.status === "ACTIVE" ? "unban" : "ban"
    }  successfull`,
    data: result,
  });
});

const getDashboardInfo = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const result = await utilitiesServices.getDashboardInfo(id);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "dashboard info retrieved successfull",
    data: result,
  });
});

const purchaseFormWebApp = catchAsync(async (req, res) => {
  const payload = { ...req?.body, ...req?.user };
  const ip = req?.ip;
  payload.ip = ip;
  const result = await utilitiesServices.purchaseFormWebApp(payload);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(result);
});

const initPurchaseFromWebAppv1 = catchAsync(async (req, res) => {
  const payload = { ...req?.body, ...req?.user };
  // console.log(payload, "pay");
  const productId = req?.params?.id;
  const result = await utilitiesServices.initPurchaseFromWebAppv1(
    productId,
    payload,
  );

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "purchase init v1 successfull",
    data: result,
  });
});

const initPurchaseFromWebAppv2 = catchAsync(async (req, res) => {
  const payload = { ...req?.body, ...req?.user };
  // console.log(payload, "pay");
  const result = await utilitiesServices.initPurchaseFromWebAppv2(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "purchase init v2 successfull",
    data: result,
  });
});

const checkCupon = catchAsync(async (req, res) => {
  const Cupon = req?.params?.Cupon;
  const productId = req?.params?.productId;
  const result = await utilitiesServices.checkCupon(Cupon, productId);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "cupon checked successfull",
    data: result,
  });
});

const addStreamingService = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await utilitiesServices.addStreamingService(payload);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "streaming service added successfull",
    data: result,
  });
});

const addStreamingService2 = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await utilitiesServices.addStreamingService2(payload);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "streaming service 2 added successfull",
    data: result,
  });
});

const addStorageService = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await utilitiesServices.addStorageService(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "storage service added successfull",
    data: result,
  });
});

const getStudentStatus = catchAsync(async (req, res) => {
  const payload = req?.query;
  const result = await utilitiesServices.getStudentStatus(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student info retrieved successfull",
    data: result,
  });
});

const removeAuthBan = catchAsync(async (req, res) => {
  const studentId = req?.params?.id;
  const result = await utilitiesServices.removeAuthBan(studentId);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "auth ban withdraw successfull",
    data: result,
  });
});

const getActivityLogs = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFieldsForUtilities);
  const result = await utilitiesServices.getActivityLogs(payloadQuery, query);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "activity logs retrive successfull",
    data: result,
  });
});

const getNotifiedFromCrm = catchAsync(async (req, res) => {
  const key = req?.headers["apikey"];

  // console.log(req?.headers);

  // console.log(key, "key for api key");

  const result = await utilitiesServices.getNotifiedFromCrm(req?.body, key);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Notified Successfully",
    data: {},
  });
});

const studentLookupForAFS = catchAsync(async (req, res) => {
  const key = req?.headers["apikey"];
  const query = req?.query;
  const result = await utilitiesServices.studentLookupForAFS(key, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Student Lookup Successfully",
    data: result,
  });
});

const studentLookupForCAMP = catchAsync(async (req, res) => {
  const key = req?.headers["apikey"];
  const query = req?.query;
  const result = await utilitiesServices.studentLookupForCAMP(key, query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Student Lookup Successfully",
    data: result,
  });
});

const getDailyAyah = catchAsync(async (req, res) => {
  const result = await utilitiesServices.getDailyAyah();

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Your Daily Ayah",
    data: result,
  });
});

const removeStudentAccess = catchAsync(async (req, res) => {
  const body = { ...req?.body, ...req?.user };

  const result = await utilitiesServices.removeStudentAccess(body);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "student access",
    data: result,
  });
});

const getSurah = catchAsync(async (req, res) => {
  const surah = req?.params?.id;
  const result = await utilitiesServices.getSurah(surah);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "surah data retrieved",
    data: result,
  });
});

const interactionBannedUnbannedController = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await utilitiesServices.banUnbanInteractionIntoDb(payload);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `student banned successfull`,
    data: result,
  });
});

const getAllActiveChatInfoController = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;
  const query = pick(payloadQuery, pickQueryFieldsForActiveChat);
  const result = await utilitiesServices.getAllActiveChatFromDb(query);
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `All Active Chat Info Retrived Successfull`,
    data: result?.data,
    meta: result?.meta,
  });
});

const getContentBasedActiveChatController = catchAsync(async (req, res) => {
  const id = req?.params?.id;
  const query = req?.query;
  const result = await utilitiesServices.getContentBasedActiveChatInfoFromDb(
    id,
    query,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `Content or Cycle Based Info Retrived Successfull`,
    data: result?.data,
    meta: result?.meta,
  });
});

const getMediaCredentialsController = catchAsync(async (req, res) => {
  const result = await utilitiesServices.getMediaCredentialsFronDb();
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `Media Credentials Retrived Successfully`,
    data: result,
  });
});

const checkMediaCredentialsController = catchAsync(async (req, res) => {
  const hostName =
    config.node_env === "development"
      ? req.headers.host
      : req.headers["origin"] || req.headers["referer"] || "unknown";

  const result = await utilitiesServices.checkMediaCredentialsIntoDb(
    req?.body,
    hostName,
  );
  //send Response Backend
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: `Media Credentials Checked Successfully`,
    data: result,
  });
});

const addEvent = catchAsync(async (req, res) => {
  const payload = req?.body;
  const result = await utilitiesServices.addEvent(payload);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Desktop event added successfully",
    data: result,
  });
});

const getEvent = catchAsync(async (req, res) => {
  const result = await utilitiesServices.getEvent();

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Desktop event retrieved successfully",
    data: result,
  });
});

const checkGcEligibility = catchAsync(async (req, res) => {
  const query = req?.query;

  const result = await utilitiesServices.checkGcEligibility(query);

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Eligiblity checked successfully",
    data: result,
  });
});

export const utilitiesController = {
  getStudentInfo,
  getSuperAdminInfo,
  getStudent,
  checkCupon,
  getBannedStudents,
  updateStudent,
  studentAction,
  getDashboardInfo,
  purchaseFormWebApp,
  initPurchaseFromWebAppv1,
  initPurchaseFromWebAppv2,
  addStreamingService,
  addStorageService,
  getStudentStatus,
  removeAuthBan,
  getActivityLogs,
  getNotifiedFromCrm,
  studentLookupForAFS,
  studentLookupForCAMP,
  getDailyAyah,
  removeStudentAccess,
  addStreamingService2,
  getSurah,
  interactionBannedUnbannedController,
  getAllActiveChatInfoController,
  getContentBasedActiveChatController,
  getMediaCredentialsController,
  checkMediaCredentialsController,
  addEvent,
  getEvent,
  checkGcEligibility,
  fixUid,
  getShopInfo,
};
