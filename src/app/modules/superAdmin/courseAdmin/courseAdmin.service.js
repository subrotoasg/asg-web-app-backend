import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
} from "./courseAdmin.constants.js";

const getCourseAdmin = async (courseId, adminId) => {
  const getCourse = await prisma.courseAdmin.findFirst({
    where: {
      courseId: courseId,
      adminId: adminId,
      isDeleted: false,
    },
  });
  if (getCourse)
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "this admin is already assigned to this course",
    );
  return true;
};

const getAdminsOfCourse = async (courseId, query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.courseAdmin.findMany({
    where: {
      ...where,
      courseId: courseId,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  const totalCount = await prisma.courseAdmin.count({
    where: {
      ...where,
      courseId: courseId,
      isDeleted: false,
    },
  });

  //calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate current page
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

const getAdminCourseAll = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.courseAdmin.findMany({
    where: {
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  const totalCount = await prisma.courseAdmin.count({
    where: {
      ...where,
      isDeleted: false,
    },
  });

  //calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate current page
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

const getCourseByAdminId = async (adminId, query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.courseAdmin.findMany({
    where: {
      adminId,
      ...where,
      isDeleted: false,
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });
  const totalCount = await prisma.courseAdmin.count({
    where: {
      adminId,
      ...where,
      isDeleted: false,
    },
  });
  //calculate total pages
  const totalPages = Math.ceil(totalCount / take);
  //calculate current page
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

export const courseAdminService = {
  getCourseAdmin,
  getAdminsOfCourse,
  getAdminCourseAll,
  getCourseByAdminId,
};
