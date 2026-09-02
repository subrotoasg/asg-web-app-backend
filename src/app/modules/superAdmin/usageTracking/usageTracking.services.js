import { prisma } from "../../../../../constants/index.js";
import { resolvePriceId, UsageTrackingClass } from "./usageTracking.helpers.js";
import AppErrors from "../../../../errors/AppErrors.js";

//Route by price unit type
const routeByUnit = async (payload = {}) => {
  const { unit } = payload;

  switch (unit) {
    case "PER_HOUR":
    case "PER_MINUTE":
      return perHourTrackingIntoDb(payload);

    case "PER_MB":
    case "PER_GB":
    case "PER_TB":
    case "BANDWIDTH":
      return perGBTrackingIntoDb(payload);

    case "PER_STUDENT":
      return perStudentTrackingIntoDb(payload);

    case "FIXED":
    case "ONE_TIME":
      return perFixedTrackingIntoDb(payload);

    case "MONTHLY":
      return perMonthlyTrackingIntoDb(payload);

    case "YEARLY":
      return perYearlyTrackingIntoDb(payload);

    case "PER_CLASS":
    case "PER_COURSE":
    case "PER_USER":
    case "PER_API_CALL":
      return perCountTrackingIntoDb(payload);

    case "CUSTOM":
    default:
      return perCustomTrackingIntoDb(payload);
  }
};

// Public entry point
const routeApiHandler = async (payload) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
  } = payload;

  if (!adminId || !courseId || !serviceId)
    throw new AppErrors(400, "adminId, courseId, serviceId are required");
  if (!unit) throw new AppErrors(400, "unit (price type) is required");
  if (!billingMonth || !billingYear)
    throw new AppErrors(400, "billingMonth and billingYear are required");

  return routeByUnit({
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
  });
};

//PER_HOUR / PER_MINUTE
const perHourTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({ courseId, adminId, serviceId, priceId, unit });
  const effectiveRate = ratePerUnit ?? amount;

  // PER_MINUTE → convert to hours
  const hours =
    unit === "PER_MINUTE" ? Number(quantity) / 60 : Number(quantity);

  return UsageTrackingClass.trackHourlyUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    hours,
    ratePerHour: effectiveRate,
    date: new Date(billingYear, billingMonth - 1, 1),
    isDefault,
  });
};

//PER_MB / PER_GB / PER_TB / BANDWIDTH
const perGBTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({ courseId, adminId, serviceId, priceId, unit });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackStorageUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    unit,
    ratePerUnit: effectiveRate,
    date: new Date(billingYear, billingMonth - 1, 1),
    isDefault,
  });
};

//PER_STUDENT
const perStudentTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({
    courseId,
    adminId,
    serviceId,
    priceId,
    unit: "PER_STUDENT",
  });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackStudentUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    studentCount: quantity,
    ratePerStudent: effectiveRate,
    month: billingMonth,
    year: billingYear,
    isDefault,
  });
};

//FIXED / ONE_TIME
const perFixedTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({ courseId, adminId, serviceId, priceId, unit });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackFixedUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    ratePerUnit: effectiveRate,
    priceType: unit,
    billingMonth,
    billingYear,
    isDefault,
  });
};

//MONTHLY — charged once per billing month
const perMonthlyTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({
    courseId,
    adminId,
    serviceId,
    priceId,
    unit: "MONTHLY",
  });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackMonthlyUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    ratePerUnit: effectiveRate,
    billingMonth,
    billingYear,
    isDefault,
  });
};

//YEARLY — charged once per billing year
const perYearlyTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    ratePerUnit,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({
    courseId,
    adminId,
    serviceId,
    priceId,
    unit: "YEARLY",
  });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackYearlyUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    ratePerUnit: effectiveRate,
    billingMonth,
    billingYear,
    isDefault,
  });
};

//PER_CLASS / PER_COURSE / PER_USER / PER_API_CALL
const perCountTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
    referenceId,
    referenceType,
    metadata,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({ courseId, adminId, serviceId, priceId, unit });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackCountUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    ratePerUnit: effectiveRate,
    billingMonth,
    billingYear,
    isDefault,
    countType: unit,
    referenceId,
    referenceType,
    metadata,
  });
};

//CUSTOM
const perCustomTrackingIntoDb = async (payload = {}) => {
  const {
    adminId,
    courseId,
    serviceId,
    priceId,
    quantity,
    billingMonth,
    billingYear,
    unit,
    ratePerUnit,
    customUnit,
    description,
  } = payload;

  const {
    priceId: resolvedPriceId,
    isDefault,
    amount,
  } = await resolvePriceId({
    courseId,
    adminId,
    serviceId,
    priceId,
    unit: unit || "CUSTOM",
  });
  const effectiveRate = ratePerUnit ?? amount;

  return UsageTrackingClass.trackCustomUsage({
    adminId,
    courseId,
    serviceId,
    offeringPriceId: isDefault ? null : resolvedPriceId,
    defaultServicePriceId: isDefault ? resolvedPriceId : null,
    quantity,
    ratePerUnit: effectiveRate,
    billingMonth,
    billingYear,
    isDefault,
    customUnit: customUnit || "UNIT",
    description,
  });
};

//Admin usage overview
const allAdminUsageShow = async (query = {}) => {
  const { year, month, courseId, serviceId, page, limit } = query;
  return UsageTrackingClass.getAllAdminsUsage({
    year: year ? parseInt(year) : undefined,
    month: month ? parseInt(month) : undefined,
    courseId,
    serviceId,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  });
};

//Monthly bill generation
const monthlyBillGenerate = async (payload) => {
  const { adminId, year, month } = payload;
  if (!adminId || !year || !month)
    throw new AppErrors(400, "adminId, year, month are required");
  return UsageTrackingClass.generateMonthlyBill(
    adminId,
    parseInt(year),
    parseInt(month),
  );
};

//Bills CRUD
const getAllBillsService = async (query = {}) =>
  UsageTrackingClass.getAllBills(query);

const getBillDetailsService = async (billId) => {
  if (!billId) throw new AppErrors(400, "Bill ID is required");
  return UsageTrackingClass.getBillDetails(billId);
};

const updateBillPaymentService = async (billId, paymentData) => {
  if (!billId) throw new AppErrors(400, "Bill ID is required");
  if (!paymentData?.paidAmount)
    throw new AppErrors(400, "paidAmount is required");
  return UsageTrackingClass.updateBillPayment(billId, paymentData);
};

//Teacher helpers
const getTeacherCoursesService = async (adminId) => {
  if (!adminId) throw new AppErrors(400, "Admin ID is required");
  return UsageTrackingClass.getTeacherCourses(adminId);
};

const getTeacherServicesService = async (adminId, courseId) => {
  if (!adminId || !courseId)
    throw new AppErrors(400, "adminId and courseId are required");
  return UsageTrackingClass.getTeacherServices(adminId, courseId);
};

const getServiceWithPriceService = async (serviceId, adminId, courseId) => {
  return UsageTrackingClass.getServiceWithPrice(serviceId, adminId, courseId);
};

export const UsageTrackingServices = {
  routeApiHandler,
  perHourTrackingIntoDb,
  perGBTrackingIntoDb,
  perStudentTrackingIntoDb,
  perFixedTrackingIntoDb,
  perMonthlyTrackingIntoDb,
  perYearlyTrackingIntoDb,
  perCountTrackingIntoDb,
  perCustomTrackingIntoDb,
  monthlyBillGenerate,
  allAdminUsageShow,
  getAllBills: getAllBillsService,
  getBillDetails: getBillDetailsService,
  updateBillPayment: updateBillPaymentService,
  getTeacherCourses: getTeacherCoursesService,
  getTeacherServices: getTeacherServicesService,
  getServiceWithPrice: getServiceWithPriceService,
};
