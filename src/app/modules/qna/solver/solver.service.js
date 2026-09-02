import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../../errors/AppErrors.js";
import { prisma } from "../../../../../constants/index.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { Enums } from "../../../constant/enums.js";
import { helpers } from "../../superAdmin/admin/admin.utils.js";
import bcrypt from "bcrypt";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
} from "./solver.constants.js";
import config from "../../../config/index.js";
import { constants } from "../../../constant/index.js";
import axios from "axios";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";

const registration = async (uniIdImage, payload) => {
  const { name, phone, email, address, HSC, University, UniAbbreviation } =
    payload;

  if (!uniIdImage)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "please provide an clear image of your University any Identification."
    );

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const checkExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  const checkExistingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  const checkExistingSolver = await prisma.solver.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  if (checkExistingStudent || checkExistingSolver || checkExistingAdmin) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "An account is already registered to this email or phone."
    );
  }

  const data = {
    name,
    phone: trimmedPhone,
    email,
    address,
    HSC,
    University,
    UniAbbreviation,
    UniversityId: uniIdImage,
  };

  const register = await prisma.solver.create({
    data: data,
  });

  return true;
};

const getAllSolvers = async (query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields
  );

  const result = await prisma.solver.findMany({
    where: {
      AND: [
        { ...where },
        { status: Enums.status.ACTIVE },
        query?.filter === "applications"
          ? { approved: false }
          : { approved: true },
      ],
    },
    skip,
    take,
    orderBy: [{ totalSolved: "desc" }, { createdAt: "asc" }],
    select: selectFields,
  });

  const totalCount = await prisma.solver.count({
    where: {
      AND: [
        { ...where },
        { status: Enums.status.ACTIVE },
        query?.filter === "applications"
          ? { approved: false }
          : { approved: true },
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

const acceptOrRejectRegistration = async (applicationId, payload) => {
  const { accept } = payload;
  //depending on accept approve solver applicaiton, or reject

  const getApplication = await prisma.solver.findUnique({
    where: {
      id: applicationId,
    },
  });

  if (accept == true) {
    const tempPassword = helpers.generateTempPassword();

    const hashedPassword = await bcrypt.hash(
      tempPassword,
      Number(process.env.BCREPT_HASH_RANDOM)
    );

    const data = {
      approved: true,
      password: hashedPassword,
    };

    const result = await prisma.solver.update({
      where: {
        id: applicationId,
      },
      data: data,
    });

    const logInUiLink = `${config.frontend_url_prod}/login`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Apar'sClassroom Webapp doubt-solver account credentials.</h2>
        <p>Your solver account has been created successfully.</p>
        <p>Email: ${getApplication.email}</p>
        <p>Phone: ${getApplication.phone}</p>
        <p>Password: ${tempPassword}</p>
        <a href="${logInUiLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Login
        </a>
        <p>Thanks,<br>The ASG SHOP Team.</p>
    </div>
    `;

    const emailContent = constants.newSolverAccountInfoText(
      getApplication?.email,
      getApplication?.phone,
      tempPassword,
      logInUiLink
    );

    const sendSms = await axios.request(
      constants.smsTransport(getApplication?.phone, emailContent)
    );

    const emailSujbect = "Doubt Solver account application update";

    const response = await sendEmailWithProbaho(
      getApplication?.name,
      getApplication?.email,
      emailSujbect,
      html
    );

    return true;
  } else {
    const asgshopmail = "tech@asgshop.ai";

    const rejectionHtml = `
        <!-- Subject: Application Update – Doubt Solver Program -->

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;padding:24px 0;">
            <tr>
                <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <tr>
                <td style="padding:24px 24px 0 24px;background:#111827;">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;line-height:1.4;">Application Update</h2>
                    <p style="margin:8px 0 0 0;color:#d1d5db;font-size:13px;line-height:1.6;">Doubt Solver Program</p>
                </td>
            </tr>

            <tr>
                <td style="padding:24px 24px 0 24px;">
                    <p style="margin:0 0 12px 0;color:#111827;font-size:16px;line-height:1.6;">Hi <strong>${getApplication?.name}</strong>,</p>
                    <p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.8;">
                        Thank you for taking the time to apply to our <strong>Doubt Solver</strong> program at Apar's Classroom. We truly appreciate your interest and the effort you put into your application.
                    </p>
                    <p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.8;">
                        After careful review, we will not be moving forward with your application at this time. This was a competitive cycle and we had to make difficult decisions.
                    </p>

                    <p style="margin:0 0 12px 0;color:#374151;font-size:14px;line-height:1.8;">
                        We’d be glad to see you re-apply in the future. If you choose to apply again, strengthening your profile.
                    </p>

                    <p style="margin:8px 0 0 0;color:#6b7280;font-size:12px;line-height:1.7;">
                        If you have questions, reply to this email or contact us at <a href="mailto:${asgshopmail}" style="color:#2563eb;text-decoration:none;">${asgshopmail}</a>.
                    </p>
                </td>
            </tr>

            <tr>
                <td style="padding:20px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                        Thanks for your interest,<br>
                        <strong>The ASG SHOP Team</strong><br>
                        <span style="color:#9ca3af;">aparsclassroom.com</span>
                    </p>
                </td>
            </tr>
      </table>

        <p style="margin:16px 0 0 0;color:#9ca3af;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
        You’re receiving this email because you applied for the Doubt Solver program at Apar's Classroom.
        </p>
        </td>
    </tr>
        </table>

    `;

    const emailSubject = "Doubt solver application update";

    const response = await sendEmailWithProbaho(
      getApplication?.name,
      getApplication?.email,
      emailSubject,
      rejectionHtml
    );

    const cleanUpApplication = await prisma.solver.delete({
      where: {
        id: applicationId,
      },
    });
    return true;
  }
};

export const SolverServices = {
  registration,
  getAllSolvers,
  acceptOrRejectRegistration,
};
