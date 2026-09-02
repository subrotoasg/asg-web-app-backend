import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
} from "./addOneServices.constant.js";
import { formatTeacherServices } from "./addOneServices.helpers.js";

//Get all AddOneService Services
const getAllAddOneServicefromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const result = await prisma.addOnService.findMany({
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
  const totalCount = await prisma.addOnService.count({
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

//Get single AddOneService Services
const getSingleAddOneServicefromDb = async (addOneServiceId) => {
  const result = await prisma.addOnService.findUnique({
    where: { id: addOneServiceId },
    select: selectFields,
  });

  return result;
};

//Create AddOneService Services
const createAddOneServiceIntoDb = async (payload = {}) => {
  const { name, description } = payload;
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.addOnService.findFirst({
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    const nextCode = Number(last?.code ?? 100) + 1;

    const data = { name, description, code: `${nextCode}` };
    try {
      return await prisma.addOnService.create({
        data,
      });
    } catch (e) {
      if (e?.code === "P2002") continue;
    }
  }
};

//Update AddOneService Services
const updateAddOneServiceIntoDb = async (addOneServiceId, payload = {}) => {
  const { name, description } = payload;
  const updatedFields = transformUpdatedFields({ name, description }, []);
  //updated Database
  const result = await prisma.addOnService.update({
    where: {
      id: addOneServiceId,
    },
    data: updatedFields,
  });
  return result;
};

//Delete AddOneService Services
const deleteAddOneServiceFromDb = async (addOneServiceId) => {
  const result = await prisma.addOnService.update({
    where: {
      id: addOneServiceId,
    },
    data: { isDeleted: true },
    select: selectFields,
  });
  return result;
};

//Exporting all services
const getAllAddOneServicePricesfromDb = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const teachersWithServices = await prisma.admin.findMany({
    where: {
      isDeleted: false,
      courseAdmin: {
        some: {
          isDeleted: false,
          course: {
            isDeleted: false,
          },
        },
      },
      ...where,
    },
    skip,
    take,
    orderBy,
    include: {
      courseAdmin: {
        where: {
          isDeleted: false,
          course: {
            isDeleted: false,
          },
        },
        include: {
          course: {
            include: {
              courseDefaultServices: {
                where: {
                  isDeleted: false,
                  isActive: true,
                  service: {
                    isDeleted: false,
                    isActive: true,
                  },
                },
                include: {
                  service: true,
                  prices: {
                    where: {
                      isDeleted: false,
                      isActive: true,
                    },
                    orderBy: [{ isDefault: "desc" }, { type: "asc" }],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const teacherIds = teachersWithServices.map((t) => t.id);

  const offerings = await prisma.courseAdminServiceOffering.findMany({
    where: {
      adminId: {
        in: teacherIds,
      },
      isDeleted: false,
      status: {
        in: ["OFFERED", "ACCEPTED"],
      },
      service: {
        isDeleted: false,
        isActive: true,
      },
    },
    include: {
      service: true,
      prices: {
        where: {
          isDeleted: false,
        },
      },
      selection: {
        include: {
          selectedPrice: true,
        },
      },
    },
  });

  const offeringsByTeacherAndCourse = {};
  offerings.forEach((offering) => {
    const key = `${offering.adminId}_${offering.courseId}`;
    if (!offeringsByTeacherAndCourse[key]) {
      offeringsByTeacherAndCourse[key] = [];
    }
    offeringsByTeacherAndCourse[key].push(offering);
  });

  for (const teacher of teachersWithServices) {
    for (const ca of teacher.courseAdmin) {
      const key = `${teacher.id}_${ca.courseId}`;
      ca.course.adminServiceOfferings = offeringsByTeacherAndCourse[key] || [];
    }
  }

  const formattedData = formatTeacherServices(teachersWithServices);

  const total = await prisma.admin.count({
    where: {
      isDeleted: false,
      courseAdmin: {
        some: {
          isDeleted: false,
          course: {
            isDeleted: false,
          },
        },
      },
      ...where,
    },
  });

  return {
    data: formattedData,
    meta: {
      total,
      skip,
      take,
    },
  };
};

//admin id based all service price show
const getAdminIdBasedAddOneServicePricesfromDb = async (
  adminId = "",
  query = {},
) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const adminWithServices = await prisma.admin.findUnique({
    where: {
      id: adminId,
      isDeleted: false,
    },
    include: {
      courseAdmin: {
        where: {
          isDeleted: false,
          course: {
            isDeleted: false,
          },
        },
        include: {
          course: {
            include: {
              courseDefaultServices: {
                where: {
                  isDeleted: false,
                  isActive: true,
                  service: {
                    isDeleted: false,
                    isActive: true,
                  },
                },
                include: {
                  service: true,
                  prices: {
                    where: {
                      isDeleted: false,
                      isActive: true,
                    },
                    orderBy: [{ isDefault: "desc" }, { type: "asc" }],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!adminWithServices) {
    return {
      data: null,
      meta: {
        total: 0,
        skip,
        take,
      },
    };
  }

  const offerings = await prisma.courseAdminServiceOffering.findMany({
    where: {
      adminId: adminId,
      isDeleted: false,
      status: {
        in: ["OFFERED", "ACCEPTED"],
      },
      service: {
        isDeleted: false,
        isActive: true,
      },
    },
    include: {
      service: true,
      prices: {
        where: {
          isDeleted: false,
        },
      },
      selection: {
        include: {
          selectedPrice: true,
        },
      },
    },
  });

  const offeringsByCourse = {};
  offerings.forEach((offering) => {
    const key = offering.courseId;
    if (!offeringsByCourse[key]) {
      offeringsByCourse[key] = [];
    }
    offeringsByCourse[key].push(offering);
  });
  for (const ca of adminWithServices.courseAdmin) {
    ca.course.adminServiceOfferings = offeringsByCourse[ca.courseId] || [];
  }
  const formattedData = formatTeacherServices([adminWithServices]);

  return {
    data: formattedData[0] || null,
    meta: {
      total: 1,
      skip,
      take,
    },
  };
};

const getAdminIdAndCourseIdBasedAddOneServiceAndPricesfromDb = async (
  adminId = "",
  courseId = "",
  query = {},
) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const adminWithServices = await prisma.admin.findUnique({
    where: {
      id: adminId,
      isDeleted: false,
    },
    include: {
      courseAdmin: {
        where: {
          courseId: courseId,
          isDeleted: false,
          course: {
            isDeleted: false,
          },
        },
        include: {
          course: {
            include: {
              courseDefaultServices: {
                where: {
                  isDeleted: false,
                  isActive: true,
                  service: {
                    isDeleted: false,
                    isActive: true,
                  },
                },
                include: {
                  service: true,
                  prices: {
                    where: {
                      isDeleted: false,
                      isActive: true,
                    },
                    orderBy: [{ isDefault: "desc" }, { type: "asc" }],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!adminWithServices || adminWithServices.courseAdmin.length === 0) {
    return {
      data: null,
      meta: {
        total: 0,
        skip,
        take,
      },
    };
  }

  const offerings = await prisma.courseAdminServiceOffering.findMany({
    where: {
      adminId: adminId,
      courseId: courseId,
      isDeleted: false,
      status: {
        in: ["OFFERED", "ACCEPTED"],
      },
      service: {
        isDeleted: false,
        isActive: true,
      },
    },
    include: {
      service: true,
      prices: {
        where: {
          isDeleted: false,
        },
      },
      selection: {
        include: {
          selectedPrice: true,
        },
      },
    },
  });

  for (const ca of adminWithServices.courseAdmin) {
    ca.course.adminServiceOfferings = offerings;
  }

  const formattedData = formatTeacherServices([adminWithServices]);

  const courseData = formattedData[0]?.courses?.find(
    (course) => course.courseId === courseId,
  );
  const selectedService =
    courseData?.services?.filter((s) => s.isSelected === true) || [];
  const defaultServices =
    courseData?.services?.filter((s) => s.type === "DEFAULT") || [];

  let allServices = [...defaultServices];

  if (
    selectedService &&
    !defaultServices.some((s) => s.serviceId === selectedService.serviceId)
  ) {
    allServices.push(...selectedService);
  }

  return {
    data: {
      teacher: formattedData[0]?.teacher,
      course: courseData,
      services: allServices,
    },
    meta: {
      total: 1,
      skip,
      take,
    },
  };
};
export const AddOneServiceServices = {
  getAllAddOneServicefromDb,
  getSingleAddOneServicefromDb,
  createAddOneServiceIntoDb,
  updateAddOneServiceIntoDb,
  deleteAddOneServiceFromDb,
  getAllAddOneServicePricesfromDb,
  getAdminIdBasedAddOneServicePricesfromDb,
  getAdminIdAndCourseIdBasedAddOneServiceAndPricesfromDb,
};
