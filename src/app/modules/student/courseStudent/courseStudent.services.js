import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import qs from "qs";
import { validate, version } from "uuid";
import {
  filterableFields,
  filterableFieldsForGetAllStudentForCx,
  filterableFieldsForGetAllStudents,
  filterableFieldsForGetCourseStudents,
  filterableFieldsForGetCycleStudents,
  searchableFields,
  searchableFieldsForGetAllStudents,
  searchableFieldsForGetCourseStudents,
  searchableFieldsForGetCycleStudents,
  selectFields,
  selectFieldsForCourseStudents,
  selectFieldsForCycleStudents,
  selectFieldsForGetAllStudents,
  selectFieldsForGetAllStudentsForCx,
  sortableFields,
  sortableFieldsForCycleStudents,
} from "./courseStudent.constants.js";
import config from "../../../config/index.js";

import {
  maskEmail,
  maskPhone,
} from "../../superAdmin/courses/courses.utils.js";
import { createOrRetrieve } from "./courseStudent.utils.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";
import { isValidBdPhone } from "../../../utlis/phoneUtils.js";
import { helpers } from "../../superAdmin/admin/admin.utils.js";
import { v4 as uuidv4 } from "uuid";
import {
  invalidateCourseStudentAccess,
  invalidateCourseStudentAccessMany,
  invalidateCycleStudentAccess,
  invalidateCycleStudentAccessMany,
} from "../../authentication/cache/authorization.cache.js";
import { getCachedMyCourses } from "./courseStudent.cache.js";
//Get all Courses Services

const getMyCourses = async (query = {}, payload, hostName, platform) => {
  const { studentId } = payload;
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.courseStudent.findMany({
    where: {
      AND: [
        { ...where },
        {
          ...(studentId && {
            studentId: studentId,
          }),
        },
        hostName &&
        (hostName === config.frb_host_name ||
          hostName === config.frb_local_host_name)
          ? {
              course: {
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
              },
            }
          : hostName &&
              (hostName === config.academic_host_name ||
                hostName === config.academic_local_host_name)
            ? {
                course: {
                  cycleAvailable: true,
                },
              }
            : hostName &&
                (hostName === config.varsity_host_name ||
                  hostName === config.medical_host_name ||
                  hostName === config.engineering_host_name ||
                  hostName === config.admission_host_name)
              ? {
                  course: {
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
                  },
                }
              : platform
                ? {
                    course: {
                      productFullName: {
                        contains: "ACS",
                      },
                    },
                  }
                : {},
      ],
    },
    orderBy,
    skip,
    take,
    select: selectFields,
  });

  // total count of courses
  const totalCount = await prisma.courseStudent.count({
    where: {
      AND: [
        { ...where },
        {
          ...(studentId && {
            studentId: studentId,
          }),
        },
        hostName &&
        (hostName === config.frb_host_name ||
          hostName === config.frb_local_host_name)
          ? {
              course: {
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
              },
            }
          : hostName &&
              (hostName === config.academic_host_name ||
                hostName === config.academic_local_host_name)
            ? {
                course: {
                  cycleAvailable: true,
                },
              }
            : hostName &&
                (hostName === config.varsity_host_name ||
                  hostName === config.medical_host_name ||
                  hostName === config.engineering_host_name ||
                  hostName === config.admission_host_name)
              ? {
                  course: {
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
                  },
                }
              : platform
                ? {
                    course: {
                      productFullName: {
                        contains: "ACS",
                      },
                    },
                  }
                : {},
      ],
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

const resolveMyCoursesAudience = (hostName, platform) => {
  if (
    hostName &&
    (hostName === config.frb_host_name ||
      hostName === config.frb_local_host_name)
  ) {
    return {
      scope: "frb",
      where: {
        course: {
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
        },
      },
    };
  }

  if (
    hostName &&
    (hostName === config.academic_host_name ||
      hostName === config.academic_local_host_name)
  ) {
    return {
      scope: "academic",
      where: {
        course: {
          AND: [
            { cycleAvailable: true },
            {
              productName: {
                notIn: ["App-ios-Premium", "App-android-Premium"],
              },
            },
          ],
        },
      },
    };
  }

  if (
    hostName &&
    [
      config.varsity_host_name,
      config.medical_host_name,
      config.engineering_host_name,
      config.admission_host_name,
    ].includes(hostName)
  ) {
    return {
      scope: "admission",
      where: {
        course: {
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
        },
      },
    };
  }

  if (platform === "ios") {
    return {
      scope: "ios",
      where: {
        course: {
          AND: [
            { hasApp: true },
            { productName: { notIn: ["App-android-Premium"] } },
          ],
        },
      },
    };
  }

  if (platform === "android") {
    return {
      scope: "android",
      where: {
        course: {
          AND: [
            { hasApp: true },
            { productName: { notIn: ["App-ios-Premium"] } },
          ],
        },
      },
    };
  }

  return { scope: "default", where: {} };
};

const isCacheableMyCoursesQuery = ({ skip, take, orderBy, where }) =>
  skip === 0 &&
  [100, 1000].includes(take) &&
  Object.keys(where).length === 0 &&
  orderBy?.createdAt === "desc";

const getMyCoursesV2 = async (query = {}, payload, hostName, platform) => {
  const { studentId } = payload;

  if (!studentId) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Student authentication required",
    );
  }

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );
  const audience = resolveMyCoursesAudience(hostName, platform);
  const whereCondition = {
    AND: [{ ...where }, { studentId }, audience.where],
  };

  const loader = async () => {
    const [result, totalCount] = await Promise.all([
      prisma.courseStudent.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take,
        select: selectFields,
      }),
      prisma.courseStudent.count({ where: whereCondition }),
    ]);

    return {
      data: result,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / take),
        currentPage: Math.ceil(skip / take) + 1,
      },
    };
  };

  const cacheQuery = { skip, take, orderBy, where };

  if (!isCacheableMyCoursesQuery(cacheQuery)) {
    return loader();
  }

  return getCachedMyCourses({
    studentId,
    scope: audience.scope,
    query: cacheQuery,
    loader,
  });
};

//Get students services
const getAllStudents = async (query = {}, payload) => {
  const { adminId, superAdminId } = payload;

  const getAdminCourses = adminId
    ? await prisma.courseAdmin.findMany({
        where: {
          adminId: adminId,
        },
      })
    : [];

  const adminCourseList = getAdminCourses.map((el) => el?.courseId);

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForGetAllStudents,
    sortableFields,
    filterableFieldsForGetAllStudents,
  );

  const whereCondition = {
    ...where,
  };

  if (adminId && adminCourseList.length > 0) {
    whereCondition.course = {
      some: {
        courseId: {
          in: adminCourseList,
        },
      },
    };
  } else if (adminId && adminCourseList.length === 0) {
    whereCondition.id = null;
  }

  const result = await prisma.student.findMany({
    where: whereCondition,
    orderBy,
    skip,
    take,
    select: selectFieldsForGetAllStudents,
  });

  const totalCount = await prisma.student.count({
    where: whereCondition,
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

//redeem courses v3
const redeemCourseV3 = async (payload) => {
  const { accessCode, studentId } = payload;

  const isAFS = accessCode.startsWith("AFS") || accessCode.length === 8;

  const isCamp = validate(accessCode) ? true : false;

  if (isCamp) {
    const data = qs.stringify({
      tran_id: accessCode,
    });

    const response = await axios.post(
      "https://api.acscamp.com/v1/transactions/lookup",
      data,
      {
        headers: {
          Authorization: `Bearer ${config.acs_camp_key}`,
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      (response?.data?.tranx?.status === "VALID" ||
        response?.data?.tranx?.status === "VALIDATED")
    ) {
      const getStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
        },
      });

      let changePhone = false;

      if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

      const logTitle = `CAMP-${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
      const logDesc = `CAMP-${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ এক্সেস নিয়েছেন`;
      const logType = Enums.logType.student;

      if (changePhone) {
        try {
          const updateStudent = await prisma.student.update({
            where: {
              id: studentId,
            },
            data: {
              phone: helpers.trimBDCountryCode(response?.data?.tranx?.Phone),
            },
          });
        } catch (error) {
          console.log(error, "error updating phone of ios user");
        }
      }

      const checkProduct = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
      );

      if (
        checkProduct?.data?.product?.Category &&
        checkProduct?.data?.product?.Category.includes("Academic") &&
        !response?.data?.tranx?.Product?.productName.includes("FRB")
      ) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "ACS-CAMP এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateData.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });
        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateData?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      } else {
        //call the cycle here also
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlreadyCycle = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIdsCycle.includes(el),
        );

        const updateDataCycle = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "ACS-CAMP এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateDataCycle.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudentCycle = await prisma.cycleStudent.createMany({
          data: updateDataCycle,
        });
        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateDataCycle?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        const checkAccessCode = await prisma.courseStudent.findMany({
          where: {
            accessCode: {
              contains: accessCode,
            },
          },
        });

        const getCourse = await prisma.course.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const courseIds = getCourse.map((el) => el?.id);

        const getAlready = await prisma.courseStudent.findMany({
          where: {
            courseId: {
              in: courseIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.courseId);

        const filteredCourses = courseIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        for (const c of filteredCourses) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.courseStudent.findFirst({
            where: {
              courseId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "ACS-CAMP এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          updateData.push({
            courseId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.courseStudent.createMany({
          data: updateData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      }
    } else {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "তোমার এক্সেস-কোডটি সঠিক নয়, সঠিক কোডটি দিয়ে আবার চেষ্টা করো।",
      );
    }
  } else if (isAFS) {
    //TODO:: give afs students access
    const response = await axios.get(
      `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${accessCode}`,
      {
        headers: {
          "x-crm-key": config.afs_crm_key,
        },
      },
    );

    const records = response?.data?.data || [];
    const theData = records.find((record) => record.status === "SUCCESS");

    if (response?.data?.success && theData) {
      // const theData = response?.data?.data[0];
      const getStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
        },
      });

      let changePhone = false;

      if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

      const logTitle = `AFS-${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
      const logDesc = `AFS-${getStudent?.name}, ${theData?.access_codes[0]?.asg_shop_product_name} কোর্স এ এক্সেস নিয়েছেন`;
      const logType = Enums.logType.student;

      if (changePhone) {
        try {
          const updateStudent = await prisma.student.update({
            where: {
              id: studentId,
            },
            data: {
              phone: helpers.trimBDCountryCode(theData?.buyer_phone),
            },
          });
        } catch (error) {
          console.log(error, "error updating phone of ios user");
        }
      }

      const checkProduct = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${theData?.access_codes[0]?.asg_shop_product_id}&uid=${config.crmApiKey}`,
      );

      if (!theData?.access_codes[0]?.asg_shop_product_id)
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "কোর্সটি ফিউচার স্কুল থেকে সঠিক ভাবে কনফিগার করা নেই, সাপোর্ট এর সাথে যোগাযোগ করো",
        );

      if (
        checkProduct?.data?.product?.Category &&
        checkProduct?.data?.product?.Category.includes("Academic") &&
        !theData?.access_codes[0]?.asg_shop_product_name.includes("FRB")
      ) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এ-এফ-এস এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateData.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });
        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateData?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      } else {
        //call the cycle here also
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlreadyCycle = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIdsCycle.includes(el),
        );

        const updateDataCycle = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এ-এফ-এস এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateDataCycle.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudentCycle = await prisma.cycleStudent.createMany({
          data: updateDataCycle,
        });

        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateDataCycle?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        const checkAccessCode = await prisma.courseStudent.findMany({
          where: {
            accessCode: {
              contains: accessCode,
            },
          },
        });

        const getCourse = await prisma.course.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const courseIds = getCourse.map((el) => el?.id);

        const getAlready = await prisma.courseStudent.findMany({
          where: {
            courseId: {
              in: courseIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.courseId);

        const filteredCourses = courseIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        for (const c of filteredCourses) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.courseStudent.findFirst({
            where: {
              courseId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এ-এফ-এস এর এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা করো",
            );
          }

          updateData.push({
            courseId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.courseStudent.createMany({
          data: updateData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      }
    } else {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "তোমার এক্সেস-কোডটি সঠিক নয়, সঠিক কোডটি দিয়ে আবার চেষ্টা করো।",
      );
    }
  } else {
    const data = qs.stringify({
      tran_id: accessCode,
    });

    const response = await axios.post(
      "https://secure.apars.shop/query/transaction",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      (response?.data?.tranx?.status === "VALID" ||
        response?.data?.tranx?.status === "VALIDATED")
    ) {
      const getStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
        },
      });

      let changePhone = false;

      if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

      const logTitle = `${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
      const logDesc = `${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ এক্সেস নিয়েছেন`;
      const logType = Enums.logType.student;

      //student uid update or store

      if (getStudent?.uid !== response?.data?.tranx?.uid) {
        if (
          getStudent?.email !== response?.data?.tranx?.Email &&
          getStudent?.phone !==
            helpers.trimBDCountryCode(response?.data?.tranx?.Phone)
        ) {
          throw new AppErrors(
            StatusCodes.BAD_REQUEST,
            "এক্সেস কোডটি আপনার একাউন্টের সাথে সামঞ্জস্যপুর্ন নয়, দয়া করে হেল্পলাইনে যোগাযোগ করুন।",
          );
        }
      }

      try {
        const updateUid = await prisma.student.update({
          where: {
            id: studentId,
          },
          data: {
            uid: response?.data?.tranx?.uid,
            batch: response?.data?.tranx?.HSC,
            institution: response?.data?.tranx?.Institution,
            ...(changePhone && {
              phone: helpers.trimBDCountryCode(response?.data?.tranx?.Phone),
            }),
          },
        });
      } catch (error) {
        console.log(error, "Error updating phone");
      }

      try {
        const comebackId = "621";

        const getCombackCourse = await prisma.course.findFirst({
          where: {
            productId: comebackId,
          },
        });

        const isCombackExist = await prisma.courseStudent.findFirst({
          where: {
            courseId: getCombackCourse?.id,
            accessCode: {
              contains: accessCode,
            },
          },
        });

        if (
          !isCombackExist &&
          (response?.data?.tranx?.HSC === "HSC 24" ||
            response?.data?.tranx?.HSC === "HSC 25")
        ) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const assign = await prisma.courseStudent.create({
            data: {
              courseId: getCombackCourse?.id,
              studentId,
              accessCode: accessCode + randomChars,
            },
          });

          await invalidateCourseStudentAccess({
            studentId,
            courseId: getCombackCourse?.id,
          });
        }
      } catch (error) {
        console.log(error, "error on comeback access");
      }

      const checkProduct = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
      );

      if (
        response?.data?.tranx?.Product?.Cycle !== "" ||
        (checkProduct?.data?.product?.Category &&
          checkProduct?.data?.product?.Category.includes("Academic") &&
          !response?.data?.tranx?.Product?.productName.includes("FRB"))
      ) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        const updateCourseData = [];
        const courseMap = new Map();
        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা কর",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateData.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });

        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateData?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      } else {
        //call the cycle here also
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlreadyCycle = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIdsCycle.includes(el),
        );

        const updateDataCycle = [];
        const updateCourseData = [];
        const courseMap = new Map();
        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা কর",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateDataCycle.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudentCycle = await prisma.cycleStudent.createMany({
          data: updateDataCycle,
        });

        await invalidateCycleStudentAccessMany({
          studentId,
          cycleIds: updateDataCycle?.map((item) => item?.cycleId),
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData?.map((item) => item?.courseId),
        });

        const checkAccessCode = await prisma.courseStudent.findMany({
          where: {
            accessCode: {
              contains: accessCode,
            },
          },
        });

        const getCourse = await prisma.course.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const courseIds = getCourse.map((el) => el?.id);

        const getAlready = await prisma.courseStudent.findMany({
          where: {
            courseId: {
              in: courseIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.courseId);

        const filteredCourses = courseIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        for (const c of filteredCourses) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.courseStudent.findFirst({
            where: {
              courseId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "এই এক্সেস-কোডটি ইতোমধ্যে ব্যবহার করা হয়েছে, তোমার নিজের এক্সেস-কোডটি দিয়ে চেষ্টা কর",
            );
          }

          updateData.push({
            courseId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        const assignStudent = await prisma.courseStudent.createMany({
          data: updateData,
        });

        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateData?.map((item) => item?.courseId),
        });

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
        // }
      }
    } else {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "তোমার এক্সেস-কোডটি সঠিক নয়, সঠিক কোডটি দিয়ে আবার চেষ্টা করো।",
      );
    }
  }
};

const redeemCourseV2 = async (payload) => {
  const { accessCode, studentId } = payload;

  const isAFS = accessCode.startsWith("AFS");

  if (isAFS) {
    //TODO:: give afs students access
    const response = await axios.get(
      `https://hsc.acsfutureschool.com/api/crm/search?type=access_code&value=${accessCode}`,
      {
        headers: {
          "x-crm-key": config.afs_crm_key,
        },
      },
    );

    if (
      response?.data?.success &&
      Array.isArray(response?.data?.data) &&
      response?.data?.data.length > 0 &&
      response?.data?.data[0].status === "SUCCESS"
    ) {
      const theData = response?.data?.data[0];
      const getStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
        },
      });

      let changePhone = false;

      if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

      const logTitle = `AFS-${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
      const logDesc = `AFS-${getStudent?.name}, ${theData?.access_codes[0]?.asg_shop_product_name} কোর্স এ এক্সেস নিয়েছেন`;
      const logType = Enums.logType.student;

      if (changePhone) {
        try {
          const updateStudent = await prisma.student.update({
            where: {
              id: studentId,
            },
            data: {
              phone: helpers.trimBDCountryCode(theData?.buyer_phone),
            },
          });
        } catch (error) {
          console.log(error, "error updating phone of ios user");
        }
      }

      const checkProduct = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${theData?.access_codes[0]?.asg_shop_product_id}&uid=${config.crmApiKey}`,
      );

      if (
        checkProduct?.data?.product?.Category &&
        checkProduct?.data?.product?.Category.includes("Academic") &&
        !theData?.access_codes[0]?.asg_shop_product_name.includes("FRB")
      ) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "AFS-Course redemption failed, please check the access code.",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode, //+ randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateData.push({
            cycleId: c,
            studentId,
            accessCode: accessCode, //+ randomChars,
          });
        }

        // console.log(updateData, "AFS-the data before assignStudent");
        // console.log(updateCourseData, "AFS-the data before assignStudent");

        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData.map((item) => item.courseId),
        });
        // console.log(assignStudent, "AFS-assigning");

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      } else {
        //call the cycle here also
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlreadyCycle = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIdsCycle.includes(el),
        );

        const updateDataCycle = [];
        const updateCourseData = [];
        const courseMap = new Map();

        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "Course redemption failed, please check the access code.",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode, //+ randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateDataCycle.push({
            cycleId: c,
            studentId,
            accessCode: accessCode, //+ randomChars,
          });
        }

        // console.log(updateDataCycle, "AFS-the data before assignStudent");
        // console.log(updateCourseData, "AFS-the data before assignStudent");

        const assignStudentCycle = await prisma.cycleStudent.createMany({
          data: updateDataCycle,
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData.map((item) => item.courseId),
        });

        // console.log(assignStudentCycle, "AFS-assigning");

        //here end the cycle call here

        const checkAccessCode = await prisma.courseStudent.findMany({
          where: {
            accessCode: {
              contains: accessCode,
            },
          },
        });

        const getCourse = await prisma.course.findMany({
          where: {
            OR: [
              {
                productId: theData?.access_codes[0]?.asg_shop_product_id,
              },
              {
                affiliateProductIds: {
                  has: theData?.access_codes[0]?.asg_shop_product_id,
                },
              },
            ],
          },
        });

        const courseIds = getCourse.map((el) => el?.id);

        const getAlready = await prisma.courseStudent.findMany({
          where: {
            courseId: {
              in: courseIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.courseId);

        const filteredCourses = courseIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        for (const c of filteredCourses) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.courseStudent.findFirst({
            where: {
              courseId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "Course redemption failed, please check the access code.",
            );
          }

          updateData.push({
            courseId: c,
            studentId,
            accessCode: accessCode, //+ randomChars,
          });
        }

        // console.log(updateData, "AFS-the data before assignStudent");

        const assignStudent = await prisma.courseStudent.createMany({
          data: updateData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateData.map((item) => item.courseId),
        });

        // console.log(assignStudent, "AFS-assigning");

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      }
    } else {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Course redemption failed. Please check your access code.",
      );
    }
  } else {
    const data = qs.stringify({
      tran_id: accessCode,
    });

    const response = await axios.post(
      "https://secure.apars.shop/query/transaction",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    if (
      response?.data?.status === 200 &&
      response?.data?.tranx &&
      (response?.data?.tranx?.status === "VALID" ||
        response?.data?.tranx?.status === "VALIDATED")
    ) {
      const getStudent = await prisma.student.findFirst({
        where: {
          id: studentId,
        },
      });

      let changePhone = false;

      if (!isValidBdPhone(getStudent?.phone)) changePhone = true;

      const logTitle = `${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
      const logDesc = `${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ এক্সেস নিয়েছেন`;
      const logType = Enums.logType.student;

      //student uid update or store

      try {
        const updateUid = await prisma.student.update({
          where: {
            id: studentId,
          },
          data: {
            uid: response?.data?.tranx?.uid,
            batch: response?.data?.tranx?.HSC,
            institution: response?.data?.tranx?.Institution,
            ...(changePhone && {
              phone: helpers.trimBDCountryCode(response?.data?.tranx?.Phone),
            }),
          },
        });
      } catch (error) {
        console.log(error, "Error updating phone");
      }

      try {
        const comebackId = "621";

        const getCombackCourse = await prisma.course.findFirst({
          where: {
            productId: comebackId,
          },
        });

        const isCombackExist = await prisma.courseStudent.findFirst({
          where: {
            courseId: getCombackCourse?.id,
            accessCode: {
              contains: accessCode,
            },
          },
        });

        if (
          !isCombackExist &&
          (response?.data?.tranx?.HSC === "HSC 24" ||
            response?.data?.tranx?.HSC === "HSC 25")
        ) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const assign = await prisma.courseStudent.create({
            data: {
              courseId: getCombackCourse?.id,
              studentId,
              accessCode: accessCode + randomChars,
            },
          });
          await invalidateCourseStudentAccess({
            studentId,
            courseId: getCombackCourse?.id,
          });
        }
      } catch (error) {
        console.log(error, "error on comeback access");
      }

      const checkProduct = await axios.get(
        `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
      );

      if (
        response?.data?.tranx?.Product?.Cycle !== "" ||
        (checkProduct?.data?.product?.Category &&
          checkProduct?.data?.product?.Category.includes("Academic") &&
          !response?.data?.tranx?.Product?.productName.includes("FRB"))
      ) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        const updateCourseData = [];
        const courseMap = new Map();
        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "Course redemption failed, please check the access code.",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateData.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        // console.log(updateData, "the data before assignStudent");
        // console.log(updateCourseData, "the data before assignStudent");

        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData.map((item) => item.courseId),
        });

        // console.log(assignStudent, "assigning");

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
      } else {
        //call the cycle here also
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);

        const getAlreadyCycle = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIdsCycle.includes(el),
        );

        const updateDataCycle = [];
        const updateCourseData = [];
        const courseMap = new Map();
        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "Course redemption failed, please check the access code.",
            );
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: studentId,
              },
            },
          });

          if (!checkCourseAccess) {
            const courseId = getCourseId?.courseId;

            if (!courseMap.has(courseId)) {
              const courseData = {
                courseId: courseId,
                studentId: studentId,
                accessCode: accessCode + randomChars,
              };
              courseMap.set(courseId, courseData);
              updateCourseData.push(courseData);
            }
          }

          updateDataCycle.push({
            cycleId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        // console.log(updateDataCycle, "the data before assignStudent");
        // console.log(updateCourseData, "the data before assignStudent");

        const assignStudentCycle = await prisma.cycleStudent.createMany({
          data: updateDataCycle,
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateCourseData.map((item) => item.courseId),
        });

        // console.log(assignStudentCycle, "assigning");

        //here end the cycle call here

        const checkAccessCode = await prisma.courseStudent.findMany({
          where: {
            accessCode: {
              contains: accessCode,
            },
          },
        });

        const getCourse = await prisma.course.findMany({
          where: {
            OR: [
              {
                productId: response?.data?.tranx?.Product?.productId,
              },
              {
                affiliateProductIds: {
                  has: response?.data?.tranx?.Product?.productId,
                },
              },
            ],
          },
        });

        const courseIds = getCourse.map((el) => el?.id);

        const getAlready = await prisma.courseStudent.findMany({
          where: {
            courseId: {
              in: courseIds,
            },
            studentId: studentId,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.courseId);

        const filteredCourses = courseIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );

        const updateData = [];
        for (const c of filteredCourses) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.courseStudent.findFirst({
            where: {
              courseId: c,
              accessCode: {
                contains: accessCode,
              },
            },
          });

          if (exists) {
            throw new AppErrors(
              StatusCodes.FORBIDDEN,
              "Course redemption failed, please check the access code.",
            );
          }

          updateData.push({
            courseId: c,
            studentId,
            accessCode: accessCode + randomChars,
          });
        }

        // console.log(updateData, "the data before assignStudent");

        const assignStudent = await prisma.courseStudent.createMany({
          data: updateData,
        });
        await invalidateCourseStudentAccessMany({
          studentId,
          courseIds: updateData.map((item) => item.courseId),
        });

        // console.log(assignStudent, "assigning");

        try {
          await activity.logActivity(logTitle, logDesc, logType);
        } catch (error) {
          console.log(error, "Error logging activity in course redeem");
        }

        return true;
        // }
      }
    } else {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Course redemption failed. Please check your access code.",
      );
    }
  }
};

//Create Courses Services
const redeemCourse = async (payload) => {
  const { accessCode, studentId } = payload;

  const data = qs.stringify({
    tran_id: accessCode,
  });

  const response = await axios.post(
    "https://secure.apars.shop/query/transaction",
    data,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (
    response?.data?.status === 200 &&
    response?.data?.tranx &&
    (response?.data?.tranx?.status === "VALID" ||
      response?.data?.tranx?.status === "VALIDATED")
  ) {
    const getStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
      },
    });

    const logTitle = `${getStudent?.name} কোর্স এ এক্সেস নিয়েছেন`;
    const logDesc = `${getStudent?.name}, ${response?.data?.tranx?.Product?.productName} কোর্স এ এক্সেস নিয়েছেন`;
    const logType = Enums.logType.student;

    //student uid update or store

    const updateUid = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        uid: response?.data?.tranx?.uid,
        batch: response?.data?.tranx?.HSC,
        institution: response?.data?.tranx?.Institution,
      },
    });

    try {
      const comebackId = "621";

      const getCombackCourse = await prisma.course.findFirst({
        where: {
          productId: comebackId,
        },
      });

      const isCombackExist = await prisma.courseStudent.findFirst({
        where: {
          courseId: getCombackCourse?.id,
          accessCode: {
            contains: accessCode,
          },
        },
      });

      if (
        !isCombackExist &&
        (response?.data?.tranx?.HSC === "HSC 24" ||
          response?.data?.tranx?.HSC === "HSC 25")
      ) {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
        const randomChars = Array.from({ length: 3 }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length)),
        ).join("");

        const assign = await prisma.courseStudent.create({
          data: {
            courseId: getCombackCourse?.id,
            studentId,
            accessCode: accessCode + randomChars,
          },
        });
        await invalidateCourseStudentAccess({
          studentId,
          courseId: getCombackCourse?.id,
        });
      }
    } catch (error) {
      console.log(error, "error on comeback access");
    }

    const checkProduct = await axios.get(
      `https://crm.apars.shop/product/edit?productId=${response?.data?.tranx?.Product?.productId}&uid=${config.crmApiKey}`,
    );

    if (
      response?.data?.tranx?.Product?.Cycle !== "" ||
      (checkProduct?.data?.product?.Category &&
        checkProduct?.data?.product?.Category.includes("Academic") &&
        !response?.data?.tranx?.Product?.productName.includes("FRB"))
    ) {
      const getCycles = await prisma.cycle.findMany({
        where: {
          OR: [
            {
              productId: response?.data?.tranx?.Product?.productId,
            },
            {
              affiliateProductIds: {
                has: response?.data?.tranx?.Product?.productId,
              },
            },
          ],
        },
      });

      const cycleIds = getCycles.map((el) => el?.id);

      const getAlready = await prisma.cycleStudent.findMany({
        where: {
          cycleId: {
            in: cycleIds,
          },
          studentId: studentId,
        },
      });

      const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

      const filteredCycles = cycleIds.filter(
        (el) => !getAlreadyIds.includes(el),
      );

      const updateData = [];
      const updateCourseData = [];
      const courseMap = new Map();
      for (const c of filteredCycles) {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
        const randomChars = Array.from({ length: 3 }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length)),
        ).join("");

        const exists = await prisma.cycleStudent.findFirst({
          where: {
            cycleId: c,
            accessCode: {
              contains: accessCode,
            },
          },
        });

        if (exists) {
          throw new AppErrors(
            StatusCodes.FORBIDDEN,
            "Course redemption failed, please check the access code.",
          );
        }

        const getCourseId = await prisma.cycle.findFirst({
          where: {
            id: c,
          },
        });

        const checkCourseAccess = await prisma.courseStudent.findUnique({
          where: {
            courseId_studentId: {
              courseId: getCourseId?.courseId,
              studentId: studentId,
            },
          },
        });

        if (!checkCourseAccess) {
          const courseId = getCourseId?.courseId;

          if (!courseMap.has(courseId)) {
            const courseData = {
              courseId: courseId,
              studentId: studentId,
              accessCode: accessCode + randomChars,
            };
            courseMap.set(courseId, courseData);
            updateCourseData.push(courseData);
          }
        }

        updateData.push({
          cycleId: c,
          studentId,
          accessCode: accessCode + randomChars,
        });
      }

      // console.log(updateData, "the data before assignStudent");
      // console.log(updateCourseData, "the data before assignStudent");

      const assignStudent = await prisma.cycleStudent.createMany({
        data: updateData,
      });

      const assignStudentCouse = await prisma.courseStudent.createMany({
        data: updateCourseData,
      });
      await invalidateCourseStudentAccessMany({
        studentId,
        courseIds: updateCourseData.map((item) => item.courseId),
      });

      // console.log(assignStudent, "assigning");

      try {
        await activity.logActivity(logTitle, logDesc, logType);
      } catch (error) {
        console.log(error, "Error logging activity in course redeem");
      }

      return true;
    } else {
      //call the cycle here also
      const getCycles = await prisma.cycle.findMany({
        where: {
          OR: [
            {
              productId: response?.data?.tranx?.Product?.productId,
            },
            {
              affiliateProductIds: {
                has: response?.data?.tranx?.Product?.productId,
              },
            },
          ],
        },
      });

      const cycleIds = getCycles.map((el) => el?.id);

      const getAlreadyCycle = await prisma.cycleStudent.findMany({
        where: {
          cycleId: {
            in: cycleIds,
          },
          studentId: studentId,
        },
      });

      const getAlreadyIdsCycle = getAlreadyCycle?.map((el) => el?.cycleId);

      const filteredCycles = cycleIds.filter(
        (el) => !getAlreadyIdsCycle.includes(el),
      );

      const updateDataCycle = [];
      const updateCourseData = [];
      const courseMap = new Map();
      for (const c of filteredCycles) {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
        const randomChars = Array.from({ length: 3 }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length)),
        ).join("");

        const exists = await prisma.cycleStudent.findFirst({
          where: {
            cycleId: c,
            accessCode: {
              contains: accessCode,
            },
          },
        });

        if (exists) {
          throw new AppErrors(
            StatusCodes.FORBIDDEN,
            "Course redemption failed, please check the access code.",
          );
        }

        const getCourseId = await prisma.cycle.findFirst({
          where: {
            id: c,
          },
        });

        const checkCourseAccess = await prisma.courseStudent.findUnique({
          where: {
            courseId_studentId: {
              courseId: getCourseId?.courseId,
              studentId: studentId,
            },
          },
        });

        if (!checkCourseAccess) {
          const courseId = getCourseId?.courseId;

          if (!courseMap.has(courseId)) {
            const courseData = {
              courseId: courseId,
              studentId: studentId,
              accessCode: accessCode + randomChars,
            };
            courseMap.set(courseId, courseData);
            updateCourseData.push(courseData);
          }
        }

        updateDataCycle.push({
          cycleId: c,
          studentId,
          accessCode: accessCode + randomChars,
        });
      }

      // console.log(updateDataCycle, "the data before assignStudent");
      // console.log(updateCourseData, "the data before assignStudent");

      const assignStudentCycle = await prisma.cycleStudent.createMany({
        data: updateDataCycle,
      });

      const assignStudentCouse = await prisma.courseStudent.createMany({
        data: updateCourseData,
      });
      await invalidateCourseStudentAccessMany({
        studentId,
        courseIds: updateCourseData.map((item) => item.courseId),
      });

      // console.log(assignStudentCycle, "assigning");

      //here end the cycle call here

      const checkAccessCode = await prisma.courseStudent.findMany({
        where: {
          accessCode: {
            contains: accessCode,
          },
        },
      });

      // const medical26Courses = ["560", "567"];

      // if (
      //   response?.data?.tranx?.Product?.productId === "525" ||
      //   response?.data?.tranx?.Product?.productId === "420"
      // ) {
      //   const getAllCourses = await prisma.course.findMany({
      //     where: {
      //       Category: "Admission 25",
      //       productId: {
      //         notIn: ["534", "536", "562"],
      //       },
      //     },
      //   });

      //   const courseIds25 = getAllCourses.map((el) => el?.id);

      //   // console.log(courseIds25, "courseids25");

      //   const getAlreadyAssignedCourses = await prisma.courseStudent.findMany({
      //     where: {
      //       courseId: {
      //         in: courseIds25,
      //       },
      //       studentId: studentId,
      //     },
      //   });

      //   const alreadyCourseIds = getAlreadyAssignedCourses?.map(
      //     (el) => el?.courseId
      //   );

      //   // console.log(alreadyCourseIds, "already");

      //   const filteredCourseIds = courseIds25.filter(
      //     (el) => !alreadyCourseIds.includes(el)
      //   );

      //   // console.log(filteredCourseIds, "hello filtere courses");

      //   const updateData = filteredCourseIds?.map((el, idx) => {
      //     const characters =
      //       "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
      //     const randomChars = Array.from({ length: 3 }, () =>
      //       characters.charAt(Math.floor(Math.random() * characters.length))
      //     ).join("");
      //     return {
      //       courseId: el,
      //       studentId: studentId,
      //       accessCode: accessCode + randomChars,
      //     };
      //   });

      //   const assignStudent = await prisma.courseStudent.createMany({
      //     data: updateData,
      //   });

      //   return true;
      // } else if (
      //   response?.data?.tranx?.Product?.productId === "555" ||
      //   response?.data?.tranx?.Product?.productId === "556" ||
      //   response?.data?.tranx?.Product?.productId === "557" ||
      //   response?.data?.tranx?.Product?.productId === "558"
      // ) {
      //   let productArray = [];
      //   if (response?.data?.tranx?.Product?.productId === "555") {
      //     productArray = ["540", "530", "547", "535"];
      //   } else if (response?.data?.tranx?.Product?.productId === "556") {
      //     productArray = ["540", "530", "547", "545"];
      //   } else if (response?.data?.tranx?.Product?.productId === "557") {
      //     productArray = ["540", "530", "529", "535"];
      //   } else if (response?.data?.tranx?.Product?.productId === "558") {
      //     productArray = ["540", "530", "529", "545"];
      //   }

      //   const getAllCourses = await prisma.course.findMany({
      //     where: {
      //       Category: "Admission 25",
      //       productId: {
      //         in: productArray,
      //       },
      //     },
      //   });

      //   const courseIds25 = getAllCourses.map((el) => el?.id);

      //   const getAlreadyAssignedCourses = await prisma.courseStudent.findMany({
      //     where: {
      //       courseId: {
      //         in: courseIds25,
      //       },
      //       studentId: studentId,
      //     },
      //   });

      //   const alreadyCourseIds = getAlreadyAssignedCourses?.map(
      //     (el) => el?.courseId
      //   );

      //   const filteredCourseIds = courseIds25.filter(
      //     (el) => !alreadyCourseIds.includes(el)
      //   );

      //   const updateData = filteredCourseIds?.map((el, idx) => {
      //     const characters =
      //       "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
      //     const randomChars = Array.from({ length: 3 }, () =>
      //       characters.charAt(Math.floor(Math.random() * characters.length))
      //     ).join("");
      //     return {
      //       courseId: el,
      //       studentId: studentId,
      //       accessCode: accessCode + randomChars,
      //     };
      //   });

      //   console.log(updateData, "the data before assignStudent");

      //   const assignStudent = await prisma.courseStudent.createMany({
      //     data: updateData,
      //   });

      //   console.log(assignStudent, "assigning");

      //   return true;
      // } else if (
      //   response?.data?.tranx?.Product?.Cycle === "" &&
      //   response?.data?.tranx?.Product?.productName.includes("FRB") &&
      //   response?.data?.tranx?.Product?.Webapp.includes("frb")
      // ) {
      //   console.log("inside frb");
      //   //todo:: - catch frb course and give access
      //   //todo:: also have to check featured courses for frb
      //   const frbCourses = ["563", "564", "565", "566"];

      //   if (!frbCourses.includes(response?.data?.tranx?.Product?.productId)) {
      //     throw new AppErrors(
      //       StatusCodes.FORBIDDEN,
      //       "course redeemed failed, please check the accesscode."
      //     );
      //   } else {
      //     const getCourses = await prisma.course.findMany({
      //       where: {
      //         productId: {
      //           in: frbCourses,
      //         },
      //       },
      //     });
      //     const courseIds = getCourses.map((el) => el?.id);
      //     console.log(courseIds, "course ids");
      //     const getAlreadyAssignedCourses = await prisma.courseStudent.findMany(
      //       {
      //         where: {
      //           courseId: {
      //             in: courseIds,
      //           },
      //           studentId: studentId,
      //         },
      //       }
      //     );
      //     const alreadyCourseIds = getAlreadyAssignedCourses?.map(
      //       (el) => el?.courseId
      //     );
      //     console.log(alreadyCourseIds, "already ids");
      //     const filteredCourseIds = courseIds.filter(
      //       (el) => !alreadyCourseIds.includes(el)
      //     );

      //     console.log(filteredCourseIds, "filtered ids");

      //     const updateData = [];

      //     for (const el of filteredCourseIds) {
      //       const characters =
      //         "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
      //       const randomChars = Array.from({ length: 3 }, () =>
      //         characters.charAt(Math.floor(Math.random() * characters.length))
      //       ).join("");

      //       const exists = await prisma.courseStudent.findFirst({
      //         where: {
      //           courseId: el,
      //           accessCode: {
      //             contains: accessCode,
      //           },
      //         },
      //       });

      //       if (exists) {
      //         throw new AppErrors(
      //           StatusCodes.FORBIDDEN,
      //           "Course redemption failed, please check the access code."
      //         );
      //       }

      //       updateData.push({
      //         courseId: el,
      //         studentId,
      //         accessCode: accessCode + randomChars,
      //       });

      //       console.log(updateData, "the data");
      //     }

      //     console.log(updateData, "the data before assignStudent");

      //     const assignStudent = await prisma.courseStudent.createMany({
      //       data: updateData,
      //     });

      //     console.log(assignStudent, "assigning");

      //     return true;
      //   }
      // } else if (
      //   medical26Courses.includes(response?.data?.tranx?.Product?.productId)
      // ) {
      //   const getCourses = await prisma.course.findMany({
      //     where: {
      //       productId: {
      //         in: medical26Courses,
      //       },
      //     },
      //   });

      //   const courseIds = getCourses.map((el) => el?.id);

      //   const getAlreadyAssignedCourses = await prisma.courseStudent.findMany({
      //     where: {
      //       courseId: {
      //         in: courseIds,
      //       },
      //       studentId: studentId,
      //     },
      //   });

      //   const alreadyCourseIds = getAlreadyAssignedCourses?.map(
      //     (el) => el?.courseId
      //   );
      //   const filteredCourseIds = courseIds.filter(
      //     (el) => !alreadyCourseIds.includes(el)
      //   );

      //   const updateData = [];

      //   for (const el of filteredCourseIds) {
      //     const characters =
      //       "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
      //     const randomChars = Array.from({ length: 3 }, () =>
      //       characters.charAt(Math.floor(Math.random() * characters.length))
      //     ).join("");

      //     const exists = await prisma.courseStudent.findFirst({
      //       where: {
      //         courseId: el,
      //         accessCode: {
      //           contains: accessCode,
      //         },
      //       },
      //     });

      //     if (exists) {
      //       throw new AppErrors(
      //         StatusCodes.FORBIDDEN,
      //         "Course redemption failed, please check the access code."
      //       );
      //     }

      //     updateData.push({
      //       courseId: el,
      //       studentId,
      //       accessCode: accessCode + randomChars,
      //     });
      //   }

      //   // const updateData = filteredCourseIds?.map((el, idx) => {
      //   //   const characters =
      //   //     "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
      //   //   const randomChars = Array.from({ length: 3 }, () =>
      //   //     characters.charAt(Math.floor(Math.random() * characters.length))
      //   //   ).join("");
      //   //   return {
      //   //     courseId: el,
      //   //     studentId: studentId,
      //   //     accessCode: accessCode + randomChars,
      //   //   };
      //   // });

      //   console.log(updateData, "the data before assignStudent");

      //   const assignStudent = await prisma.courseStudent.createMany({
      //     data: updateData,
      //   });

      //   console.log(assignStudent, "assigning");

      //   return true;
      // } else {
      const getCourse = await prisma.course.findMany({
        where: {
          OR: [
            {
              productId: response?.data?.tranx?.Product?.productId,
            },
            {
              affiliateProductIds: {
                has: response?.data?.tranx?.Product?.productId,
              },
            },
          ],
        },
      });

      const courseIds = getCourse.map((el) => el?.id);

      const getAlready = await prisma.courseStudent.findMany({
        where: {
          courseId: {
            in: courseIds,
          },
          studentId: studentId,
        },
      });

      const getAlreadyIds = getAlready?.map((el) => el?.courseId);

      const filteredCourses = courseIds.filter(
        (el) => !getAlreadyIds.includes(el),
      );

      const updateData = [];
      for (const c of filteredCourses) {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
        const randomChars = Array.from({ length: 3 }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length)),
        ).join("");

        const exists = await prisma.courseStudent.findFirst({
          where: {
            courseId: c,
            accessCode: {
              contains: accessCode,
            },
          },
        });

        if (exists) {
          throw new AppErrors(
            StatusCodes.FORBIDDEN,
            "Course redemption failed, please check the access code.",
          );
        }

        updateData.push({
          courseId: c,
          studentId,
          accessCode: accessCode + randomChars,
        });
      }

      // console.log(updateData, "the data before assignStudent");

      const assignStudent = await prisma.courseStudent.createMany({
        data: updateData,
      });
      await invalidateCourseStudentAccessMany({
        studentId,
        courseIds: updateData.map((item) => item.courseId),
      });

      // console.log(assignStudent, "assigning");

      try {
        await activity.logActivity(logTitle, logDesc, logType);
      } catch (error) {
        console.log(error, "Error logging activity in course redeem");
      }

      return true;
      // }
    }
  } else {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "Course redemption failed. Please check your access code.",
    );
  }
};

const getCourseStudents = async (courseId, query = {}) => {
  const isExist = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Course Not Found");

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForGetCourseStudents,
    sortableFields,
    filterableFieldsForGetCourseStudents,
  );

  const result = await prisma.courseStudent.findMany({
    where: {
      AND: [{ courseId: courseId }, { ...where }],
    },
    orderBy,
    skip,
    take,
    select: selectFieldsForCourseStudents,
  });

  let modifiedResult = [];

  if (result && Array.isArray(result)) {
    modifiedResult = result.map((enrollment) => ({
      ...enrollment,
      student: {
        ...enrollment.student,
        email: enrollment.student?.email
          ? maskEmail(enrollment.student.email)
          : enrollment.student?.email,
        phone: enrollment.student?.phone
          ? maskPhone(enrollment.student.phone)
          : enrollment.student?.phone,
      },
    }));
  }

  const totalCount = await prisma.courseStudent.count({
    where: {
      AND: [{ courseId: courseId }, { ...where }],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedResult,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getCycleStudents = async (cycleId, query = {}) => {
  const isExist = await prisma.cycle.findUnique({
    where: {
      id: cycleId,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.BAD_REQUEST, "Cycle Not Found");

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForGetCycleStudents,
    sortableFieldsForCycleStudents,
    filterableFieldsForGetCycleStudents,
  );

  const result = await prisma.cycleStudent.findMany({
    where: {
      AND: [{ cycleId: cycleId }, { ...where }],
    },
    orderBy,
    skip,
    take,
    select: selectFieldsForCycleStudents,
  });

  let modifiedResult = [];

  if (result && Array.isArray(result)) {
    modifiedResult = result.map((enrollment) => ({
      ...enrollment,
      student: {
        ...enrollment.student,
        email: enrollment.student?.email
          ? maskEmail(enrollment.student.email)
          : enrollment.student?.email,
        phone: enrollment.student?.phone
          ? maskPhone(enrollment.student.phone)
          : enrollment.student?.phone,
      },
    }));
  }

  const totalCount = await prisma.cycleStudent.count({
    where: {
      AND: [{ cycleId: cycleId }, { ...where }],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedResult,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getStudentInfoforCx = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForGetAllStudents,
    sortableFields,
    filterableFieldsForGetAllStudentForCx,
  );

  const student = await prisma.student.findMany({
    where: {
      ...where,
    },
    orderBy,
    skip,
    take,
    select: selectFieldsForGetAllStudentsForCx,
  });

  const totalCount = await prisma.student.count({
    where: {
      ...where,
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: student,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const migrateFromOldApp = async (payload) => {
  const { email, phone } = payload;
  const data = qs.stringify({
    email: email,
  });

  const data2 = qs.stringify({
    phone: phone,
  });

  let response = await axios.post(
    "https://secure.apars.shop/query/email",
    data,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (
    response?.data?.status === 200 &&
    response?.data?.tranx &&
    response?.data?.tranx?.length <= 0
  ) {
    response = await axios.post(
      "https://secure.apars.shop/query/phone",
      data2,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
  }
  if (
    response?.data?.status === 200 &&
    response?.data?.tranx &&
    response?.data?.tranx?.length > 0
  ) {
    //get only valid tranx with cycle courses
    const validProductIds = [];
    const productAccessMap = [];
    let name = "";
    let phone = "";
    let email = "";
    let uid = "";
    for (const t of response?.data?.tranx) {
      if (t?.status === "VALID" || t?.status === "VALIDATED") {
        validProductIds.push(t?.Product?.productId);

        productAccessMap.push({
          productId: t?.Product?.productId,
          accessCode: t?.tran_id,
        });

        if (!name) name = t?.Name;
        if (!email) email = t?.Email;
        if (!phone) phone = t?.Phone;
        if (!uid) uid = t?.uid;
      }
    }
    if (validProductIds && validProductIds?.length) {
      // call the function to retrieve or crete student acc
      const { authToken, refreshToken, id } = await createOrRetrieve(
        name,
        email,
        phone,
        uid,
      );

      for (const el of productAccessMap) {
        const getCycles = await prisma.cycle.findMany({
          where: {
            OR: [
              {
                productId: el?.productId,
              },
              {
                affiliateProductIds: {
                  has: el?.productId,
                },
              },
            ],
          },
        });

        const cycleIds = getCycles.map((el) => el?.id);
        const getAlready = await prisma.cycleStudent.findMany({
          where: {
            cycleId: {
              in: cycleIds,
            },
            studentId: id,
          },
        });

        const getAlreadyIds = getAlready?.map((el) => el?.cycleId);

        const filteredCycles = cycleIds.filter(
          (el) => !getAlreadyIds.includes(el),
        );
        const updateData = [];
        const updateCourseData = [];
        for (const c of filteredCycles) {
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*()-_+=";
          const randomChars = Array.from({ length: 3 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length)),
          ).join("");

          const exists = await prisma.cycleStudent.findFirst({
            where: {
              cycleId: c,
              accessCode: {
                contains: el?.accessCode,
              },
            },
          });

          if (exists) {
            continue;
          }

          const getCourseId = await prisma.cycle.findFirst({
            where: {
              id: c,
            },
          });

          const checkCourseAccess = await prisma.courseStudent.findUnique({
            where: {
              courseId_studentId: {
                courseId: getCourseId?.courseId,
                studentId: id,
              },
            },
          });

          if (!checkCourseAccess)
            updateCourseData.push({
              courseId: getCourseId?.courseId,
              studentId: id,
              accessCode: el?.accessCode + randomChars,
            });

          updateData.push({
            cycleId: c,
            studentId: id,
            accessCode: el?.accessCode + randomChars,
          });
        }
        const assignStudent = await prisma.cycleStudent.createMany({
          data: updateData,
        });

        const assignStudentCouse = await prisma.courseStudent.createMany({
          data: updateCourseData,
        });
        await invalidateCourseStudentAccessMany({
          studentId: id,
          courseIds: updateCourseData.map((item) => item.courseId),
        });
      }

      const logTitle = `স্টুডেন্ট নতুন মাইগ্রেশন করেছেন`;
      const logDesc = `${name} নতুন ওয়েব-এপ এ মাইগ্রেশন করেছেন`;
      const logType = Enums.logType.student;

      try {
        await activity.logActivity(logTitle, logDesc, logType);
      } catch (error) {
        console.log(error, "Error logging activity on webapp migration");
      }

      return { authToken, refreshToken };
    }
  } else {
    throw new AppErrors(
      StatusCodes.EXPECTATION_FAILED,
      "তোমার এই ইমেল,ফোন নম্বর ব্যবহার করে কোন কোর্স কেনার তথ্য পাওয়া যায় নি, তাই স্বয়ংক্রিয় মাইগ্রেশন ব্যর্থ হয়েছে। নিচের ভিডিওটি দেখে খুব সহজেই তুমি মাইগ্রেশন সম্পন্ন করতে পারবে।",
    );
  }
};

//manually course access
const manuallyCourseAccessIntoDb = async (payload = {}) => {
  const allowedEmails = new Set(
    JSON.parse(config.allowed_suparAdmin_email || "[]"),
  );

  if (!allowedEmails.has(payload?.superAdminEmail)) {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "Your account is not authorized to perform this operation.",
    );
  }
  const reqData = transformUpdatedFields(payload, []);

  const { id: studentId, course = [], cycle = [] } = reqData || {};
  const operations = [];

  if (course?.length > 0) {
    const courseDatas = course?.map((courseId) => ({
      studentId,
      courseId,
      accessCode: `manually_access_by_${payload?.superAdminEmail}_${uuidv4()}`,
    }));
    const result = await prisma.courseStudent.createMany({
      data: courseDatas,
      skipDuplicates: true,
    });
    operations.push(result);

    await invalidateCourseStudentAccessMany({
      studentId,
      courseIds: course,
    });
  }

  if (cycle?.length > 0) {
    const courseDatas = cycle?.map((cycleId) => ({
      studentId,
      cycleId,
      accessCode: `manually_access_by_${payload?.superAdminEmail}_${uuidv4()}`,
    }));

    const result = await prisma.cycleStudent.createMany({
      data: courseDatas,
      skipDuplicates: true,
    });

    operations.push(result);

    await Promise.all(
      cycle?.map((cycleId) =>
        invalidateCycleStudentAccess({
          studentId,
          cycleId,
        }),
      ),
    );
  }

  return operations;
};

//student info retriver
const studentInfoFromDb = async (studentId = "", credential = "") => {
  if (!credential) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Credential is missing");
  }

  if (credential !== config.media_auth_key) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "You are not an APARS Media Engine server",
    );
  }

  if (!studentId) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Student ID is required");
  }
  const result = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      emergencyContact: true,
      collegeName: true,
      gender: true,
      guardianMobile: true,
      uid: true,
      profilePhoto: true,
      status: true,
    },
  });
  return result || {};
};

export const courseStudentServices = {
  redeemCourse,
  redeemCourseV2,
  redeemCourseV3,
  getMyCourses,
  getMyCoursesV2,
  getAllStudents,
  getCourseStudents,
  getCycleStudents,
  getStudentInfoforCx,
  migrateFromOldApp,
  manuallyCourseAccessIntoDb,
  studentInfoFromDb,
};
