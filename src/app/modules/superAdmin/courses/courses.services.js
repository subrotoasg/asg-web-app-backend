import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  searchableFields,
  selectFields,
  sortableFields,
  filterableFields,
  sendResponseFields,
} from "./courses.constants.js";
import axios from "axios";
import config from "../../../config/index.js";
import jwt from "jsonwebtoken";
import { Enums } from "../../../constant/enums.js";
import {
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { getFirstBodyImage } from "./courses.utils.js";
import pLimit from "p-limit";
import { activity } from "../../../../helper/activityLog.js";
import { verifyUserTokenWithSignature } from "../../authentication/auth.utlis.js";
import { Parser } from "json2csv";
import { helpers } from "../admin/admin.utils.js";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";
import {
  bumpCourseCatalogVersion,
  getCachedCourseCatalog,
} from "./courses.cache.js";

const getAllCoursesfromDb = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const { adminId, superAdminId } = payload;
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
    // decoded = jwt.verify(token, config.jwt_access_secret_key, {
    //   algorithms: ["HS256"],
    // });
    // if (!decoded) {
    //   throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid token");
    // }
  }

  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.course.findMany({
    where: {
      AND: [
        // { markAsArchieve: false },
        { ...where },
        { isDeleted: false },
        decoded?.role !== Enums.roles.SUPERADMIN &&
        decoded?.role !== Enums.roles.ADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  cycleAvailable: true,
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                    ],
                  }
                : platform
                  ? {
                      productFullName: {
                        contains: "ACS",
                      },
                    }
                  : {}
          : {},
        //new work for update
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
    orderBy: [
      {
        student: {
          _count: "desc", // 🔹 Sort by highest student count first
        },
      },
      ...(orderBy ? [orderBy] : []), // Keep your existing ordering if needed
    ],
    skip,
    take,
    select: {
      ...selectFields,
      _count: { select: { student: true } },
      cycle: {
        select: {
          _count: { select: { student: true } },
        },
      },
    },
  });

  let coursesWithEnrollmentFlag = result;

  if (decoded?.role === Enums.roles.STUDENT && result.length > 0) {
    // Get enrolled course IDs for this student
    const enrolledCourses = await prisma.courseStudent.findMany({
      where: {
        studentId: decoded?.id,
        courseId: {
          in: result.map((course) => course?.id),
        },
      },
      select: {
        courseId: true,
        status: true,
        accessCode: true,
      },
    });

    const enrolledCourseMap = new Map(
      enrolledCourses.map((enrollment) => [enrollment?.courseId, enrollment]),
    );

    coursesWithEnrollmentFlag = result.map((course) => ({
      ...course,
      isEnrolled: enrolledCourseMap.has(course?.id),
    }));
  }

  // let modifiedWithCourseFlag = coursesWithEnrollmentFlag
  //   .map((el) => {
  //     const cycleStudentTotalCount = Math.max(
  //       (el?.cycle ?? []).reduce(
  //         (sum, c) => sum + (Number(c?._count?.student || 0) ?? 0),
  //         0,
  //       ),
  //       Number(el?._count?.student || 0),
  //     );

  //     if (el?.archieveCourseId) {
  //       const getArchiveCourse = prisma.course.findFirst({
  //         where: {
  //           id: el?.archieveCourseId,
  //           isDeleted: false,
  //           markAsArchieve: true,
  //         },
  //       });

  //       if (getArchiveCourse) el.archiveCourse = getArchiveCourse?.productName;
  //     }

  //     return {
  //       ...el,
  //       cycleStudentTotalCount,
  //     };
  //   })
  //   .sort(
  //     (a, b) =>
  //       (b.cycleStudentTotalCount ?? 0) - (a.cycleStudentTotalCount ?? 0),
  //   );

  const modifiedWithCourseFlag = (
    await Promise.all(
      coursesWithEnrollmentFlag.map(async (el) => {
        const cycleStudentTotalCount = Math.max(
          (el?.cycle ?? []).reduce(
            (sum, c) => sum + Number(c?._count?.student || 0),
            0,
          ),
          Number(el?._count?.student || 0),
        );

        let archiveCourse = null;
        let archiveCourseFullName = null;

        let activeBillerCourse = null;
        let activeBillerCourseFullName = null;

        if (el?.archieveCourseId) {
          const getArchiveCourse = await prisma.course.findFirst({
            where: {
              id: el.archieveCourseId,
              isDeleted: false,
              markAsArchieve: true,
            },
          });

          archiveCourse = getArchiveCourse?.productName ?? null;
          archiveCourseFullName = getArchiveCourse?.productFullName ?? null;
        }

        if (el?.contentOwner) {
          const getActiveBiller = await prisma.course.findFirst({
            where: {
              id: el.contentOwner,
              isDeleted: false,
            },
          });

          activeBillerCourse = getActiveBiller?.productName;
          activeBillerCourseFullName = getActiveBiller?.productFullName;
        }

        return {
          ...el,
          archiveCourse,
          archiveCourseFullName,
          cycleStudentTotalCount,
          activeBillerCourse,
          activeBillerCourseFullName,
        };
      }),
    )
  ).sort(
    (a, b) => (b.cycleStudentTotalCount ?? 0) - (a.cycleStudentTotalCount ?? 0),
  );

  // total count of courses
  const totalCount = await prisma.course.count({
    where: {
      AND: [
        // { markAsArchieve: false },
        { ...where },
        { isDeleted: false },
        decoded?.role !== Enums.roles.SUPERADMIN &&
        decoded?.role !== Enums.roles.ADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  cycleAvailable: true,
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                    ],
                  }
                : platform
                  ? {
                      productFullName: {
                        contains: "ACS",
                      },
                    }
                  : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedWithCourseFlag,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//Get all Courses Services
const getAllCoursesfromDbV2 = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const { adminId, superAdminId } = payload;
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
    // decoded = jwt.verify(token, config.jwt_access_secret_key, {
    //   algorithms: ["HS256"],
    // });
    // if (!decoded) {
    //   throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid token");
    // }
  }

  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.course.findMany({
    where: {
      AND: [
        // { markAsArchieve: false },
        { ...where },
        { isDeleted: false },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? decoded?.role === Enums.roles.ADMIN
            ? hostName &&
              (hostName === config.frb_host_name ||
                hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    {
                      Category: {
                        contains: "Academic",
                      },
                    },
                    {
                      productName: {
                        contains: "FRB",
                      },
                    },
                    {
                      cycleAvailable: false,
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [
                      {
                        cycleAvailable: true,
                      },
                    ],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        {
                          Category: {
                            contains: "Admission",
                          },
                        },
                        {
                          NOT: {
                            Category: {
                              contains: "Academic",
                            },
                          },
                        },
                        {
                          cycleAvailable: false,
                        },
                      ],
                    }
                  : platform && platform === "ios"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                        ],
                      }
                    : platform && platform === "android"
                      ? {
                          AND: [
                            {
                              hasApp: true,
                            },
                          ],
                        }
                      : {}
            : hostName &&
                (hostName === config.frb_host_name ||
                  hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    {
                      Category: {
                        contains: "Academic",
                      },
                    },
                    {
                      productName: {
                        contains: "FRB",
                      },
                    },
                    {
                      productName: {
                        notIn: ["App-ios-Premium", "App-android-Premium"],
                      },
                    },
                    {
                      cycleAvailable: false,
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [
                      {
                        cycleAvailable: true,
                      },
                      {
                        productName: {
                          notIn: ["App-ios-Premium", "App-android-Premium"],
                        },
                      },
                    ],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        {
                          Category: {
                            contains: "Admission",
                          },
                        },
                        {
                          NOT: {
                            Category: {
                              contains: "Academic",
                            },
                          },
                        },
                        {
                          cycleAvailable: false,
                        },
                        {
                          productName: {
                            notIn: ["App-ios-Premium", "App-android-Premium"],
                          },
                        },
                      ],
                    }
                  : platform && platform === "ios"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                          {
                            productName: {
                              notIn: ["App-android-Premium"],
                            },
                          },
                        ],
                      }
                    : platform && platform === "android"
                      ? {
                          AND: [
                            {
                              hasApp: true,
                            },
                            {
                              productName: {
                                notIn: ["App-ios-Premium"],
                              },
                            },
                          ],
                        }
                      : {}
          : {},
        //new work for update
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
    orderBy: [
      {
        student: {
          _count: "desc", // 🔹 Sort by highest student count first
        },
      },
      ...(orderBy ? [orderBy] : []), // Keep your existing ordering if needed
    ],
    skip,
    take,
    select: {
      ...selectFields,
      _count: { select: { student: true } },
      cycle: {
        select: {
          _count: { select: { student: true } },
        },
      },
    },
  });

  let coursesWithEnrollmentFlag = result;

  if (decoded?.role === Enums.roles.STUDENT && result.length > 0) {
    // Get enrolled course IDs for this student
    const enrolledCourses = await prisma.courseStudent.findMany({
      where: {
        studentId: decoded?.id,
        courseId: {
          in: result.map((course) => course?.id),
        },
      },
      select: {
        courseId: true,
        status: true,
        accessCode: true,
      },
    });

    const enrolledCourseMap = new Map(
      enrolledCourses.map((enrollment) => [enrollment?.courseId, enrollment]),
    );

    coursesWithEnrollmentFlag = result.map((course) => ({
      ...course,
      isEnrolled: enrolledCourseMap.has(course?.id),
    }));
  }

  const priorityProduct =
    platform === "ios"
      ? "App-ios-Premium"
      : platform === "android"
        ? "App-android-Premium"
        : null;

  const modifiedWithCourseFlag = (
    await Promise.all(
      coursesWithEnrollmentFlag.map(async (el) => {
        const cycleStudentTotalCount = Math.max(
          (el?.cycle ?? []).reduce(
            (sum, c) => sum + Number(c?._count?.student || 0),
            0,
          ),
          Number(el?._count?.student || 0),
        );

        let archiveCourse = null;
        let archiveCourseFullName = null;

        let activeBillerCourse = null;
        let activeBillerCourseFullName = null;

        if (el?.archieveCourseId) {
          const getArchiveCourse = await prisma.course.findFirst({
            where: {
              id: el.archieveCourseId,
              isDeleted: false,
              markAsArchieve: true,
            },
          });

          archiveCourse = getArchiveCourse?.productName ?? null;
          archiveCourseFullName = getArchiveCourse?.productFullName ?? null;
        }

        if (el?.contentOwner) {
          const getActiveBiller = await prisma.course.findFirst({
            where: {
              id: el.contentOwner,
              isDeleted: false,
            },
          });

          activeBillerCourse = getActiveBiller?.productName;
          activeBillerCourseFullName = getActiveBiller?.productFullName;
        }

        return {
          ...el,
          archiveCourse,
          archiveCourseFullName,
          cycleStudentTotalCount,
          activeBillerCourse,
          activeBillerCourseFullName,
        };
      }),
    )
  ).sort((a, b) => {
    if (priorityProduct) {
      const aPriority = a.productName === priorityProduct ? 1 : 0;
      const bPriority = b.productName === priorityProduct ? 1 : 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
    }
    (b.cycleStudentTotalCount ?? 0) - (a.cycleStudentTotalCount ?? 0);
  });

  // total count of courses
  const totalCount = await prisma.course.count({
    where: {
      AND: [
        // { markAsArchieve: false },
        { ...where },
        { isDeleted: false },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? decoded?.role === Enums.roles.ADMIN
            ? hostName &&
              (hostName === config.frb_host_name ||
                hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    {
                      Category: {
                        contains: "Academic",
                      },
                    },
                    {
                      productName: {
                        contains: "FRB",
                      },
                    },
                    {
                      cycleAvailable: false,
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [
                      {
                        cycleAvailable: true,
                      },
                    ],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        {
                          Category: {
                            contains: "Admission",
                          },
                        },
                        {
                          NOT: {
                            Category: {
                              contains: "Academic",
                            },
                          },
                        },
                        {
                          cycleAvailable: false,
                        },
                      ],
                    }
                  : platform && platform === "ios"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                        ],
                      }
                    : platform && platform === "android"
                      ? {
                          AND: [
                            {
                              hasApp: true,
                            },
                          ],
                        }
                      : {}
            : hostName &&
                (hostName === config.frb_host_name ||
                  hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    {
                      Category: {
                        contains: "Academic",
                      },
                    },
                    {
                      productName: {
                        contains: "FRB",
                      },
                    },
                    {
                      productName: {
                        notIn: ["App-ios-Premium", "App-android-Premium"],
                      },
                    },
                    {
                      cycleAvailable: false,
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [
                      {
                        cycleAvailable: true,
                      },
                      {
                        productName: {
                          notIn: ["App-ios-Premium", "App-android-Premium"],
                        },
                      },
                    ],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        {
                          Category: {
                            contains: "Admission",
                          },
                        },
                        {
                          NOT: {
                            Category: {
                              contains: "Academic",
                            },
                          },
                        },
                        {
                          cycleAvailable: false,
                        },
                        {
                          productName: {
                            notIn: ["App-ios-Premium", "App-android-Premium"],
                          },
                        },
                      ],
                    }
                  : platform && platform === "ios"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                          {
                            productName: {
                              notIn: ["App-android-Premium"],
                            },
                          },
                        ],
                      }
                    : platform && platform === "android"
                      ? {
                          AND: [
                            {
                              hasApp: true,
                            },
                            {
                              productName: {
                                notIn: ["App-ios-Premium"],
                              },
                            },
                          ],
                        }
                      : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedWithCourseFlag,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const loadAllCoursesfromDbV3 = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const { adminId, superAdminId } = payload;
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
  }

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.course.findMany({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? decoded?.role === Enums.roles.ADMIN
            ? hostName &&
              (hostName === config.frb_host_name ||
                hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    { Category: { contains: "Academic" } },
                    { productName: { contains: "FRB" } },
                    { cycleAvailable: false },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [{ cycleAvailable: true }],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        { Category: { contains: "Admission" } },
                        { NOT: { Category: { contains: "Academic" } } },
                        { cycleAvailable: false },
                      ],
                    }
                  : platform && platform === "ios"
                    ? { AND: [{ hasApp: true }] }
                    : platform && platform === "android"
                      ? { AND: [{ hasApp: true }] }
                      : {}
            : hostName &&
                (hostName === config.frb_host_name ||
                  hostName === config.frb_local_host_name)
              ? {
                  AND: [
                    { Category: { contains: "Academic" } },
                    { productName: { contains: "FRB" } },
                    {
                      productName: {
                        notIn: ["App-ios-Premium", "App-android-Premium"],
                      },
                    },
                    { cycleAvailable: false },
                  ],
                }
              : hostName &&
                  (hostName === config.academic_host_name ||
                    hostName === config.academic_local_host_name)
                ? {
                    AND: [
                      { cycleAvailable: true },
                      {
                        productName: {
                          notIn: ["App-ios-Premium", "App-android-Premium"],
                        },
                      },
                    ],
                  }
                : hostName &&
                    (hostName === config.varsity_host_name ||
                      hostName === config.medical_host_name ||
                      hostName === config.engineering_host_name ||
                      hostName === config.admission_host_name)
                  ? {
                      AND: [
                        { Category: { contains: "Admission" } },
                        { NOT: { Category: { contains: "Academic" } } },
                        { cycleAvailable: false },
                        {
                          productName: {
                            notIn: ["App-ios-Premium", "App-android-Premium"],
                          },
                        },
                      ],
                    }
                  : platform && platform === "ios"
                    ? {
                        AND: [
                          { hasApp: true },
                          { productName: { notIn: ["App-android-Premium"] } },
                        ],
                      }
                    : platform && platform === "android"
                      ? {
                          AND: [
                            { hasApp: true },
                            { productName: { notIn: ["App-ios-Premium"] } },
                          ],
                        }
                      : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: { adminId: decoded?.id },
              },
            }),
        },
      ],
    },

    ...(orderBy ? { orderBy: [orderBy] } : {}),
    select: {
      ...selectFields,
      _count: { select: { student: true } },
      cycle: {
        select: {
          _count: { select: { student: true } },
        },
      },
      createdAt: true,
    },
  });

  const coursesForCatalog = result;

  const priorityProduct =
    platform === "ios"
      ? "App-ios-Premium"
      : platform === "android"
        ? "App-android-Premium"
        : null;

  const archiveIds = [
    ...new Set(
      coursesForCatalog.map((el) => el?.archieveCourseId).filter(Boolean),
    ),
  ];

  const contentOwnerIds = [
    ...new Set(coursesForCatalog.map((el) => el?.contentOwner).filter(Boolean)),
  ];

  const [archiveCourses, activeBillerCourses] = await Promise.all([
    archiveIds.length
      ? prisma.course.findMany({
          where: {
            id: { in: archiveIds },
            isDeleted: false,
            markAsArchieve: true,
          },
          select: {
            id: true,
            productName: true,
            productFullName: true,
          },
        })
      : Promise.resolve([]),
    contentOwnerIds.length
      ? prisma.course.findMany({
          where: {
            id: { in: contentOwnerIds },
            isDeleted: false,
          },
          select: {
            id: true,
            productName: true,
            productFullName: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const archiveCourseMap = new Map(archiveCourses.map((c) => [c.id, c]));
  const activeBillerMap = new Map(activeBillerCourses.map((c) => [c.id, c]));

  const withComputedFields = coursesForCatalog.map((el) => {
    const cycleStudentTotalCount = Math.max(
      (el?.cycle ?? []).reduce(
        (sum, c) => sum + Number(c?._count?.student || 0),
        0,
      ),
      Number(el?._count?.student || 0),
    );

    const archiveCourse = archiveCourseMap.get(el?.archieveCourseId);
    const activeBillerCourse = activeBillerMap.get(el?.contentOwner);

    return {
      ...el,
      archiveCourse: archiveCourse?.productName ?? null,
      archiveCourseFullName: archiveCourse?.productFullName ?? null,
      cycleStudentTotalCount,
      activeBillerCourse: activeBillerCourse?.productName,
      activeBillerCourseFullName: activeBillerCourse?.productFullName,
    };
  });

  const sorted = withComputedFields.sort((a, b) => {
    if (priorityProduct) {
      const aPriority = a.productName === priorityProduct ? 1 : 0;
      const bPriority = b.productName === priorityProduct ? 1 : 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
    }

    const countDiff =
      (b.cycleStudentTotalCount ?? 0) - (a.cycleStudentTotalCount ?? 0);
    if (countDiff !== 0) return countDiff;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const totalCount = sorted.length;
  const modifiedWithCourseFlag = sorted.slice(skip, skip + take);

  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedWithCourseFlag,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const normalizeCourseCatalogQuery = (query = {}) => ({
  page: Math.max(Number.parseInt(query.page, 10) || 1, 1),
  limit: Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 1000),
  sortBy: sortableFields.includes(query.sortBy) ? query.sortBy : "createdAt",
  sortOrder:
    String(query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc",
  searchTerm: String(query.searchTerm || "").trim(),
  filter: String(query.filter || "").trim(),
});

const getCourseCatalogHostScope = (hostName) => {
  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    return "frb";
  }

  if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    return "academic";
  }

  if (
    hostName === config.varsity_host_name ||
    hostName === config.medical_host_name ||
    hostName === config.engineering_host_name ||
    hostName === config.admission_host_name
  ) {
    return "admission";
  }

  return "other";
};

const getCourseCatalogPlatformScope = (platform) => {
  if (platform === "ios" || platform === "android") {
    return platform;
  }

  return "web";
};

const isHomepageCatalogQuery = (query) =>
  query.page === 1 &&
  query.limit === 1000 &&
  query.sortBy === "createdAt" &&
  query.sortOrder === "desc" &&
  !query.searchTerm &&
  !query.filter;

const addStudentEnrollmentFlags = async (catalog, studentId) => {
  const courseIds = catalog.data.map((course) => course.id).filter(Boolean);

  if (courseIds.length === 0) {
    return catalog;
  }

  const enrolledCourses = await prisma.courseStudent.findMany({
    where: {
      studentId,
      courseId: { in: courseIds },
    },
    select: { courseId: true },
  });
  const enrolledCourseIds = new Set(
    enrolledCourses.map((enrollment) => enrollment.courseId),
  );

  return {
    ...catalog,
    data: catalog.data.map((course) => ({
      ...course,
      isEnrolled: enrolledCourseIds.has(course.id),
    })),
  };
};

const getAllCoursesfromDbV3 = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const decoded = token ? verifyUserTokenWithSignature(token) : null;
  const normalizedQuery = normalizeCourseCatalogQuery(query);

  if (
    decoded?.role === Enums.roles.ADMIN ||
    decoded?.role === Enums.roles.SUPERADMIN
  ) {
    return loadAllCoursesfromDbV3(
      normalizedQuery,
      payload,
      token,
      hostName,
      platform,
    );
  }

  const loader = () =>
    loadAllCoursesfromDbV3(normalizedQuery, payload, null, hostName, platform);
  const catalog = isHomepageCatalogQuery(normalizedQuery)
    ? await getCachedCourseCatalog({
        hostScope: getCourseCatalogHostScope(hostName),
        platformScope: getCourseCatalogPlatformScope(platform),
        query: normalizedQuery,
        loader,
      })
    : await loader();

  if (decoded?.role === Enums.roles.STUDENT) {
    return addStudentEnrollmentFlags(catalog, decoded.id);
  }

  return catalog;
};

const GetAllArchieveCourses = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const { adminId, superAdminId } = payload;
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
    // decoded = jwt.verify(token, config.jwt_access_secret_key, {
    //   algorithms: ["HS256"],
    // });
    // if (!decoded) {
    //   throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid token");
    // }
  }

  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.course.findMany({
    where: {
      AND: [
        { markAsArchieve: true },
        { ...where },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  cycleAvailable: true,
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                    ],
                  }
                : platform
                  ? {
                      productFullName: {
                        contains: "ACS",
                      },
                    }
                  : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
    orderBy,
    skip,
    take,
    select: { ...selectFields, _count: { select: { student: true } } },
  });

  let coursesWithEnrollmentFlag = result;

  if (decoded?.role === Enums.roles.STUDENT) {
    // // Get enrolled course IDs for this student
    // const enrolledCourses = await prisma.courseStudent.findMany({
    //   where: {
    //     studentId: decoded?.id,
    //     courseId: {
    //       in: result.map((course) => course.id),
    //     },
    //   },
    //   select: {
    //     courseId: true,
    //     status: true,
    //     accessCode: true,
    //   },
    // });
    // const enrolledCourseMap = new Map(
    //   enrolledCourses.map((enrollment) => [enrollment?.courseId, enrollment])
    // );
    // coursesWithEnrollmentFlag = result.map((course) => ({
    //   ...course,
    //   isEnrolled: enrolledCourseMap.has(course?.id),
    // }));
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "you are not authorized to access this",
    );
  }

  // total count of courses
  const totalCount = await prisma.course.count({
    where: {
      AND: [
        { markAsArchieve: true },
        { ...where },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  cycleAvailable: true,
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                    ],
                  }
                : platform
                  ? {
                      productFullName: {
                        contains: "ACS",
                      },
                    }
                  : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  await Promise.all(
    coursesWithEnrollmentFlag.map(async (el) => {
      if (el?.contentOwner) {
        const getActiveBiller = await prisma.course.findFirst({
          where: {
            id: el?.contentOwner,
            isDeleted: false,
            markAsArchieve: false,
          },
        });
        return {
          ...el,
          activeBillerCourse: getActiveBiller?.productName,
          activeBillerCourseFullName: getActiveBiller?.productFullName,
        };
      }
    }),
  );

  return {
    data: coursesWithEnrollmentFlag,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const GetAllArchieveCoursesV2 = async (
  query = {},
  payload,
  token,
  hostName,
  platform,
) => {
  const { adminId, superAdminId } = payload;
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
    // decoded = jwt.verify(token, config.jwt_access_secret_key, {
    //   algorithms: ["HS256"],
    // });
    // if (!decoded) {
    //   throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid token");
    // }
  }

  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.course.findMany({
    where: {
      AND: [
        { markAsArchieve: true },
        { ...where },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    productName: {
                      notIn: ["App-ios-Premium", "App-android-Premium"],
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  AND: [
                    {
                      cycleAvailable: true,
                    },
                    {
                      productName: {
                        notIn: ["App-ios-Premium", "App-android-Premium"],
                      },
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                      {
                        productName: {
                          notIn: ["App-ios-Premium", "App-android-Premium"],
                        },
                      },
                    ],
                  }
                : platform && platform === "ios"
                  ? {
                      AND: [
                        {
                          hasApp: true,
                        },
                        {
                          productName: {
                            notIn: ["App-android-Premium"],
                          },
                        },
                      ],
                    }
                  : platform && platform === "android"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                          {
                            productName: {
                              notIn: ["App-ios-Premium"],
                            },
                          },
                        ],
                      }
                    : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
    orderBy,
    skip,
    take,
    select: { ...selectFields, _count: { select: { student: true } } },
  });

  let coursesWithEnrollmentFlag = result;

  if (decoded?.role === Enums.roles.STUDENT) {
    // // Get enrolled course IDs for this student
    // const enrolledCourses = await prisma.courseStudent.findMany({
    //   where: {
    //     studentId: decoded?.id,
    //     courseId: {
    //       in: result.map((course) => course.id),
    //     },
    //   },
    //   select: {
    //     courseId: true,
    //     status: true,
    //     accessCode: true,
    //   },
    // });
    // const enrolledCourseMap = new Map(
    //   enrolledCourses.map((enrollment) => [enrollment?.courseId, enrollment])
    // );
    // coursesWithEnrollmentFlag = result.map((course) => ({
    //   ...course,
    //   isEnrolled: enrolledCourseMap.has(course?.id),
    // }));
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "you are not authorized to access this",
    );
  }

  // total count of courses
  const totalCount = await prisma.course.count({
    where: {
      AND: [
        { markAsArchieve: true },
        { ...where },
        decoded?.role !== Enums.roles.SUPERADMIN
          ? hostName &&
            (hostName === config.frb_host_name ||
              hostName === config.frb_local_host_name)
            ? {
                AND: [
                  {
                    Category: {
                      contains: "Academic",
                    },
                  },
                  {
                    productName: {
                      contains: "FRB",
                    },
                  },
                  {
                    productName: {
                      notIn: ["App-ios-Premium", "App-android-Premium"],
                    },
                  },
                  {
                    cycleAvailable: false,
                  },
                ],
              }
            : hostName &&
                (hostName === config.academic_host_name ||
                  hostName === config.academic_local_host_name)
              ? {
                  AND: [
                    {
                      cycleAvailable: true,
                    },
                    {
                      productName: {
                        notIn: ["App-ios-Premium", "App-android-Premium"],
                      },
                    },
                  ],
                }
              : hostName &&
                  (hostName === config.varsity_host_name ||
                    hostName === config.medical_host_name ||
                    hostName === config.engineering_host_name ||
                    hostName === config.admission_host_name)
                ? {
                    AND: [
                      {
                        Category: {
                          contains: "Admission",
                        },
                      },
                      {
                        NOT: {
                          Category: {
                            contains: "Academic",
                          },
                        },
                      },
                      {
                        cycleAvailable: false,
                      },
                      {
                        productName: {
                          notIn: ["App-ios-Premium", "App-android-Premium"],
                        },
                      },
                    ],
                  }
                : platform && platform === "ios"
                  ? {
                      AND: [
                        {
                          hasApp: true,
                        },
                        {
                          productName: {
                            notIn: ["App-android-Premium"],
                          },
                        },
                      ],
                    }
                  : platform && platform === "android"
                    ? {
                        AND: [
                          {
                            hasApp: true,
                          },
                          {
                            productName: {
                              notIn: ["App-ios-Premium"],
                            },
                          },
                        ],
                      }
                    : {}
          : {},
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              courseAdmin: {
                some: {
                  adminId: decoded?.id,
                },
              },
            }),
        },
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  await Promise.all(
    coursesWithEnrollmentFlag.map(async (el) => {
      if (el?.contentOwner) {
        const getActiveBiller = await prisma.course.findFirst({
          where: {
            id: el?.contentOwner,
            isDeleted: false,
            markAsArchieve: false,
          },
        });
        return {
          ...el,
          activeBillerCourse: getActiveBiller?.productName,
          activeBillerCourseFullName: getActiveBiller?.productFullName,
        };
      }
    }),
  );

  return {
    data: coursesWithEnrollmentFlag,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

//Get single Courses Services
const getSingleCoursesfromDb = async (courseId) => {
  const isExist = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Not Found");

  const result = await prisma.course.findFirst({
    where: {
      AND: [
        {
          id: courseId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    select: {
      ...selectFields,
      _count: { select: { student: true } },
    },
  });

  let getActiveBiller = null;
  if (result?.contentOwner) {
    getActiveBiller = await prisma.course.findFirst({
      where: {
        id: result?.contentOwner,
        isDeleted: false,
        markAsArchieve: false,
      },
    });
  }

  return {
    ...result,
    activeBillerCourse: getActiveBiller?.productName,
    activeBillerCourseFullName: getActiveBiller?.productFullName,
  };
};

const getArchieveCourseByCourseId = async (id) => {
  const getCourse = await prisma.course.findUnique({
    where: {
      id: id,
    },
  });

  if (!getCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "no course found.");

  if (!getCourse?.archieveCourseId) return null;

  const archieveCourseId = await prisma.course.findUnique({
    where: {
      id: getCourse?.archieveCourseId,
    },
    select: {
      ...selectFields,
      _count: { select: { student: true } },
    },
  });

  let getActiveBiller = null;

  if (archieveCourseId?.contentOwner) {
    getActiveBiller = await prisma.course.findFirst({
      where: {
        id: archieveCourseId?.contentOwner,
        isDeleted: false,
        markAsArchieve: false,
      },
    });
  }

  return {
    ...archieveCourseId,
    activeBillerCourse: getActiveBiller?.productName,
    activeBillerCourseFullName: getActiveBiller?.productFullName,
  };
};

//Create Courses Services
const createCoursesIntoDb = async (payload, courseImage) => {
  const { title, cycleAvailable, superAdminId } = payload;
  const data = {
    title,
    cycleAvailable,
    superAdminId,
    courseImage,
  };

  //Save database
  const result = await prisma.course.create({
    data,
  });
  await bumpCourseCatalogVersion();

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update Courses Services
const updateCoursesIntoDb = async (courseId, courseImage, payload) => {
  const {
    title,
    productFullName,
    cycleAvailable,
    markAsArchieve,
    archieveCourseId,
    isFree,
    affiliate,
    libraryId,
    bunnyApiKey,
    streamClientId,
    streamAuthKey,
    cdnConfig,
    streamBunnyApiKey,
    superAdminId,
  } = payload;

  if (courseId === archieveCourseId)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "self archieve not supported");

  const isExist = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Not Found");

  //updated fields
  const data = transformUpdatedFields(
    {
      title,
      productFullName: productFullName,
      cycleAvailable,
      ProductImage: courseImage,
      markAsArchieve:
        markAsArchieve === "true"
          ? true
          : markAsArchieve === "false"
            ? false
            : null,
      isCourseFree:
        isFree === "true" ? true : isFree === "false" ? false : null,
      archieveCourseId,
      affiliateProductIds: affiliate && affiliate.length > 0 ? affiliate : null,
      libraryId: libraryId,
      clientId: streamClientId,
      authKey: streamAuthKey,
      cdnConfig: cdnConfig,
      bunnyApiKey: streamBunnyApiKey,
    },
    [],
  );

  let getLibApi;

  if (libraryId) {
    getLibApi = await prisma.libApi.findFirst({
      where: {
        libraryId: libraryId,
      },
    });

    if (!getLibApi || !getLibApi?.apiKey) {
      if (!bunnyApiKey)
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "when given new library id, related bunny api key is must",
        );

      await prisma.libApi.create({
        data: {
          libraryId: libraryId,
          apiKey: bunnyApiKey,
        },
      });
    }
  }

  const existImageUrl = isExist?.courseImage;
  const isUpdatedImage = data?.courseImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // //await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.course.update({
    where: {
      id: courseId,
    },
    data,
  });

  let childCourses = [];
  //manage markAsArchive if the course is the active biller of some course
  if (markAsArchieve === "true") {
    const getAllChildCourses = await prisma.course.findMany({
      where: {
        contentOwner: isExist?.id,
        isDeleted: false,
        markAsArchieve: true,
        ...(isExist?.archieveCourseId
          ? {
              id: {
                not: isExist.archieveCourseId,
              },
            }
          : {}),
      },
    });

    childCourses = getAllChildCourses.map((el) => ({
      id: el?.id,
      productName: el?.productName,
    }));

    const childCoursesIds = childCourses.map((el) => el?.id);
    //now replace contentOwner
    const childData = {
      contentOwner: null,
    };
    const deleteContentOwners = await prisma.course.updateMany({
      where: {
        id: {
          in: childCoursesIds,
        },
      },
      data: childData,
    });
  }

  //finish manage active biller

  if (result && result?.markAsArchieve && isExist?.cycleAvailable) {
    const getAllCourseCycle = await prisma.cycle.updateMany({
      where: {
        courseId: courseId,
        markAsArchieve: false,
      },
      data: {
        markAsArchieve: true,
      },
    });
  }
  if (result && !result?.markAsArchieve && isExist?.cycleAvailable) {
    const getAllCourseCycle = await prisma.cycle.updateMany({
      where: {
        courseId: courseId,
        markAsArchieve: true,
      },
      data: {
        markAsArchieve: false,
      },
    });
  }

  //Modify Response
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log course info update
  try {
    let creatorName = "";
    if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    }
    const logTitle = `কোর্সের তথ্য আপডেট করা হয়েছে`;
    const logDesc = `${creatorName}, "${isExist?.productName}" কোর্সের তথ্য আপডেট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on update course");
  }

  await bumpCourseCatalogVersion();

  return { ...response, childCourses };
};

//Delete Course Services
const deleteCourseFromDb = async (courseId, payload = {}) => {
  const { superAdminId } = payload;

  const isExist = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.course.update({
    where: {
      id: courseId,
    },
    data,
  });

  //manage active biller state of the course
  const getAllChildCourses = await prisma.course.findMany({
    where: {
      contentOwner: isExist?.id,
      isDeleted: false,
      markAsArchieve: true,
      ...(isExist?.archieveCourseId
        ? {
            id: {
              not: isExist.archieveCourseId,
            },
          }
        : {}),
    },
  });

  const childCourses = getAllChildCourses.map((el) => ({
    id: el?.id,
    productName: el?.productName,
  }));

  const childCoursesIds = getAllChildCourses.map((el) => el?.id);

  const childData = { contentOwner: null };

  const deleteContentOwners = await prisma.course.updateMany({
    where: {
      id: {
        in: childCoursesIds,
      },
    },
    data: childData,
  });

  //finish active biller stat

  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const logTitle = `একটি কোর্স ডিলিট করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email} "${isExist?.productName}" কোর্সটি ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on deleting course info");
  }

  await bumpCourseCatalogVersion();

  return {
    childCourses,
    message: "ডিলিট করা কোর্সটি অন্যকিছু কোর্সের একটিভ বিলার",
  };
};

const pullCourse = async (payload) => {
  const { productId, superAdminId, affiliate, libraryId, bunnyApiKey, isFree } =
    payload;
  const getCourse = await axios.get(
    `https://crm.apars.shop/product/edit?productId=${productId}&uid=${config.crmApiKey}`,
  );
  // console.log(getCourse?.data);
  if (!getCourse?.data?.product)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course not found");

  const theData = {
    courseId: getCourse?.data?.product?._id,
    productId: productId,
    productName: getCourse?.data?.product?.productName,
    productFullName: getCourse?.data?.product?.productFullName,
    ProductImage: getCourse?.data?.product?.ProductImage,
    Parent: getCourse?.data?.product?.Parent,
    Platinum: getCourse?.data?.product?.Platinum,
    Category: getCourse?.data?.product?.Category,
    SubCategory: getCourse?.data?.product?.SubCategory,
    currency_amount: getCourse?.data?.product?.currency_amount,
    Permalink: getCourse?.data?.product?.Permalink,
    facebookGroup: getCourse?.data?.product?.fb_Link,
    superAdminId: superAdminId,
    affiliateProductIds: affiliate && affiliate?.length > 0 ? affiliate : null,
    libraryId: libraryId,
  };

  const sanitizedData = transformUpdatedFields(theData, []);

  let getLibApi;

  const getSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      id: superAdminId,
    },
  });

  const logTitle = `নতুন একটি কোর্স ওয়েব-এপ এ পুল করা হয়েছে`;
  const logDesc = `${superAdminId?.name} "${getCourse?.data?.product?.productFullName}" কোর্সটি ওয়েব-এপ এ পুল করেছেন`;
  const logType = Enums.logType.course;

  if (libraryId) {
    getLibApi = await prisma.libApi.findFirst({
      where: {
        libraryId: libraryId,
      },
    });

    if (!getLibApi || !getLibApi?.apiKey) {
      if (!bunnyApiKey)
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "when given new library id, related bunny api key is must",
        );

      await prisma.libApi.create({
        data: {
          libraryId: libraryId,
          apiKey: bunnyApiKey,
        },
      });
    }
  }

  if (
    getCourse?.data?.product?.Cycle ||
    (getCourse?.data?.product?.Category.includes("Academic") &&
      (getCourse?.data?.product?.Webapp.includes("academic") ||
        !getCourse?.data?.product?.productName.includes("FRB")))
  ) {
    let checkCourse = await prisma.course.findFirst({
      where: {
        productName: getCourse?.data?.product?.productName,
      },
    });

    if (!checkCourse) {
      const link = getCourse?.data?.product?.Permalink || "";

      const coursePermalink = link.replace(/\/(Cycle[^/]*)(?=\/|$)/g, "");

      const gotImage = await getFirstBodyImage(coursePermalink);
      const courseImage = getCourse?.data?.product?.ProductImage || gotImage;
      //
      checkCourse = await prisma.course.create({
        data: {
          courseId: getCourse?.data?.product?._id,
          productName: getCourse?.data?.product?.productName,
          productFullName: getCourse?.data?.product?.productFullName,
          ProductImage: courseImage,
          Parent: getCourse?.data?.product?.Parent,
          Platinum: getCourse?.data?.product?.Platinum,
          Category: getCourse?.data?.product?.Category,
          Permalink: coursePermalink,
          SubCategory: getCourse?.data?.product?.SubCategory,
          superAdminId: superAdminId,
          cycleAvailable: true,
        },
      });
      await logLookUpTable(checkCourse?.id, checkCourse?.id);

      //create course quora daily limit
      const createLimit = await prisma.courseQuoraDailyLimit.create({
        data: {
          courseId: checkCourse?.id,
        },
      });
    }

    const checkCourseCycle = await prisma.cycle.findFirst({
      where: {
        courseId: checkCourse?.id,
        productId: productId,
      },
    });

    const cycelData = {
      courseId: checkCourse?.id,
      productId: productId,
      title:
        getCourse?.data?.product?.Cycle ||
        getCourse?.data?.product?.productFullName,
      cycleFullName: getCourse?.data?.product?.productFullName,
      cycleImage: getCourse?.data?.product?.ProductImage,
      Permalink: getCourse?.data?.product?.Permalink,
      facebookGroup: getCourse?.data?.product?.fb_Link,
      affiliateProductIds:
        affiliate && affiliate?.length > 0 ? affiliate : null,
      libraryId: libraryId,
      isCycleFree: isFree === "true" ? true : false,
      currency_amount: getCourse?.data?.product?.currency_amount,
    };

    const sanitizedCycleData = transformUpdatedFields(cycelData, []);

    if (checkCourseCycle) {
      const updateCourseCycle = await prisma.cycle.update({
        where: {
          id: checkCourseCycle?.id,
        },
        data: sanitizedCycleData,
      });
      await logLookUpTable(updateCourseCycle?.id, checkCourse?.id);
      await logCycleLookUpTable(checkCourseCycle?.id, checkCourseCycle?.id);
    } else {
      const createCourseCycle = await prisma.cycle.create({
        data: sanitizedCycleData,
      });
      await logLookUpTable(createCourseCycle?.id, checkCourse?.id);
      await logCycleLookUpTable(createCourseCycle?.id, createCourseCycle?.id);
    }
  } else {
    sanitizedData.isCourseFree = isFree === "true" ? true : false;

    const checkProduct = await prisma.course.findFirst({
      where: {
        productId: productId,
      },
    });

    if (checkProduct) {
      const updateCourse = await prisma.course.update({
        where: {
          id: checkProduct?.id,
        },
        data: sanitizedData,
      });
      //upsert to course lookup
      await logLookUpTable(checkProduct?.id, checkProduct?.id);
      await bumpCourseCatalogVersion();
      return updateCourse;
    } else {
      const pushCourse = await prisma.course.create({
        data: sanitizedData,
      });
      //upsert to course lookup
      await logLookUpTable(pushCourse?.id, pushCourse?.id);

      //create course quora daily limit
      const createDailyLimit = await prisma.courseQuoraDailyLimit.create({
        data: {
          courseId: pushCourse?.id,
        },
      });

      await bumpCourseCatalogVersion();
      return pushCourse;
    }
  }
  try {
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity");
  }

  await bumpCourseCatalogVersion();
};

const cloneCourseOrCycle = async (payload) => {
  const { productName, productFullName, courseOrCycleId, type, superAdminId } =
    payload;
  if (type === Enums.cloneType.course) {
    // manage a full course deep clone
    await prisma.$transaction(async (tx) => {
      const findCourse = await tx.course.findFirst({
        where: {
          id: courseOrCycleId,
          isDeleted: false,
        },
      });

      if (!findCourse) {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "course not found to clone",
        );
      }

      //manage content ownership
      const theContentOWner = findCourse?.contentOwner || findCourse?.id;

      const createCourse = await tx.course.create({
        data: {
          cycleAvailable: findCourse?.cycleAvailable,
          courseImage: findCourse?.courseImage,
          Category: findCourse?.Category,
          Parent: findCourse?.Parent,
          Permalink: findCourse?.Permalink,
          ProductImage: findCourse?.ProductImage,
          SubCategory: findCourse?.SubCategory,
          productFullName: productFullName || findCourse?.productFullName,
          productId: "000", // findCourse?.productId,
          affiliateProductIds: [], //findCourse?.affiliateProductIds,
          productName: productName || findCourse?.productName + "-cloned",
          Platinum: findCourse?.Platinum,
          markAsArchieve: true,
          libraryId: findCourse?.libraryId,
          contentOwner: theContentOWner,
        },
      });

      //course lookup
      await logLookUpTable(createCourse?.id, createCourse?.id, tx);

      if (findCourse?.cycleAvailable) {
        //if course cycle available
        const getCycle = await tx.cycle.findMany({
          where: {
            courseId: findCourse?.id,
            isDeleted: false,
          },
        });

        for (const cycle of getCycle) {
          const data = {
            courseId: createCourse?.id,
            productId: "000", //  cycle?.productId,
            affiliateProductIds: [], //cycle?.affiliateProductIds,
            title: cycle?.title,
            cycleImage: cycle?.cycleImage,
            markAsArchieve: true,
            Permalink: cycle?.Permalink,
            facebookGroup: cycle?.facebookGroup,
            libraryId: cycle?.libraryId,
          };

          //create one by one because need to fill lookup
          const createCycle = await tx.cycle.create({
            data: data,
          });

          await logLookUpTable(createCycle?.id, createCourse?.id, tx);
          await logCycleLookUpTable(createCycle?.id, createCycle?.id, tx);

          //now move to cycle subject
          const getCycleSubject = await tx.cycleSubject.findMany({
            where: {
              cycleId: cycle?.id,
            },
          });

          for (const cycleSubject of getCycleSubject) {
            const data = {
              cycleId: createCycle?.id,
              subjectId: cycleSubject?.subjectId,
              cycleSubjectImage: cycleSubject?.cycleSubjectImage,
              title: cycleSubject?.title,
            };

            const createCycleSubject = await tx.cycleSubject.create({
              data: data,
            });

            await logLookUpTable(createCycleSubject?.id, createCourse?.id, tx);
            await logCycleLookUpTable(
              createCycleSubject?.id,
              createCycle?.id,
              tx,
            );

            //now move to cycleSubjectChapter
            const getCycleSubjectChapter =
              await tx.cycleSubjectChapter.findMany({
                where: {
                  cycleSubjectId: cycleSubject?.id,
                },
              });

            for (const cycleSubjectChapter of getCycleSubjectChapter) {
              const data = {
                cycleSubjectId: createCycleSubject?.id,
                chapterId: cycleSubjectChapter?.chapterId,
                cycleSubjectChapterImage:
                  cycleSubjectChapter?.cycleSubjectChapterImage,
                title: cycleSubjectChapter?.title,
              };

              const createCycleSubjectChapter =
                await tx.cycleSubjectChapter.create({
                  data: data,
                });

              await logLookUpTable(
                createCycleSubjectChapter?.id,
                createCourse?.id,
                tx,
              );

              await logCycleLookUpTable(
                createCycleSubjectChapter?.id,
                createCycle?.id,
                tx,
              );

              const getCycleContent = await tx.cycleContent.findMany({
                where: {
                  cycleSubjectChapterId: cycleSubjectChapter?.id,
                },
              });

              for (const cycleContent of getCycleContent) {
                const data = {
                  cycleSubjectChapterId: createCycleSubjectChapter?.id,
                  classTitle: cycleContent?.classTitle,
                  classNo: cycleContent?.classNo,
                  videoUrl: cycleContent?.videoUrl,
                  secondaryUrl: cycleContent?.secondaryUrl,
                  thumbneil: cycleContent?.thumbneil,
                  lectureSheet: cycleContent?.lectureSheet,
                  practiceSheet: cycleContent?.practiceSheet,
                  solutionSheet: cycleContent?.solutionSheet,
                  hostingType: cycleContent?.hostingType,
                  description: cycleContent?.description,
                  instructor: cycleContent?.instructor,
                  libraryId: cycleContent?.libraryId,
                  videoId: cycleContent?.videoId,
                  markedBook: cycleContent?.markedBook,
                };

                const createCycleContent = await tx.cycleContent.create({
                  data: data,
                });

                await logLookUpTable(
                  createCycleContent?.id,
                  createCourse?.id,
                  tx,
                );
                await logCycleLookUpTable(
                  createCycleContent?.id,
                  createCycle?.id,
                  tx,
                );
              }
            }
          }
        }
      } else {
        //if course cycle not available
        const getCourseSubject = await tx.courseSubject.findMany({
          where: {
            courseId: findCourse?.id,
          },
        });

        for (const courseSubject of getCourseSubject) {
          const data = {
            courseId: createCourse?.id,
            title: courseSubject?.title,
            subjectId: courseSubject?.subjectId,
            courseSubjectImage: courseSubject?.courseSubjectImage,
          };

          const createCourseSubject = await tx.courseSubject.create({
            data: data,
          });

          await logLookUpTable(createCourseSubject?.id, createCourse?.id, tx);

          const getCourseSubjectChapter =
            await tx.courseSubjectChapter.findMany({
              where: {
                courseSubjectId: courseSubject?.id,
              },
            });

          for (const courseSubjectChapter of getCourseSubjectChapter) {
            const data = {
              chapterId: courseSubjectChapter?.chapterId,
              courseSubjectId: createCourseSubject?.id,
              courseSubjectChapterImage:
                courseSubjectChapter?.courseSubjectChapterImage,
              title: courseSubjectChapter?.title,
            };

            const createCourseSubjectChapter =
              await tx.courseSubjectChapter.create({
                data: data,
              });

            await logLookUpTable(
              createCourseSubjectChapter?.id,
              createCourse?.id,
              tx,
            );

            const getClassContent = await tx.classContent.findMany({
              where: {
                courseSubjectChapterId: courseSubjectChapter?.id,
              },
            });

            for (const classContent of getClassContent) {
              const data = {
                classTitle: classContent?.classTitle,
                courseSubjectChapterId: createCourseSubjectChapter?.id,
                classNo: classContent?.classNo,
                videoUrl: classContent?.videoUrl,
                secondaryUrl: classContent?.secondaryUrl,
                thumbneil: classContent?.thumbneil,
                lectureSheet: classContent?.lectureSheet,
                practiceSheet: classContent?.practiceSheet,
                solutionSheet: classContent?.solutionSheet,
                hostingType: classContent?.hostingType,
                description: classContent?.description,
                libraryId: classContent?.libraryId,
                instructor: classContent?.instructor,
                videoId: classContent?.videoId,
                markedBook: classContent?.markedBook,
              };

              const createClassContent = await tx.classContent.create({
                data: data,
              });

              await logLookUpTable(
                createClassContent?.id,
                createCourse?.id,
                tx,
              );
            }
          }
        }
      }
    });
  } else if (type === Enums.cloneType.cycle) {
    //manage a full course cycle deep clone
    await prisma.$transaction(async (tx) => {
      const findCycle = await tx.cycle.findFirst({
        where: {
          id: courseOrCycleId,
          isDeleted: false,
        },
      });
      if (!findCycle) {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "cycle not found to clone",
        );
      }

      const createCycle = await tx.cycle.create({
        data: {
          courseId: findCycle?.courseId,
          productId: "000",
          affiliateProductIds: [],
          title: productName || findCycle?.title,
          cycleImage: findCycle?.cycleImage,
          markAsArchieve: true,
          Permalink: findCycle?.Permalink,
          facebookGroup: findCycle?.facebookGroup,
          libraryId: findCycle?.libraryId,
        },
      });

      await logLookUpTable(createCycle?.id, findCycle?.courseId, tx);
      await logCycleLookUpTable(createCycle?.id, createCycle?.id, tx);

      const getCycleSubject = await tx.cycleSubject.findMany({
        where: {
          cycleId: findCycle?.id,
        },
      });

      for (const cycleSubject of getCycleSubject) {
        const data = {
          cycleId: createCycle?.id,
          subjectId: cycleSubject?.subjectId,
          cycleSubjectImage: cycleSubject?.cycleSubjectImage,
          title: cycleSubject?.title,
        };

        const createCycleSubject = await tx.cycleSubject.create({
          data: data,
        });

        await logLookUpTable(createCycleSubject?.id, findCycle?.courseId, tx);
        await logCycleLookUpTable(createCycleSubject?.id, createCycle?.id, tx);

        const getCycleSubjectChapter = await tx.cycleSubjectChapter.findMany({
          where: {
            cycleSubjectId: cycleSubject?.id,
          },
        });

        for (const cycleSubjectChapter of getCycleSubjectChapter) {
          const data = {
            cycleSubjectId: createCycleSubject?.id,
            chapterId: cycleSubjectChapter?.chapterId,
            cycleSubjectChapterImage:
              cycleSubjectChapter?.cycleSubjectChapterImage,
            title: cycleSubjectChapter?.title,
          };

          const createCycleSubjectChapter = await tx.cycleSubjectChapter.create(
            {
              data: data,
            },
          );
          await logLookUpTable(
            createCycleSubjectChapter?.id,
            findCycle?.courseId,
            tx,
          );
          await logCycleLookUpTable(
            createCycleSubjectChapter?.id,
            createCycle?.id,
            tx,
          );

          const getCycleContent = await tx.cycleContent.findMany({
            where: {
              cycleSubjectChapterId: cycleSubjectChapter?.id,
            },
          });

          for (const cycleContent of getCycleContent) {
            const data = {
              cycleSubjectChapterId: createCycleSubjectChapter?.id,
              classTitle: cycleContent?.classTitle,
              classNo: cycleContent?.classNo,
              videoUrl: cycleContent?.videoUrl,
              secondaryUrl: cycleContent?.secondaryUrl,
              thumbneil: cycleContent?.thumbneil,
              lectureSheet: cycleContent?.lectureSheet,
              practiceSheet: cycleContent?.practiceSheet,
              solutionSheet: cycleContent?.solutionSheet,
              hostingType: cycleContent?.hostingType,
              description: cycleContent?.description,
              instructor: cycleContent?.instructor,
              libraryId: cycleContent?.libraryId,
              videoId: cycleContent?.videoId,
              markedBook: cycleContent?.markedBook,
            };

            const createCycleContent = await tx.cycleContent.create({
              data: data,
            });

            await logLookUpTable(
              createCycleContent?.id,
              findCycle?.courseId,
              tx,
            );
            await logCycleLookUpTable(
              createCycleContent?.id,
              createCycle?.id,
              tx,
            );
          }
        }
      }
    });
  }

  //log course clone
  try {
    const superAdminInfo = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });
    const logTitle = `কোর্স ক্লোন করা হয়েছে`;
    const logDesc = `${productFullName} কোর্সটিকে ${superAdminInfo?.name} ক্লোন করেছেন`;
    const logType = Enums.logType.course;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity");
  }

  await bumpCourseCatalogVersion();

  return true;
};

const detectContent = async (payload) => {
  const { productName, productFullName, courseOrCycleId, type, superAdminId } =
    payload;

  let bunnyDetected = false;

  if (type === Enums.cloneType.course) {
    const findCourse = await prisma.course.findFirst({
      where: {
        id: courseOrCycleId,
        isDeleted: false,
      },
    });

    if (!findCourse) {
      throw new AppErrors(StatusCodes.BAD_REQUEST, "course not found to clone");
    }

    if (findCourse?.cycleAvailable) {
      const getCycle = await prisma.cycle.findMany({
        where: {
          courseId: findCourse?.id,
          isDeleted: false,
        },
      });

      for (const cycle of getCycle) {
        const hasBunnyContent = await prisma.cycleContent.findFirst({
          where: {
            hostingType: "bunny",
            isDeleted: false,
            cycleSubjectChapter: {
              isDeleted: false,
              cycleSubject: {
                isDeleted: false,
                cycleId: cycle?.id,
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (hasBunnyContent) {
          bunnyDetected = true;
          break;
        }
      }
    } else {
      const hasBunnyContent = await prisma.classContent.findFirst({
        where: {
          hostingType: "bunny",
          isDeleted: false,
          courseSubjectChapter: {
            isDeleted: false,
            courseSubject: {
              isDeleted: false,
              courseId: findCourse?.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (hasBunnyContent) bunnyDetected = true;
    }
  }
  return bunnyDetected;
};

// const getCourseStats = async (courseId, query) => {
//   const { dateFrom, dateTo } = query;

//   if (!dateFrom || !dateTo)
//     throw new AppErrors(
//       StatusCodes.BAD_REQUEST,
//       "dateFrom and dateTo params are required",
//     );

//   const [year, month, date] = dateTo.split("-");

//   const getCourse = await prisma.course.findFirst({
//     where: {
//       id: courseId,
//     },
//   });

//   if (!getCourse)
//     throw new AppErrors(
//       StatusCodes.NOT_FOUND,
//       "course not found for statistics.",
//     );

//   const libraryId = getCourse?.libraryId;

//   const data = {};

//   try {
//     const getLibraryInfo = await axios.get(
//       `https://api.bunny.net/videolibrary/${libraryId}`,
//       {
//         headers: {
//           AccessKey: config.bunny_main_api_key,
//         },
//       },
//     );

//     const pullZoneId = getLibraryInfo?.data?.PullZoneId;

//     const storageZoneId = getLibraryInfo?.data?.StorageZoneId;

//     const getStats = await axios.get(
//       `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
//       {
//         headers: {
//           AccessKey: config.bunny_main_api_key,
//         },
//       },
//     );

//     const getStorageStats = await axios.get(
//       `https://api.bunny.net/storagezone/${storageZoneId}`,
//       {
//         headers: {
//           AccessKey: config.bunny_main_api_key,
//         },
//       },
//     );

//     data.TotalBandwidthUsed = formatBandwidth(
//       getStats?.data?.TotalBandwidthUsed,
//     )?.formatted;
//     data.TotalBandwidthUsedInGB = bytesToGB(
//       getStats?.data?.TotalBandwidthUsed,
//     )?.value;

//     data.TotalOriginTraffic = formatBandwidth(
//       getStats?.data?.TotalOriginTraffic,
//     )?.formatted;
//     data.TotalOriginTrafficInGB = bytesToGB(
//       getStats?.data?.TotalOriginTraffic,
//     )?.value;

//     data.StorageUsed = formatBandwidth(
//       getStorageStats?.data?.StorageUsed,
//     )?.formatted;
//     data.StorageUsedInGB = bytesToGB(getStorageStats?.data?.StorageUsed)?.value;

//     data.TotalRequestsServed = getStats?.data?.TotalRequestsServed;
//     data.RequestsServedChart = getStats?.data?.RequestsServedChart;

//     const rawChart = getStats?.data?.BandwidthUsedChart;

//     const formattedChart = Object.entries(rawChart).map(([date, bytes]) => {
//       const formatted = formatBandwidth(bytes);

//       const formattedInGB = bytesToGB(bytes);

//       return {
//         date,
//         bytes,
//         formatted: formatted.formatted,
//         formattedInGB: formattedInGB?.value,
//       };
//     });

//     data.BandwidthUsedChart = formattedChart;

//     const rawGeoChart = getStats?.data?.GeoTrafficDistribution;

//     const formattedGeoChart = Object.entries(rawGeoChart).map(
//       ([geo, bytes]) => {
//         const formatted = formatBandwidth(bytes);

//         const formattedInGB = bytesToGB(bytes);

//         return {
//           geo,
//           bytes,
//           formatted: formatted.formatted,
//           formattedInGB: formattedInGB?.value,
//         };
//       },
//     );

//     data.GeoTrafficDistribution = formattedGeoChart;
//   } catch (error) {
//     console.log(error, "error getting stats");
//   }

//   //check for courses with this content owner
//   const getAllChilds = await prisma.course.findMany({
//     where: {
//       contentOwner: courseId,
//       isDeleted: false,
//       markAsArchieve: true,
//     },
//     select: {
//       id: true,
//       libraryId: true,
//     },
//   });

//   let directArchiveCourse = null;

//   if (getCourse?.archieveCourseId) {
//     directArchiveCourse = await prisma.course.findFirst({
//       where: {
//         id: getCourse?.archieveCourseId,
//         isDeleted: false,
//         markAsArchieve: true,
//       },
//       select: {
//         id: true,
//         libraryId: true,
//       },
//     });
//   }

//   const uniqueLibraryIds = [
//     ...new Set(
//       [
//         getCourse?.libraryId,
//         directArchiveCourse?.libraryId,
//         ...getAllChilds.map((course) => course?.libraryId),
//       ].filter(Boolean),
//     ),
//   ];

//   let TotalBandwidthUsed = 0;

//   for (const libraryId of uniqueLibraryIds) {
//     //need to calculate for all childs the stats need to sum the stats that was calculate for archive
//     try {
//       const getLibraryInfo = await axios.get(
//         `https://api.bunny.net/videolibrary/${libraryId}`,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       const pullZoneId = getLibraryInfo?.data?.PullZoneId;
//       const storageZoneId = getLibraryInfo?.data?.StorageZoneId;

//       const getStats = await axios.get(
//         `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );

//       const getStorageStats = await axios.get(
//         `https://api.bunny.net/storagezone/${storageZoneId}`,
//         {
//           headers: {
//             AccessKey: config.bunny_main_api_key,
//           },
//         },
//       );
//     } catch (error) {}
//   }

//   //has archive then also calculate archive usage
//   if (getCourse?.archieveCourseId) {
//     const getArchiveCourse = await prisma.course.findFirst({
//       where: {
//         id: getCourse?.archieveCourseId,
//         markAsArchieve: true,
//         isDeleted: false,
//       },
//     });

//     //then calculate archive usage
//     if (getArchiveCourse && getArchiveCourse?.libraryId) {
//       const archiveLibraryId = getArchiveCourse?.libraryId;
//       try {
//         const getLibraryInfo = await axios.get(
//           `https://api.bunny.net/videolibrary/${archiveLibraryId}`,
//           {
//             headers: {
//               AccessKey: config.bunny_main_api_key,
//             },
//           },
//         );

//         const pullZoneId = getLibraryInfo?.data?.PullZoneId;
//         const storageZoneId = getLibraryInfo?.data?.StorageZoneId;

//         const getStats = await axios.get(
//           `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
//           {
//             headers: {
//               AccessKey: config.bunny_main_api_key,
//             },
//           },
//         );

//         const getStorageStats = await axios.get(
//           `https://api.bunny.net/storagezone/${storageZoneId}`,
//           {
//             headers: {
//               AccessKey: config.bunny_main_api_key,
//             },
//           },
//         );

//         const rawChart = getStats?.data?.BandwidthUsedChart;

//         const formattedChart = Object.entries(rawChart).map(([date, bytes]) => {
//           const formatted = formatBandwidth(bytes);

//           const formattedInGB = bytesToGB(bytes);

//           return {
//             date,
//             bytes,
//             formatted: formatted.formatted,
//             formattedInGB: formattedInGB?.value,
//           };
//         });

//         const rawGeoChart = getStats?.data?.GeoTrafficDistribution;

//         const formattedGeoChart = Object.entries(rawGeoChart).map(
//           ([geo, bytes]) => {
//             const formatted = formatBandwidth(bytes);

//             const formattedInGB = bytesToGB(bytes);

//             return {
//               geo,
//               bytes,
//               formatted: formatted.formatted,
//               formattedInGB: formattedInGB?.value,
//             };
//           },
//         );

//         data.courseArchiveStats = {
//           TotalBandwidthUsed: formatBandwidth(
//             getStats?.data?.TotalBandwidthUsed,
//           )?.formatted,
//           TotalBandwidthUsedInGB: bytesToGB(getStats?.data?.TotalBandwidthUsed)
//             ?.value,
//           TotalOriginTraffic: formatBandwidth(
//             getStats?.data?.TotalOriginTraffic,
//           )?.formatted,
//           TotalOriginTrafficInGB: bytesToGB(getStats?.data?.TotalOriginTraffic)
//             ?.value,
//           StorageUsed: formatBandwidth(getStorageStats?.data?.StorageUsed)
//             ?.formatted,
//           StorageUsedInGB: bytesToGB(getStorageStats?.data?.StorageUsed)?.value,
//           TotalRequestsServed: getStats?.data?.TotalRequestsServed,
//           RequestsServedChart: getStats?.data?.RequestsServedChart,
//           BandwidthUsedChart: formattedChart,
//           GeoTrafficDistribution: formattedGeoChart,
//         };
//       } catch (error) {
//         console.log(error, "Error getting archive stats");
//       }
//     }
//   }

//   try {
//     //get streaming info
//     const getStreamingInfo = await axios.get(
//       `https://media.aparsclassroom.com/api/billing/stats?year=${year}&month=${month}`,
//       {
//         headers: {
//           "x-client-id": getCourse?.clientId,
//           "x-auth-key": getCourse?.authKey,
//         },
//       },
//     );
//     console.log(getStreamingInfo?.data);
//     data.StreamingInfo = getStreamingInfo?.data?.data;
//   } catch (error) {
//     console.log(error, "error getting stats form media aparsclassroom");
//   }

//   return data;
// };

const buildFormattedBandwidthChart = (chart = {}) => {
  return Object.entries(chart).map(([date, bytes]) => {
    const formatted = formatBandwidth(bytes);
    const formattedInGB = bytesToGB(bytes);

    return {
      date,
      bytes,
      formatted: formatted?.formatted,
      formattedInGB: formattedInGB?.value,
    };
  });
};

const buildFormattedGeoChart = (chart = {}) => {
  return Object.entries(chart).map(([geo, bytes]) => {
    const formatted = formatBandwidth(bytes);
    const formattedInGB = bytesToGB(bytes);

    return {
      geo,
      bytes,
      formatted: formatted?.formatted,
      formattedInGB: formattedInGB?.value,
    };
  });
};

const addObjectValues = (target = {}, source = {}) => {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + Number(value || 0);
  }
};

const getSingleLibraryBunnyStats = async (libraryId, dateFrom, dateTo) => {
  const getLibraryInfo = await axios.get(
    `https://api.bunny.net/videolibrary/${libraryId}`,
    {
      headers: {
        AccessKey: config.bunny_main_api_key,
      },
    },
  );

  const pullZoneId = getLibraryInfo?.data?.PullZoneId;
  const storageZoneId = getLibraryInfo?.data?.StorageZoneId;

  const [getStats, getStorageStats] = await Promise.all([
    axios.get(
      `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    ),
    axios.get(`https://api.bunny.net/storagezone/${storageZoneId}`, {
      headers: {
        AccessKey: config.bunny_main_api_key,
      },
    }),
  ]);

  return {
    TotalBandwidthUsed: Number(getStats?.data?.TotalBandwidthUsed || 0),
    TotalOriginTraffic: Number(getStats?.data?.TotalOriginTraffic || 0),
    StorageUsed: Number(getStorageStats?.data?.StorageUsed || 0),
    TotalRequestsServed: Number(getStats?.data?.TotalRequestsServed || 0),
    RequestsServedChart: getStats?.data?.RequestsServedChart || {},
    BandwidthUsedChart: getStats?.data?.BandwidthUsedChart || {},
    GeoTrafficDistribution: getStats?.data?.GeoTrafficDistribution || {},
  };
};

const formatAggregatedStats = (stats) => {
  return {
    TotalBandwidthUsed: formatBandwidth(stats.TotalBandwidthUsed)?.formatted,
    TotalBandwidthUsedInGB: bytesToGB(stats.TotalBandwidthUsed)?.value,
    TotalOriginTraffic: formatBandwidth(stats.TotalOriginTraffic)?.formatted,
    TotalOriginTrafficInGB: bytesToGB(stats.TotalOriginTraffic)?.value,
    StorageUsed: formatBandwidth(stats.StorageUsed)?.formatted,
    StorageUsedInGB: bytesToGB(stats.StorageUsed)?.value,
    TotalRequestsServed: stats.TotalRequestsServed,
    RequestsServedChart: stats.RequestsServedChart,
    BandwidthUsedChart: buildFormattedBandwidthChart(stats.BandwidthUsedChart),
    GeoTrafficDistribution: buildFormattedGeoChart(
      stats.GeoTrafficDistribution,
    ),
  };
};

const aggregateLibrariesStats = async (libraryIds = [], dateFrom, dateTo) => {
  const uniqueLibraryIds = [...new Set(libraryIds.filter(Boolean))];

  const totals = {
    TotalBandwidthUsed: 0,
    TotalOriginTraffic: 0,
    StorageUsed: 0,
    TotalRequestsServed: 0,
    RequestsServedChart: {},
    BandwidthUsedChart: {},
    GeoTrafficDistribution: {},
  };

  for (const libraryId of uniqueLibraryIds) {
    try {
      const stats = await getSingleLibraryBunnyStats(
        libraryId,
        dateFrom,
        dateTo,
      );

      totals.TotalBandwidthUsed += stats.TotalBandwidthUsed;
      totals.TotalOriginTraffic += stats.TotalOriginTraffic;
      totals.StorageUsed += stats.StorageUsed;
      totals.TotalRequestsServed += stats.TotalRequestsServed;

      addObjectValues(totals.RequestsServedChart, stats.RequestsServedChart);
      addObjectValues(totals.BandwidthUsedChart, stats.BandwidthUsedChart);
      addObjectValues(
        totals.GeoTrafficDistribution,
        stats.GeoTrafficDistribution,
      );
    } catch (error) {
      console.log(error, `error getting stats for library ${libraryId}`);
    }
  }

  return formatAggregatedStats(totals);
};

const getArchiveAndChildLibraryIds = async (mainCourse) => {
  const getAllChilds = await prisma.course.findMany({
    where: {
      contentOwner: mainCourse.id,
      isDeleted: false,
      markAsArchieve: true,
    },
    select: {
      id: true,
      libraryId: true,
    },
  });

  let directArchiveCourse = null;

  if (mainCourse?.archieveCourseId) {
    directArchiveCourse = await prisma.course.findFirst({
      where: {
        id: mainCourse.archieveCourseId,
        isDeleted: false,
        contentOwner: mainCourse?.id,
        markAsArchieve: true,
      },
      select: {
        id: true,
        libraryId: true,
      },
    });
  }

  return [
    ...new Set(
      [
        directArchiveCourse?.libraryId,
        ...getAllChilds.map((course) => course?.libraryId),
      ].filter(Boolean),
    ),
  ].filter((libraryId) => libraryId !== mainCourse?.libraryId);
};

const getCourseStats = async (courseId, query) => {
  const { dateFrom, dateTo } = query;

  if (!dateFrom || !dateTo) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "dateFrom and dateTo params are required",
    );
  }

  const [year, month] = dateTo.split("-");

  const getCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
    select: {
      id: true,
      libraryId: true,
      archieveCourseId: true,
      clientId: true,
      authKey: true,
    },
  });

  if (!getCourse) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "course not found for statistics.",
    );
  }

  const data = {};

  try {
    if (getCourse?.libraryId) {
      const mainStats = await aggregateLibrariesStats(
        [getCourse.libraryId],
        dateFrom,
        dateTo,
      );

      Object.assign(data, mainStats);
    }
  } catch (error) {
    console.log(error, "error getting main course stats");
  }

  try {
    const archiveLibraryIds = await getArchiveAndChildLibraryIds(getCourse);

    if (archiveLibraryIds.length > 0) {
      data.courseArchiveStats = await aggregateLibrariesStats(
        archiveLibraryIds,
        dateFrom,
        dateTo,
      );
    }
  } catch (error) {
    console.log(error, "error getting archive/child stats");
  }

  try {
    const getStreamingInfo = await axios.get(
      `https://media.aparsclassroom.com/api/billing/stats?year=${year}&month=${month}`,
      {
        headers: {
          "x-client-id": getCourse?.clientId,
          "x-auth-key": getCourse?.authKey,
        },
      },
    );

    data.StreamingInfo = getStreamingInfo?.data?.data;
  } catch (error) {
    console.log(error, "error getting stats form media aparsclassroom");
  }

  //now take also the malaysia server bill
  try {
    const getStreamingInfo = await axios.get(
      `https://media.asgshop.my/api/billing/stats?year=${year}&month=${month}`,
      {
        headers: {
          "x-client-id": getCourse?.clientId,
          "x-auth-key": getCourse?.authKey,
        },
      },
    );

    data.MalaysianStreamingInfo = getStreamingInfo?.data?.data;
  } catch (error) {
    console.log(
      error,
      "error getting stats form malaysian media aparsclassroom",
    );
  }

  data.chargeRate = {
    dollarRate: config.dollar_rate,
    storageRate: config.storage_charge_rate,
    bandwidthRate: config.bandwidth_charge_rate,
    approvalRate: config.approval_charge_rate,
  };

  return data;
};

const getCourseStatsForCrm = async (query = {}, crmKey) => {
  const { dateFrom, dateTo, productName } = query;

  if (!crmKey || crmKey !== config.crmApiKey) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "you are not authorized");
  }

  if (!productName) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "query params productName required",
    );
  }

  if (!dateFrom || !dateTo) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "dateFrom and dateTo params are required",
    );
  }

  const [year, month] = dateTo.split("-");

  const getCourse = await prisma.course.findFirst({
    where: {
      productName,
    },
    select: {
      id: true,
      libraryId: true,
      archieveCourseId: true,
      clientId: true,
      authKey: true,
    },
  });

  if (!getCourse) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "course not found for statistics.",
    );
  }

  const data = {};

  try {
    if (getCourse?.libraryId) {
      const mainStats = await aggregateLibrariesStats(
        [getCourse.libraryId],
        dateFrom,
        dateTo,
      );

      Object.assign(data, mainStats);
    }
  } catch (error) {
    console.log(error, "error getting main course stats");
  }

  try {
    const archiveLibraryIds = await getArchiveAndChildLibraryIds(getCourse);

    if (archiveLibraryIds.length > 0) {
      data.courseArchiveStats = await aggregateLibrariesStats(
        archiveLibraryIds,
        dateFrom,
        dateTo,
      );
    }
  } catch (error) {
    console.log(error, "error getting archive/child stats");
  }

  try {
    const getStreamingInfo = await axios.get(
      `https://media.aparsclassroom.com/api/billing/stats?year=${year}&month=${month}`,
      {
        headers: {
          "x-client-id": getCourse?.clientId,
          "x-auth-key": getCourse?.authKey,
        },
      },
    );

    data.StreamingInfo = getStreamingInfo?.data?.data;
  } catch (error) {
    console.log(error, "error getting stats form media aparsclassroom");
  }

  try {
    const getStreamingInfo = await axios.get(
      `https://media.asgshop.my/api/billing/stats?year=${year}&month=${month}`,
      {
        headers: {
          "x-client-id": getCourse?.clientId,
          "x-auth-key": getCourse?.authKey,
        },
      },
    );

    data.MalaysianStreamingInfo = getStreamingInfo?.data?.data;
  } catch (error) {
    console.log(
      error,
      "error getting stats form malaysian media aparsclassroom",
    );
  }

  data.chargeRate = {
    dollarRate: config.dollar_rate,
    storageRate: config.storage_charge_rate,
    bandwidthRate: config.bandwidth_charge_rate,
  };

  return data;
};

const getCourseEnrollStatsForCrm = async (query = {}, crmKey) => {
  const { productId } = query;

  if (!crmKey || (crmKey && crmKey !== config.crmApiKey)) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "you are not authorized");
  }

  if (!productId)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "query params productId required",
    );

  const getCourse = await prisma.course.findFirst({
    where: {
      productId: productId,
      isDeleted: false,
      markAsArchieve: false,
    },
  });

  // console.log(getCourse, "the course");

  let getEnrollCount = 0;

  if (!getCourse) return getEnrollCount;

  try {
    getEnrollCount = await prisma.courseStudent.count({
      where: {
        courseId: getCourse?.id,
      },
    });
  } catch (error) {
    console.log(error, "no course students");
  }

  return getEnrollCount;
};

function formatBandwidth(bytes, decimals = 4) {
  if (!bytes || bytes === 0) {
    return {
      value: 0,
      unit: "Bytes",
      formatted: "0 Bytes",
    };
  }

  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

  return {
    value,
    unit: sizes[i],
    formatted: `${value} ${sizes[i]}`,
  };
}

function bytesToGB(bytes, decimals = 4) {
  if (!bytes || bytes === 0) {
    return {
      value: 0,
      unit: "GB",
      formatted: "0 GB",
    };
  }

  const GB = 1024 * 1024 * 1024;
  const value = parseFloat((bytes / GB).toFixed(decimals));

  return {
    value,
    unit: "GB",
    formatted: `${value} GB`,
  };
}

const getAllCourseStats = async (query) => {
  const { dateFrom, dateTo } = query;
  const data = [];
  let TotalBandwidthAmount = 0;

  try {
    const allVideoLibrary = await axios.get(
      `https://api.bunny.net/videolibrary`,
      {
        headers: {
          AccessKey: config.bunny_main_api_key,
        },
      },
    );

    for (const libs of allVideoLibrary?.data) {
      const pullZoneId = libs?.PullZoneId;
      const storageZoneId = libs?.StorageZoneId;

      const getPullZoneInfo = await axios.get(
        `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          headers: {
            AccessKey: config.bunny_main_api_key,
          },
        },
      );

      const getStorageZoneInfo = await axios.get(
        `https://api.bunny.net/storagezone/${storageZoneId}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          headers: {
            AccessKey: config.bunny_main_api_key,
          },
        },
      );

      const obj = {};

      obj.Name = libs?.Name;

      obj.TotalBandwidthUsed = getPullZoneInfo?.data?.TotalBandwidthUsed;
      obj.TotalBandwidthUsedInGB = bytesToGB(
        getPullZoneInfo?.data?.TotalBandwidthUsed,
      );

      TotalBandwidthAmount += bytesToGB(
        getPullZoneInfo?.data?.TotalBandwidthUsed,
      )?.value;

      obj.TotalOriginTraffic = getPullZoneInfo?.data?.TotalOriginTraffic;
      obj.TotalOriginTrafficInGB = bytesToGB(
        getPullZoneInfo?.data?.TotalOriginTraffic,
      )?.formatted;

      obj.TotalRequestsServed = getPullZoneInfo?.data?.TotalRequestsServed;

      obj.StorageUsed = bytesToGB(getStorageZoneInfo?.data?.StorageUsed);

      data.push(obj);

      data.sort((a, b) => b.TotalBandwidthUsed - a.TotalBandwidthUsed);
    }
  } catch (error) {
    console.log(error?.message, "Error getting info");
  }
  return {
    data,
    TotalBandwidthAmount,
  };
};

// const getAllCourseStats = async (query) => {
//   const { dateFrom, dateTo, limit = 1000, page = 1 } = query;
//   let TotalBandwidthAmount = 0;
//   let TotalStorageAmount = 0;

//   try {
//     const allVideoLibrary = await axios.get(
//       `https://api.bunny.net/videolibrary?page=${Number(page)}&perPage=${Number(limit)}`,
//       {
//         headers: {
//           AccessKey: config.bunny_main_api_key,
//         },
//       },
//     );

//     console.log(allVideoLibrary);

//     const libraries = allVideoLibrary?.data?.Items || [];
//     const BATCH_SIZE = 5;
//     const results = [];

//     for (let i = 0; i < libraries.length; i += BATCH_SIZE) {
//       const batch = libraries.slice(i, i + BATCH_SIZE);

//       const batchPromises = batch.map(async (libs) => {
//         try {
//           const pullZoneId = libs?.PullZoneId;
//           const storageZoneId = libs?.StorageZoneId;

//           const [pullZoneInfo, storageZoneInfo] = await Promise.all([
//             axios.get(
//               `https://api.bunny.net/statistics?pullZone=${pullZoneId}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
//               {
//                 headers: { AccessKey: config.bunny_main_api_key },
//               },
//             ),
//             axios.get(
//               `https://api.bunny.net/storagezone/${storageZoneId}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
//               {
//                 headers: { AccessKey: config.bunny_main_api_key },
//               },
//             ),
//           ]);

//           const bandwidthUsed = pullZoneInfo?.data?.TotalBandwidthUsed || 0;
//           const bandwidthInGB = bytesToGB(bandwidthUsed);

//           TotalBandwidthAmount += bandwidthInGB?.value || 0;
//           TotalStorageAmount +=
//             bytesToGB(storageZoneInfo?.data?.StorageUsed)?.value || 0;

//           return {
//             Name: libs?.Name,
//             TotalBandwidthUsed: bandwidthUsed,
//             TotalBandwidthUsedInGB: bandwidthInGB,
//             TotalOriginTraffic: pullZoneInfo?.data?.TotalOriginTraffic || 0,
//             TotalOriginTrafficInGB: bytesToGB(
//               pullZoneInfo?.data?.TotalOriginTraffic,
//             )?.formatted,
//             TotalRequestsServed: pullZoneInfo?.data?.TotalRequestsServed || 0,
//             StorageUsed: bytesToGB(storageZoneInfo?.data?.StorageUsed),
//           };
//         } catch (error) {
//           console.log(`Error processing ${libs?.Name}:`, error?.message);
//           return null;
//         }
//       });

//       const batchResults = await Promise.all(batchPromises);
//       results.push(...batchResults.filter(Boolean));

//       // if (i + BATCH_SIZE < libraries.length) {
//       //   await new Promise((resolve) => setTimeout(resolve, 1000));
//       // }
//     }

//     results.sort(
//       (a, b) => (b.TotalBandwidthUsed || 0) - (a.TotalBandwidthUsed || 0),
//     );

//     return {
//       data: results,
//       TotalBandwidthAmount,
//       TotalStorageAmount,
//       CurrentPage: allVideoLibrary?.data?.CurrentPage,
//       TotalItems: allVideoLibrary?.data?.TotalItems,
//       HasMoreItems: allVideoLibrary?.data?.HasMoreItems,
//     };
//   } catch (error) {
//     console.log(error?.message, "Error getting info");
//     return { data: [], TotalBandwidthAmount: 0 };
//   }
// };

const getNoActiveBiller = async () => {
  const result = await prisma.course.findMany({
    where: {
      isDeleted: false,
      markAsArchieve: true,
      contentOwner: null,
    },
    select: selectFields,
  });

  let noActiveBillerCourses = [];

  for (const course of result) {
    const check = await prisma.course.findFirst({
      where: {
        isDeleted: false,
        markAsArchieve: false,
        archieveCourseId: course?.id,
      },
    });
    if (check) noActiveBillerCourses.push(course);
  }

  return noActiveBillerCourses;
};

const setActiveBiller = async (payload) => {
  const { courseIds, ownerCourseId } = payload;

  if (!Array.isArray(courseIds) || courseIds?.length <= 0) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "courseIds field should be an array",
    );
  }

  const checkOwnerCourse = await prisma.course.findFirst({
    where: {
      id: ownerCourseId,
      isDeleted: false,
      markAsArchieve: false,
    },
  });

  if (!checkOwnerCourse) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Appropiate owner course not found",
    );
  }

  let inappropiateCourses = [];

  const courses = await prisma.course.findMany({
    where: {
      id: {
        in: courseIds,
      },
    },
  });

  const appropiateCourse = [];

  for (const course of courses) {
    if (course?.isDeleted || !course?.markAsArchieve) {
      inappropiateCourses.push({ id: course?.id, name: course?.productName });
    } else {
      appropiateCourse.push(course?.id);
    }
  }

  const updateCourses = await prisma.course.updateMany({
    where: {
      id: {
        in: appropiateCourse,
      },
    },
    data: {
      contentOwner: ownerCourseId,
    },
  });

  await bumpCourseCatalogVersion();

  return {
    inappropiateCourses,
    message: `${courseIds?.length} টি কোর্স থেকে ${inappropiateCourses?.length} টি কোর্স এর মালিকান দেয়া যায়নি`,
  };
};

const getCourseApprovalBill = async (courseId, query = {}) => {
  const { dateFrom, dateTo } = query;

  if (!dateFrom || !dateTo) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "dateFrom and dateTo params are required",
    );
  }

  const getCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
  });

  if (!getCourse) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not found");
  }

  let productIds = [];

  if (getCourse?.cycleAvailable) {
    const getAllCycles = await prisma.cycle.findMany({
      where: {
        isDeleted: false,
        courseId: getCourse?.id,
      },
    });

    const allProductIds = [];
    for (const el of getAllCycles) {
      allProductIds.push(el?.productId);
      for (const ell of el?.affiliateProductIds) {
        allProductIds.push(ell);
      }
    }

    productIds = [...new Set(allProductIds.filter(Boolean))];
  } else {
    productIds = [
      ...new Set(
        [
          getCourse?.productId,
          ...(getCourse?.affiliateProductIds || []),
        ].filter(Boolean),
      ),
    ];
  }

  // console.log(productIds, "pds");

  if (productIds.length === 0) {
    return {
      totalApprovalCount: 0,
    };
  }

  const responses = await Promise.allSettled(
    productIds.map((productId) =>
      axios.get(
        `https://crm.apars.shop/api/${productId}/improved/date-range/${dateFrom}/${dateTo}`,
        { headers: { uid: config.crmApiKey } },
      ),
    ),
  );

  const totalApprovalCount = responses.reduce((sum, result) => {
    if (result.status !== "fulfilled") return sum;

    const responseData = result.value?.data;

    // console.log(responseData);

    if (responseData?.code === 200 && Array.isArray(responseData?.data)) {
      return sum + responseData.data.length;
    }

    return sum;
  }, 0);

  return {
    totalApprovalCount,
  };
};

const getAfsAccessCount = async (productId, apiKey) => {
  if (!apiKey || apiKey !== config.afs_crm_key) {
    throw new AppErrors(StatusCodes.FORBIDDEN, "you are not authorized");
  }

  const getCourse = await prisma.course.findFirst({
    where: {
      productId: productId,
      markAsArchieve: false,
      isDeleted: false,
    },
  });

  const getCycle = await prisma.cycle.findFirst({
    where: {
      productId: productId,
      isDeleted: false,
      markAsArchieve: false,
    },
  });

  let count = 0;

  if (getCourse) {
    const getCount = await prisma.courseStudent.count({
      where: {
        courseId: getCourse?.id,
        accessCode: {
          startsWith: "AFS",
        },
      },
    });

    count = getCount;

    return count;
  }

  if (getCycle) {
    const getCount = await prisma.cycleStudent.count({
      where: {
        cycleId: getCycle?.id,
        accessCode: {
          startsWith: "AFS",
        },
      },
    });

    count = getCount;

    return count;
  }
  return count;
};

const OMIT_FIELDS = [
  "zoneSecurityKey",
  "uniqueViews",
  "isDeleted",
  "adminId",
  "secondaryUrl",
];

const sanitizeRows = (rows) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row)
        .filter(([k]) => !OMIT_FIELDS.includes(k))
        .map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
    ),
  );

const sendCsv = (res, rows, filename) => {
  if (!rows || rows.length === 0) {
    res.status(404).json({ success: false, message: "No data found." });
    return;
  }

  const clean = sanitizeRows(rows);
  const parser = new Parser({ fields: Object.keys(clean[0]) });
  const csv = parser.parse(clean);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.csv"`,
  );
  res.status(200).end(csv);
};

const downloadCourseContent = async (courseId, res) => {
  const getCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
  });

  if (!getCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not found for data");

  const rows = await prisma.$queryRaw`
    SELECT
      cc.*,
      COALESCE(cs.title, s.title)           AS subject_name,
      COALESCE(csc.title, ch."chapterName") AS chapter_name
    FROM "classContents"  cc
    JOIN "chapters"       csc ON csc.id = cc."courseSubjectChapterId"
    JOIN "subjects"       cs  ON cs.id  = csc."courseSubjectId"
    JOIN subject          s   ON s.id   = cs."subjectId"
    JOIN chapter          ch  ON ch.id  = csc."chapterId"
    WHERE cs."courseId"   = ${courseId}::uuid
      AND cc."isDeleted"  = false
      AND csc."isDeleted" = false
      AND cs."isDeleted"  = false
    ORDER BY cs.serial, csc.serial, cc.serial
  `;

  sendCsv(res, rows, `course_contents_${courseId}`);
};

const getCourseStudentsInfoLink = async (payload, courseId) => {
  const { superAdminId } = payload;

  const getSuperAdminInfo = await prisma.superAdmin.findFirst({
    where: {
      id: superAdminId,
    },
  });

  if (!getSuperAdminInfo)
    throw new AppErrors(StatusCodes.NOT_FOUND, "requested account not found");

  const getCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
      markAsArchieve: false,
    },
  });

  if (!getCourse)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "this course in not eligible for sharing info",
    );

  const getInfo = await prisma.superAdminXStudentInfo.findFirst({
    where: {
      superAdminId: getSuperAdminInfo?.id,
      courseOrCycleId: courseId,
    },
  });

  const TEN_MINUTES_MS = 15 * 60 * 1000;
  const now = new Date();

  const lastSentAt = getInfo?.lastDownloadTime;
  const isWithinTenMinutes =
    lastSentAt &&
    now.getTime() - new Date(lastSentAt).getTime() < TEN_MINUTES_MS;

  if (isWithinTenMinutes) {
    return {
      message:
        "A Download link already sent recently. Please check your email!",
    };
  }

  //generate short time token
  const jwtPayload = {
    id: getSuperAdminInfo?.id,
    email: getSuperAdminInfo?.email,
    type: Enums.tokenType.download,
  };

  const tempToken = helpers.generateTempToken(jwtPayload);

  const downloadUrl = `https://api.varsity.aparsclassroom.com/api/v1/course/download/student/info/${courseId}?token=${tempToken}`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Your download link is ready (Link expires within 10 minutes)</h2>
    <p>A request was made from your account asking for ${getCourse?.productName} course stuents list. Click the button below to proceed:</p>
    <a href="${downloadUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
      Click to Download
    </a>
    <br/>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Thanks,<br>The ASG SHOP Team</p>
  </div>
`;

  const emailSubject = `${getSuperAdminInfo?.email}, requested student information`;

  const response = await sendEmailWithProbaho(
    "super-admin",
    getSuperAdminInfo?.email,
    emailSubject,
    html,
  );

  if (response?.data?.status === "success") {
    if (getInfo) {
      const updateIt = await prisma.superAdminXStudentInfo.update({
        where: {
          id: getInfo?.id,
        },
        data: {
          lastDownloadTime: now,
        },
      });
    } else {
      const insertIt = await prisma.superAdminXStudentInfo.create({
        data: {
          superAdminId: getSuperAdminInfo?.id,
          courseOrCycleId: courseId,
          lastDownloadTime: now,
        },
      });
    }
  }
  return true;
};

const downloadTheFile = async (courseId, query, res) => {
  const { token } = query;
  if (!token)
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "unauthorized request!");

  let decoded = null;

  try {
    decoded = jwt.verify(token, config.jwt_temp_secret_key, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    console.log(error, "error decoding download file");
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "unauthorized api call");
  }

  const getCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
  });

  if (!getCourse)
    throw new AppErrors(StatusCodes.NOT_FOUND, "course not found for data");

  const students = await prisma.$queryRaw`
    SELECT
      s.name,
      s.email,
      s.phone,
      s.institution,
      s.batch
    FROM "courseStudents" cs
    INNER JOIN "student" s ON s.id = cs."studentId"
    WHERE cs."courseId" = ${courseId}::uuid
  `;

  sendCsv(res, students, `${getCourse?.productName}_students`);
};

export const coursesServices = {
  getAllCoursesfromDb,
  getAllCoursesfromDbV2,
  getSingleCoursesfromDb,
  getArchieveCourseByCourseId,
  GetAllArchieveCourses,
  GetAllArchieveCoursesV2,
  createCoursesIntoDb,
  updateCoursesIntoDb,
  deleteCourseFromDb,
  cloneCourseOrCycle,
  pullCourse,
  detectContent,
  getCourseStats,
  getCourseStatsForCrm,
  getAllCourseStats,
  getCourseEnrollStatsForCrm,
  setActiveBiller,
  getCourseApprovalBill,
  getNoActiveBiller,
  getAfsAccessCount,
  downloadCourseContent,
  getCourseStudentsInfoLink,
  downloadTheFile,
  getAllCoursesfromDbV3,
};
