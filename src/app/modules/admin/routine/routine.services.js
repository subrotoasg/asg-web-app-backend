import prisma from "../../../utlis/prisma.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { StatusCodes } from "http-status-codes";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import {
  selectFields,
  sendResponseFields,
  sortableFields,
} from "./routine.constant.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

const createRoutine = async (payload) => {
  const { courseId, title, description, url, image, adminId, superAdminId } =
    payload;
  const data = {
    courseId,
    title,
    description,
    url,
    image,
    adminId,
  };

  const response = await prisma.routine.create({ data: data });

  const result = pickCreateAndUpdateResponse(response, sendResponseFields);

  //log creating routing
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    }

    const getCourse = await prisma.routine.findFirst({
      where: {
        id: courseId,
      },
    });

    const logTitle = `কোর্সে নতুন রুটিন যোগ করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সে নতুন রুটিন যোগ করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging creating new routine");
  }

  return result;
};

const getAllRoutineByCourseId = async (courseId, query = {}) => {
  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);
  const isExitsCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });
  if (!isExitsCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Course not found!");

  const getAllRoutine = await prisma.routine.findMany({
    where: {
      courseId,
      isDeleted: false,
    },
    orderBy,
    select: selectFields,
  });

  return getAllRoutine;
};

const getOneById = async (routineId) => {
  const result = await prisma.routine.findUnique({
    where: {
      id: routineId,
      isDeleted: false,
    },
    select: selectFields,
  });
  return result;
};

const updateRoutine = async (id, image, payload) => {
  const { superAdminId, adminId } = payload;
  const isExist = await prisma.routine.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Routine not found!");

  const data = transformUpdatedFields(
    {
      title: payload?.title,
      description: payload?.description,
      url: payload?.url,
      image: image,
    },
    [],
  );

  const result = await prisma.routine.update({
    where: {
      id,
    },
    data: data,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log routine update
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    }
    const logTitle = `কোর্সের নতুন রুটিন যোগ করা হয়েছে`;
    const logDesc = `${creatorName} কোর্সে নতুন রুটিন যোগ করা হয়েছে`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update routine");
  }

  return response;
};

const deleteRoutine = async (id, payload) => {
  const { adminId, superAdminId } = payload;
  const isExist = await prisma.routine.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isExist)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Routine not found!");

  const result = await prisma.routine.update({
    where: {
      id,
      isDeleted: false,
    },
    data: {
      isDeleted: true,
    },
  });

  //log delete routine
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    } else if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    }
  } catch (error) {
    console.log(error, "Error logging activity on delete routine");
  }

  return true;
};

export const RoutineServices = {
  getOneById,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  getAllRoutineByCourseId,
};
