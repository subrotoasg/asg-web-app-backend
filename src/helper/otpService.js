import axios from "axios";
import crypto from "node:crypto";
import { constants } from "../app/constant/index.js";
import { helpers } from "../app/modules/superAdmin/admin/admin.utils.js";
import config from "../app/config/index.js";
import { sendEmailWithProbaho } from "../app/utlis/sendEmail.js";

const sendOtpToPhone = async (phone) => {
  const otp = crypto.randomInt(10000, 99999);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const otpSms = helpers.generateOtpSms(otp);
  const sendSms = await axios.request(constants.smsTransport(phone, otpSms));
  return { otp, otpExpiry };
};

// const sendOtpToEmail = async (email) => {
//   const otp = crypto.randomInt(10000, 99999);
//   const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
//   const otpSms = helpers.generateOtpSms(otp);
//   const buildMail = constants.mailBuilder(
//     config.smtp_email,
//     email,
//     "Your login Otp.",
//     otpSms
//   );
//   const mailTransport = constants.transport;
//   const sendEmail = await mailTransport.sendMail(buildMail);
//   return { otp, otpExpiry };
// };

const sendOtpToEmailForStudent = async (email) => {
  const otp = crypto.randomInt(10000, 99999);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const otpSms = helpers.generateOtpSms(otp);
  const subject = "Apars Classroom WebApp login OTP";
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; color: #333;">
    <h2 style="color: #2c3e50;">Your Login OTP</h2>
    <p>We received a request to log in to your account.</p>
    
    <div style="
      display: inline-block;
      background-color: #f4f6f8;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #2c3e50;
      margin: 16px 0;
      border: 1px solid #ccc;
    ">
      ${otpSms}
    </div>

    <p>If you didn’t request this, you can safely ignore this email.</p>
    <p>Thanks,<br><strong>The ASG SHOP Team</strong></p>
  </div>
`;
  const sendMail = await sendEmailWithProbaho(null, email, subject, html);
  return { otp, otpExpiry };
};

const sendOtpToEmail = async (email) => {
  const otp = crypto.randomInt(10000, 99999);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const otpSms = helpers.generateOtpSms(otp);
  const subject = "Apars Classroom WebApp Superadmin login OTP";
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; color: #333;">
    <h2 style="color: #2c3e50;">Your Login OTP</h2>
    <p>We received a request to log in to your Superadmin account.</p>
    
    <div style="
      display: inline-block;
      background-color: #f4f6f8;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #2c3e50;
      margin: 16px 0;
      border: 1px solid #ccc;
    ">
      ${otpSms}
    </div>

    <p>If you didn’t request this, you can safely ignore this email.</p>
    <p>Thanks,<br><strong>The ASG SHOP Team</strong></p>
  </div>
`;
  const sendMail = await sendEmailWithProbaho(null, email, subject, html);
  return { otp, otpExpiry };
};

export const OtpService = {
  sendOtpToPhone,
  sendOtpToEmail,
  sendOtpToEmailForStudent,
};
