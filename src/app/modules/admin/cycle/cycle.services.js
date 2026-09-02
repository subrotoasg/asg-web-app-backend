import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../../errors/AppErrors.js";
import { prisma } from "../../../../../constants/index.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  searchableFields,
  selectFields,
  sortableFields,
  filterableFields,
  sendResponseFields,
} from "./cycle.constants.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import config from "../../../config/index.js";
import jwt from "jsonwebtoken";
import { Enums } from "../../../constant/enums.js";
import { findCourseByCycle } from "../../../middleware/handleCourseAuth.js";
import { activity } from "../../../../helper/activityLog.js";
import { verifyUserTokenWithSignature } from "../../authentication/auth.utlis.js";
import { Parser } from "json2csv";
import { helpers } from "../../superAdmin/admin/admin.utils.js";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";
import { bumpCourseCatalogVersion } from "../../superAdmin/courses/courses.cache.js";

//Get all Cycle Services
const getAllCyclefromDb = async (query = {}, payload) => {
  const { adminId } = payload;
  //For query
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.cycle.findMany({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        adminId
          ? {
              course: {
                courseAdmin: {
                  some: {
                    adminId: adminId,
                  },
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
  const totalCount = await prisma.cycle.count({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        adminId
          ? {
              course: {
                courseAdmin: {
                  some: {
                    adminId: adminId,
                  },
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

const getAllArchiveCycles = async (query = {}, token) => {
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

  const result = await prisma.cycle.findMany({
    where: {
      AND: [
        { markAsArchieve: true },
        {
          ...(decoded?.id &&
            decoded?.role === Enums.roles.ADMIN && {
              course: {
                courseAdmin: {
                  some: {
                    adminId: decoded?.id,
                  },
                },
              },
            }),
        },
      ],
    },
    select: { ...selectFields, _count: { select: { student: true } } },
  });

  if (decoded?.role === Enums.roles.STUDENT) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "you are not authorized to access this",
    );
  }

  return result;
};

const getArchiveCycleByCycleId = async (CycleId) => {
  const getCycle = await prisma.cycle.findUnique({
    where: {
      id: CycleId,
    },
  });
  if (!getCycle || !getCycle?.archieveCycleId) return null;
  //throw new AppErrors(StatusCodes.NOT_FOUND, "no archive cycle found.");
  const archiveCycle = await prisma.cycle.findUnique({
    where: {
      id: getCycle?.archieveCycleId,
    },
    select: {
      ...selectFields,
      _count: { select: { student: true } },
    },
  });
  return archiveCycle;
};

//Get single Cycle Services
const getSingleCyclefromDb = async (CycleId) => {
  const isExist = await prisma.cycle.findUnique({
    where: {
      id: CycleId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Cycle  Not Found");

  const result = await prisma.cycle.findFirst({
    where: {
      AND: [
        {
          id: CycleId,
        },
        {
          isDeleted: false,
        },
      ],
    },
    select: selectFields,
  });

  return result;
};

const GetAllCyclebyCourseId = async (id, query = {}, token) => {
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
  const isExist = await prisma.course.findUnique({
    where: {
      id,
      isDeleted: false,
      cycleAvailable: true,
    },
  });

  //if not exist
  if (!isExist) return null;
  // throw new AppErrors(StatusCodes.BAD_REQUEST, "course  Not Found");

  const { orderBy } = buildQueryOptions(query, undefined, sortableFields);

  const result = await prisma.cycle.findMany({
    where: {
      AND: [
        {
          courseId: id,
        },
        {
          isDeleted: false,
        },
      ],
    },
    orderBy: { title: "asc" },
    select: { ...selectFields, _count: { select: { student: true } } },
  });

  let cycelWithEnrollmentFlag = result;

  if (decoded?.role === Enums.roles.STUDENT && result.length > 0) {
    const enrolledCycle = await prisma.cycleStudent.findMany({
      where: {
        studentId: decoded?.id,
        cycleId: {
          in: result.map((cycle) => cycle?.id),
        },
      },
      select: {
        cycleId: true,
        status: true,
        accessCode: true,
      },
    });

    const enrolledCycleMap = new Map(
      enrolledCycle.map((enroll) => [enroll?.cycleId, enroll]),
    );

    cycelWithEnrollmentFlag = result.map((cycle) => ({
      ...cycle,
      isEnrolled: enrolledCycleMap.has(cycle?.id),
    }));
  }

  return cycelWithEnrollmentFlag;
};

//Create Cycle Services
const createCycleIntoDb = async (CycleImage, payload) => {
  const { courseId, productId, adminId, title } = payload;

  //cheicking Cycle Image validation
  if (!CycleImage) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Cycle Image is Required");
  }

  //checking Course  Id
  const existingCourse = await prisma.course.findUnique({
    where: { id: courseId, isDeleted: false },
  });

  if (!existingCourse) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid courseId: Course Id does not exist.",
    );
  }

  //checking cycleAvailablity
  if (!existingCourse?.cycleAvailable) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "This Course Cycle Not Available",
    );
  }

  //create Data
  const data = {
    cycleImage: CycleImage,
    courseId,
    productId,
    adminId,
    title,
  };

  //Creating Cycle into DB
  const result = await prisma.cycle.create({
    data,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  return response;
};

//Update Cycle Services
const updateCycleIntoDb = async (CycleId, CycleImage, payload) => {
  const {
    title,
    markAsArchieve,
    archieveCycleId,
    isFree,
    affiliate,
    superAdminId,
  } = payload;

  if (CycleId === archieveCycleId) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "self archieve not supported");
  }

  //Checking CycleId
  const isExist = await prisma.cycle.findUnique({
    where: {
      id: CycleId,
    },
    select: {
      id: true,
      cycleImage: true,
      course: true,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.NOT_FOUND, "Cycle Not Found");

  //updated fields
  const data = transformUpdatedFields(
    {
      cycleImage: CycleImage,
      title,
      markAsArchieve:
        markAsArchieve === "true"
          ? true
          : markAsArchieve === "false"
            ? false
            : null,
      isCycleFree: isFree === "true" ? true : isFree === "false" ? false : null,
      archieveCycleId,
      affiliateProductIds: affiliate && affiliate.length > 0 ? affiliate : null,
    },
    [],
  );

  const existImageUrl = isExist?.cycleImage;
  const isUpdatedImage = data?.cycleImage;

  // Check and delete Image URL if updated
  if (isUpdatedImage && existImageUrl) {
    // await removeFiles.deleteFromBunnyCDN(existImageUrl);
  }

  const result = await prisma.cycle.update({
    where: {
      id: CycleId,
    },
    data,
  });

  if (!isExist?.course?.archieveCourseId && archieveCycleId) {
    const isExistArchieve = await prisma.cycle.findUnique({
      where: {
        id: archieveCycleId,
      },
      select: {
        id: true,
        course: true,
      },
    });

    //update the archieve course id to main course
    const updateit = await prisma.course.update({
      where: {
        id: isExist?.course?.id,
      },
      data: {
        archieveCourseId: isExistArchieve?.course?.id,
      },
    });
    await bumpCourseCatalogVersion();
  }

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //log cycle data update
  try {
    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const getCycle = await prisma.cycle.findFirst({
      where: {
        id: CycleId,
      },
    });

    const logTitle = `কোর্সের সাইকেলের তথ্য আপডেট হয়েছে`;
    const logDesc = `${getSuperAdmin?.email} ${isExist?.course?.productName} কোর্সের ${getCycle?.title} তথ্য আপডেট করেছেন`;
    const logType = Enums.logType.course;
  } catch (error) {
    console.log(error, "Error logging activity on cycle update");
  }

  return response;
};

//Delete Cycle Services
const deleteCycleFromDb = async (CycleId, payload) => {
  const { adminId, superAdminId } = payload;
  const isExist = await prisma.cycle.findUnique({
    where: {
      id: CycleId,
      isDeleted: false,
    },
  });

  //if not exist
  if (!isExist) throw new AppErrors(StatusCodes.NOT_FOUND, "Cycle Not Found");

  const data = {
    isDeleted: true,
  };

  //Soft Delete
  const result = await prisma.cycle.update({
    where: {
      id: CycleId,
    },
    data,
  });

  //logging activity delete cycle
  try {
    let creatorName = "";
    if (adminId) {
      const getAdmin = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getAdmin?.name;
    } else if (superAdminId) {
      const getSuperAdmin = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getSuperAdmin?.email;
    }

    const getCourse = await findCourseByCycle(CycleId);

    const logTitle = `কোর্সের সাইকেল ডিলিট করা হয়েছে`;
    const logDesc = `${creatorName} ${getCourse?.productName} কোর্সের ${isExist?.title} ডিলিট করেছেন`;
    const logType = Enums.logType.course;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity on cycle delete");
  }

  return {};
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

const downloadCycleContent = async (cycleId, res) => {
  const getCycle = await prisma.cycle.findFirst({
    where: {
      id: cycleId,
    },
    select: {
      title: true,
      course: {
        select: { productName: true },
      },
    },
  });

  if (!getCycle) throw new AppErrors(StatusCodes.NOT_FOUND, "cycle not found");
  const rows = await prisma.$queryRaw`
    SELECT
      cc.*,
      COALESCE(cs.title, s.title)           AS subject_name,
      COALESCE(csc.title, ch."chapterName") AS chapter_name
    FROM "cycleContents"        cc
    JOIN "cycleSubjectChapters" csc ON csc.id = cc."cycleSubjectChapterId"
    JOIN "cycleSubjects"        cs  ON cs.id  = csc."cycleSubjectId"
    JOIN subject                s   ON s.id   = cs."subjectId"
    JOIN chapter                ch  ON ch.id  = csc."chapterId"
    WHERE cs."cycleId"    = ${cycleId}::uuid
      AND cc."isDeleted"  = false
      AND csc."isDeleted" = false
      AND cs."isDeleted"  = false
    ORDER BY cs.serial, csc.serial, cc.serial
  `;

  sendCsv(res, rows, `${getCycle?.course?.productName}-${getCycle?.title}`);
};

const getCycleStudentsInfoLink = async (payload, cycleId) => {
  const { superAdminId } = payload;

  const getSuperAdminInfo = await prisma.superAdmin.findFirst({
    where: {
      id: superAdminId,
    },
  });

  if (!getSuperAdminInfo)
    throw new AppErrors(StatusCodes.NOT_FOUND, "requested account not found");

  const getCycle = await prisma.cycle.findFirst({
    where: {
      id: cycleId,
      isDeleted: false,
      markAsArchieve: false,
    },
    select: {
      id: true,
      title: true,
      course: {
        select: {
          productName: true,
        },
      },
    },
  });

  if (!getCycle)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "this cycle is not eligible for sharing info",
    );

  const getInfo = await prisma.superAdminXStudentInfo.findFirst({
    where: {
      superAdminId: getSuperAdminInfo?.id,
      courseOrCycleId: cycleId,
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

  const downloadUrl = `https://api.varsity.aparsclassroom.com/api/v1/cycle/download/student/info/${cycleId}?token=${tempToken}`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Your download link is ready (Link expires within 10 minutes)</h2>
    <p>A request was made from your account asking for ${getCycle?.course?.productName}-${getCycle?.title} course stuents list. Click the button below to proceed:</p>
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
          courseOrCycleId: cycleId,
          lastDownloadTime: now,
        },
      });
    }
  }
  return true;
};

const downloadTheFile = async (cycleId, query, res) => {
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

  const getCycle = await prisma.cycle.findFirst({
    where: {
      id: cycleId,
    },
    select: {
      id: true,
      title: true,
      course: {
        select: {
          productName: true,
        },
      },
    },
  });

  if (!getCycle)
    throw new AppErrors(StatusCodes.NOT_FOUND, "cycle not found for data");

  const students = await prisma.$queryRaw`
    SELECT
      s.name,
      s.email,
      s.phone,
      s.institution,
      s.batch
    FROM "cycleStudents" cs
    INNER JOIN "student" s ON s.id = cs."studentId"
    WHERE cs."cycleId" = ${cycleId}::uuid
  `;

  sendCsv(res, students, `${getCycle?.course?.productName}-${getCycle?.title}`);
};

export const CycleServices = {
  getAllCyclefromDb,
  getAllArchiveCycles,
  getArchiveCycleByCycleId,
  getSingleCyclefromDb,
  GetAllCyclebyCourseId,
  createCycleIntoDb,
  updateCycleIntoDb,
  deleteCycleFromDb,
  downloadCycleContent,
  getCycleStudentsInfoLink,
  downloadTheFile,
};
