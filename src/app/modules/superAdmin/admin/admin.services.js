import { StatusCodes } from "http-status-codes";
import { helpers } from "./admin.utils.js";
import bcrypt from "bcrypt";
import { prisma } from "../../../../../constants/index.js";
import { constants } from "../../../constant/index.js";
import config from "../../../config/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { courseAdminService } from "../courseAdmin/courseAdmin.service.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  searchableFields,
  selectFields,
  sortableFields,
  filterableFields,
  sendResponseFields,
} from "./admin.constants.js";
import axios from "axios";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";
import { Enums } from "../../../constant/enums.js";
import { activity } from "../../../../helper/activityLog.js";

const createAdmin = async (payload) => {
  const { email, phone, name, superAdminId = null, adminId = null } = payload;

  const phoneNo = helpers.trimBDCountryCode(phone);

  const data = {
    email,
    phone: phoneNo,
    name,
    anotherRole: "cx",
    superAdminId,
    adminId,
  };

  const existingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
  });

  const existingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: data?.email }, { phone: data?.phone }],
    },
  });

  const existingSolver = await prisma.solver.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
  });

  const existingSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
  });

  if (existingAdmin || existingSuperAdmin || existingStudent || existingSolver)
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "An account already exists with this email or phone!",
    );

  const tempPassword = helpers.generateTempPassword();

  const hashedPassword = await bcrypt.hash(
    tempPassword,
    Number(process.env.BCREPT_HASH_RANDOM),
  );

  data.password = hashedPassword;

  const result = await prisma.admin.create({ data });

  const {
    ["password"]: _,
    ["superAdminId"]: foo,
    ["adminId"]: bar,
    ["refreshToken"]: baz,
    ...rest
  } = result;

  const logInUiLink = `${config.frontend_url_prod}/login`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Apar's Classroom Webapp admin account credentials.</h2>
    <p>Your admin account has been created successfully.</p>
    <p>Email: ${result.email}</p>
    <p>Phone: ${result.phone}</p>
    <p>Password: ${tempPassword}</p>
    <a href="${logInUiLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
      Login
    </a>
    <p>Thanks,<br>The ASG SHOP Team.</p>
  </div>
`;

  const emailContent = constants.newLoginInfoText(
    result.email,
    result.phone,
    tempPassword,
    logInUiLink,
  );

  // const mailOptions = constants.mailBuilder(
  //   config.smtp_email,
  //   rest.email,
  //   "Your Admin account temporary credentials are here.",
  //   emailContent
  // );

  const sendSms = await axios.request(
    constants.smsTransport(phone, emailContent),
  );

  const emailSubject = "Admin Account Credentials";

  const response = await sendEmailWithProbaho(
    result.name,
    result.email,
    emailSubject,
    html,
  );

  //log new admin creation
  try {
    let creatorName = "";
    if (superAdminId) {
      const getInfo = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getInfo?.name;
    } else if (adminId) {
      const getInfo = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getInfo?.name;
    }
    const logTitle = `নতুন এডমিন আকাউন্ট তৈরি করা হয়েছে`;
    const logDesc = `${creatorName} দ্বারা নতুন এডমিন একাউন্ট (${name}) তৈরি করা হয়েছে।`;
    const logType = Enums.logType.admin;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity log");
  }

  // const mailTransport = constants.transport;

  // const mailSendInfo = await mailTransport.sendMail(mailOptions);

  return rest;
};

const getAllAdmins = async (query = {}, courseId) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.admin.findMany({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        courseId
          ? {
              courseAdmin: {
                some: { courseId },
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

  const modifiedResponse = result?.map((admin) => ({
    ...admin,
    phone: admin?.phone
      ? admin?.phone.slice(0, -6) + "****" + admin?.phone.slice(-2)
      : null,
    email: admin?.email
      ? admin?.email.replace(/(.+)(.{3})(@.+)/, "$1***$3")
      : null,
  }));

  //total count pages
  const totalCount = await prisma.admin.count({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        courseId
          ? {
              courseAdmin: {
                some: { courseId },
              },
            }
          : {},
      ],
    },
  });

  //calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate current page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: modifiedResponse,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getAllAdminsForSuperadminPortalCall = async (query = {}, courseId) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.admin.findMany({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        courseId
          ? {
              courseAdmin: {
                some: { courseId },
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

  //total count pages
  const totalCount = await prisma.admin.count({
    where: {
      AND: [
        { ...where },
        { isDeleted: false },
        courseId
          ? {
              courseAdmin: {
                some: { courseId },
              },
            }
          : {},
      ],
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

const assignAdminToCourse = async (payload) => {
  const {
    courseId,
    newAdminId = null,
    adminId = null,
    superAdminId = null,
  } = payload;
  const data = {
    adminId: newAdminId,
    courseId,
    superAdminId,
  };

  const checkCourseAdmin = await courseAdminService.getCourseAdmin(
    courseId,
    newAdminId,
  );

  if (adminId) {
    const checkAdminPermission = await prisma.courseAdmin.findFirst({
      where: {
        adminId: adminId,
        courseId: courseId,
      },
    });
    if (!checkAdminPermission)
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You are not authorized for this access.",
      );
  }

  const response = await prisma.courseAdmin.create({ data });

  //log admin assign to course
  try {
    const courseInfo = await prisma.course.findFirst({
      where: {
        id: courseId,
      },
    });

    const newAdminInfo = await prisma.admin.findFirst({
      where: {
        id: newAdminId,
      },
    });

    let creatorName = "";
    if (superAdminId) {
      const getInfo = await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
      });
      creatorName = getInfo?.name;
    } else if (adminId) {
      const getInfo = await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
      });
      creatorName = getInfo?.name;
    }

    const logTitle = `নতুন এডমিন কোর্সে এসাইন হয়েছে`;
    const logDesc = `${creatorName} সাহেব ${newAdminInfo?.name} কে ${courseInfo?.productName} কোর্সে এসাইন করেছেন`;
    const logType = Enums.logType.admin;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity");
  }

  return true;
};

const unassignAdminCourse = async (payload) => {
  const { courseId, adminId, superAdminId } = payload;
  const getCourseAdmin = await prisma.courseAdmin.findFirst({
    where: {
      AND: [{ courseId: courseId }, { adminId: adminId }],
    },
  });

  // console.log(getCourseAdmin);

  const unassign = await prisma.courseAdmin.delete({
    where: {
      courseId_adminId: {
        courseId,
        adminId,
      },
    },
  });

  //log unassign admin
  try {
    const courseInfo = await prisma.course.findFirst({
      where: {
        id: courseId,
      },
    });

    const superAdminInfo = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const adminInfo = await prisma.admin.findFirst({
      where: {
        id: adminId,
      },
    });

    const logTitle = `এডমিন কোর্স থেকে বরখাস্ত করা হয়েছে`;
    const logDesc = `${superAdminInfo?.name}, ${adminInfo?.name} এডমিনকে ${courseInfo?.productName} কোর্স থেকে বরখাস্ত করেছেন,`;
    const logType = Enums.logType.admin;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity");
  }

  return true;
};

const deactiveAdmin = async (payload) => {
  const { adminId, superAdminId } = payload;
  const response = await prisma.admin.update({
    where: {
      id: adminId,
    },
    data: {
      status: "DISABLED",
    },
  });

  //log deactive admin
  try {
    const getAdmin = await prisma.admin.findFirst({
      where: {
        id: adminId,
      },
    });

    const getSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        id: superAdminId,
      },
    });

    const logDesc = `${getAdmin?.name} এডমিনকে ${getSuperAdmin?.email} বরখাস্ত করেছে`;
    const logTitle = `এডমিন একাউন্ট বরখাস্ত করা হয়েছে`;
    const logType = Enums.logType.admin;

    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error logging activity");
  }

  return true;
};

const deleteAdmin = async (payload) => {
  const { adminId, superAdminId } = payload;

  const getAdmin = await prisma.admin.findFirst({
    where: {
      id: adminId,
      isDeleted: false,
    },
  });

  const getSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      id: superAdminId,
    },
  });

  if (!getAdmin)
    throw new AppErrors(StatusCodes.NOT_FOUND, "admin not found to delete");

  if (!getSuperAdmin)
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "You are not authorized for this action",
    );

  const response = await prisma.admin.delete({
    where: {
      id: adminId,
    },
  });

  try {
    const logTitle = `এডমিন একাউন্ট ডিলিট করা হয়েছে`;
    const logDesc = `${getSuperAdmin?.email}, ${getAdmin?.name} এর এডমিন একাউন্ট বাতিল করে দিয়েছে`;
    const logType = Enums.logType.admin;
    await activity.logActivity(logTitle, logDesc, logType);
  } catch (error) {
    console.log(error, "Error loggine activity");
  }

  return true;
};

export const superAdminService = {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  deactiveAdmin,
  assignAdminToCourse,
  unassignAdminCourse,
  getAllAdminsForSuperadminPortalCall,
};
