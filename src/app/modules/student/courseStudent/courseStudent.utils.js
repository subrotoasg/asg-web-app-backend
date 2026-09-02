import axios from "axios";
import { prisma } from "../../../../../constants/index.js";
import config from "../../../config/index.js";
import { constants } from "../../../constant/index.js";
import { helpers } from "../../superAdmin/admin/admin.utils.js";
import bcrypt from "bcryptjs";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";
import { Enums } from "../../../constant/enums.js";

export const createOrRetrieve = async (
  name = "",
  email = "",
  phone = "",
  uid = "",
) => {
  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  if (checkForExistingStudent) {
    const jwtpayload = {
      id: checkForExistingStudent?.id,
      email: checkForExistingStudent?.email,
      phone: checkForExistingStudent?.phone,
      name: checkForExistingStudent?.name,
      role: checkForExistingStudent?.role,
      status: checkForExistingStudent?.status,
      uid: checkForExistingStudent?.uid,
      type: Enums.tokenType.access,
    };

    const jwtRefreshpayload = {
      id: checkForExistingStudent?.id,
      email: checkForExistingStudent?.email,
      phone: checkForExistingStudent?.phone,
      name: checkForExistingStudent?.name,
      role: checkForExistingStudent?.role,
      status: checkForExistingStudent?.status,
      uid: checkForExistingStudent?.uid,
      type: Enums.tokenType.refresh,
    };

    //clg

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshpayload);

    const storeRefreshToken = await prisma.student.update({
      where: {
        id: checkForExistingStudent?.id,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    return {
      id: checkForExistingStudent?.id,
      authToken: authToken,
      refreshToken: refreshToken,
    };
  }

  const tempPassword = helpers.generateTempPassword();

  const hashedPassword = await bcrypt.hash(
    tempPassword,
    Number(config.bcrypt_hash_random),
  );

  const createStudent = await prisma.student.create({
    data: {
      name,
      phone: trimmedPhone,
      email,
      password: hashedPassword,
      uid: uid,
    },
  });

  const jwtpayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid,
    type: Enums.tokenType.access,
  };

  const jwtRefreshpayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid,
    type: Enums.tokenType.refresh,
  };

  const authToken = helpers.generateAuthToken(jwtpayload);
  const refreshToken = helpers.generateRefreshToken(jwtRefreshpayload);

  const storeRefreshToken = await prisma.student.update({
    where: {
      id: createStudent?.id,
    },
    data: {
      refreshToken: refreshToken,
    },
  });

  const logInUiLink = `https://academic.aparsclassroom.com/login`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Apar's Classroom Webapp account credentials.</h2>
    <p>Your student account has been migrated successfully.</p>
    <p>Email: ${email}</p>
    <p>Phone: ${trimmedPhone}</p>
    <p>Password: ${tempPassword}</p>
    <a href="${logInUiLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
      Login
    </a>
    <p>Thanks,<br>The ASG SHOP Team.</p>
  </div>
`;

  const emailContent = constants.newMigrateInfoText(
    email,
    trimmedPhone,
    tempPassword,
    logInUiLink,
  );

  const sendSms = await axios.request(
    constants.smsTransport(trimmedPhone, emailContent),
  );

  const emailSubject = `${name} your migrated account credentials`;

  const response = await sendEmailWithProbaho(name, email, emailSubject, html);

  return {
    id: createStudent?.id,
    authToken: authToken,
    refreshToken: refreshToken,
  };
};
