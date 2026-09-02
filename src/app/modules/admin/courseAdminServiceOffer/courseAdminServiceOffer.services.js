import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { HttpStatusCode } from "axios";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./courseAdminServiceOffer.constant.js";
import {
  buildHostNameCondition,
  buildHostNameConditionForDefaultServices,
  calculateMonthlyBill,
  calculateMonthlyBillSummary,
  calculateYearlyBill,
  getPriceRange,
  getStatusBadge,
  getTimeRemaining,
  groupPricesByType,
} from "./courseAdminServiceOffer.helpers.js";

//Get all CourseAdminServiceOffer Services
const getAllCourseAdminServiceOfferfromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseAdminServiceOffering.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of AddOnes
  const totalCount = await prisma.courseAdminServiceOffering.count({
    where: {
      ...where,
      isDeleted: false,
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

// Get all Admin Service Offer
const getAllAdminServiceOfferFromDb = async (
  user = {},
  query = {},
  hostName,
) => {
  const { adminId } = user;

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const finalWhere = {
    ...where,
    adminId,
    AND: [
      {
        OR: [
          {
            status: "OFFERED",
          },
          {
            status: "ACCEPTED",
          },
        ],
      },
    ],

    isDeleted: false,
    ...buildHostNameCondition(hostName),
  };

  let offerings = await prisma.courseAdminServiceOffering.findMany({
    where: finalWhere,
    orderBy,
    skip,
    take,
    select: {
      id: true,
      expiresAt: true,
      serviceId: true,
      status: true,
      service: { select: { id: true, name: true, description: true } },
      courseAdmin: {
        select: {
          courseId: true,
          course: {
            select: {
              productName: true,
              productFullName: true,
              Category: true,
            },
          },
        },
      },
      prices: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          minQty: true,
          maxQty: true,
          note: true,
        },
      },
      selection: {
        select: {
          id: true,
          selectedAt: true,
          selectedPrice: {
            select: {
              id: true,
              type: true,
              amount: true,
              currency: true,
              minQty: true,
              maxQty: true,
            },
          },
        },
      },
    },
  });
  const allDefaultServices = await prisma.courseDefaultService.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      ...buildHostNameConditionForDefaultServices(hostName),
    },
    select: {
      courseId: true,
      serviceId: true,
      prices: {
        where: { isDeleted: false, isActive: true, isDefault: true },
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          minQty: true,
          maxQty: true,
          note: true,
          isActive: true,
          isDefault: true,
        },
      },
      service: { select: { id: true, name: true, description: true } },
      course: {
        select: { productName: true, productFullName: true, Category: true },
      },
    },
  });
  const defaultOnlyOfferings = allDefaultServices
    ?.filter(
      (d) =>
        !offerings.find(
          (o) =>
            o.courseAdmin.courseId === d.courseId &&
            o.serviceId === d.serviceId,
        ),
    )
    ?.map((d) => ({
      id: null,
      expiresAt: null,
      serviceId: d.serviceId,
      service: d.service,
      courseAdmin: { courseId: d.courseId, course: d.course },
      prices: d.prices,
      selection: null,
    }));

  offerings = [...offerings, ...defaultOnlyOfferings];
  const enrichedData = offerings?.map((offering) => {
    const now = new Date();
    const expiresAt = offering.expiresAt ? new Date(offering.expiresAt) : null;
    const isRunning = !expiresAt || expiresAt > now;
    const prices = offering.prices || [];
    return {
      id: offering.id,
      service: offering.service,
      serviceType:
        offering.status === "OFFERED"
          ? "SELECTED"
          : offering?.status === "ACCEPTED"
            ? "ACCEPTED"
            : "DEFAULT",
      isRunning,
      expiresAt: offering.expiresAt,
      priceSummary: { available: prices.map((p) => ({ ...p })) },
      selection: offering.selection ? { ...offering.selection } : null,
      courseAdmin: offering.courseAdmin,
    };
  });

  const [defaultCount, selectedCount, totalCount] = await Promise.all([
    prisma.courseAdminServiceOffering.count({
      where: { ...finalWhere, selection: { is: null } },
    }),
    prisma.courseAdminServiceOffering.count({
      where: { ...finalWhere, selection: { isNot: null } },
    }),
    prisma.courseAdminServiceOffering.count({ where: finalWhere }),
  ]);

  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: enrichedData,
    meta: {
      totalCount,
      totalPages,
      currentPage,
      summary: {
        defaultServices: defaultCount,
        selectedServices: selectedCount,
        totalServices: totalCount,
        runningServices: enrichedData.filter((d) => d.isRunning).length,
        expiredServices: enrichedData.filter((d) => !d.isRunning).length,
      },
    },
  };
};

//Get single CourseAdminServiceOffer Services
const getSingleCourseAdminServiceOfferfromDb = async (
  CourseAdminServiceOfferId,
) => {
  const result = await prisma.courseAdminServiceOffering.findUnique({
    where: { id: CourseAdminServiceOfferId },
    select: selectFields,
  });

  return result;
};

//Create CourseAdminServiceOffer Services
const createCourseAdminServiceOfferIntoDb = async (payload = {}) => {
  const { courseId, adminId, serviceId, note } = payload;

  const isExistAddOnService = await prisma.addOnService.findFirst({
    where: {
      id: serviceId,
      isDeleted: false,
      isActive: true,
    },
  });

  if (!isExistAddOnService) {
    throw new AppErrors(HttpStatusCode.NotFound, "Addon Service not found");
  }

  const isExistadminId = await prisma.admin.findFirst({
    where: {
      id: adminId,
      isDeleted: false,
    },
  });

  if (!isExistadminId) {
    throw new AppErrors(HttpStatusCode.NotFound, "Admin not found");
  }

  const isExistCourseId = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });

  if (!isExistCourseId) {
    throw new AppErrors(HttpStatusCode.NotFound, "Course not found");
  }

  const tempCreationData = { courseId, adminId, serviceId, note };

  const result = await prisma.courseAdminServiceOffering.create({
    data: tempCreationData,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update CourseAdminServiceOffer Services
const updateCourseAdminServiceOfferIntoDb = async (
  CourseAdminServiceOfferId,
  payload = {},
) => {
  const { serviceId, note } = payload;
  const isExistAddOnService = await prisma.addOnService.findFirst({
    where: {
      id: serviceId,
      isDeleted: false,
      isActive: true,
    },
  });

  if (!isExistAddOnService) {
    throw new AppErrors(HttpStatusCode.NotFound, "Addon Service not found");
  }

  const updatedFields = transformUpdatedFields({ serviceId, note }, []);

  // updated Database
  const result = await prisma.courseAdminServiceOffering.update({
    where: {
      id: CourseAdminServiceOfferId,
    },
    data: updatedFields,
  });

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Delete CourseAdminServiceOffer Services
const deleteCourseAdminServiceOfferFromDb = async (
  CourseAdminServiceOfferId,
) => {
  const result = await prisma.courseAdminServiceOffering.update({
    where: {
      id: CourseAdminServiceOfferId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

export const CourseAdminServiceOfferServices = {
  getAllCourseAdminServiceOfferfromDb,
  getSingleCourseAdminServiceOfferfromDb,
  createCourseAdminServiceOfferIntoDb,
  updateCourseAdminServiceOfferIntoDb,
  deleteCourseAdminServiceOfferFromDb,
  getAllAdminServiceOfferFromDb,
};
