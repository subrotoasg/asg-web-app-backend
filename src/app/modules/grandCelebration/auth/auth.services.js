import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { helpers } from "../../superAdmin/admin/admin.utils.js";
import { OtpService } from "../../../../helper/otpService.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../../config/index.js";
import { sendEmailWithProbaho } from "../../../utlis/sendEmail.js";
import { Enums } from "../../../constant/enums.js";
import {
  findUserWithRole,
  verifyRefreshTokenWithSignature,
  verifyUserTokenWithSignature,
} from "../../authentication/auth.utlis.js";
import crypto from "crypto";
import { validateGoogleToken } from "../../../../helper/googleValidation.js";
import { validateAppleToken } from "../../../../helper/appleValidation.js";
import { initFirebase } from "../../student/firebase/configFirebase/admin.js";
import admin from "firebase-admin";
import axios from "axios";
import {
  generateAuthToken,
  generateRefreshToken,
  generateTempAuthToken,
  generateTempRefreshToken,
  verifyToken,
} from "./auth.utlis.js";

const MAX_OTP_ATTEMPTS = 4;
const RESEND_WAIT_MS = 2 * 60 * 1000;
const OTP_VALIDITY_CHECK = true;

//helper function start
const buildTokens = (record) => {
  const jwtPayload = {
    id: record?.id,
    phone: record?.phone,
    role: record?.role,
    isVerifyPhone: record?.isVerifyPhone,
  };

  const authToken = generateAuthToken(jwtPayload);
  const refreshToken = generateRefreshToken(jwtPayload);

  return { authToken, refreshToken };
};

const buildTokensTemp = (record) => {
  const jwtPayload = {
    id: record?.id,
    phone: record?.phone,
    role: record?.role,
    isVerifyPhone: record?.isVerifyPhone,
  };

  const authToken = generateTempAuthToken(jwtPayload);
  const refreshToken = generateTempRefreshToken(jwtPayload);

  return { authToken, refreshToken };
};

const assertOtpRateLimit = (record) => {
  if (record.count >= MAX_OTP_ATTEMPTS) {
    throw new AppErrors(StatusCodes.TOO_MANY_REQUESTS, "Too many OTP attempts");
  }

  const nextAllowedResendTime =
    new Date(record.updatedAt).getTime() + RESEND_WAIT_MS;
  const now = Date.now();

  if (now < nextAllowedResendTime) {
    const remainingSeconds = Math.ceil((nextAllowedResendTime - now) / 1000);
    throw new AppErrors(
      StatusCodes.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before requesting another OTP`,
    );
  }
};
//helpers function end

//Sign up.
const granCelebrationSignUp = async (payload = {}) => {
  const { phone } = payload;
  const trimmedPhone = helpers.trimBDCountryCode(phone);
  const existingRecord = await prisma.grandCelebrationAuth.findFirst({
    where: { phone: trimmedPhone },
  });

  let authRecord;
  let otp;
  let otpExpiry;

  if (existingRecord) {
    if (existingRecord.isVerifyPhone) {
      return await grandCelebrationLoginRequestOtp(payload);
    }

    if (existingRecord.count >= MAX_OTP_ATTEMPTS) {
      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        "Too many OTP attempts",
      );
    }

    const nextAllowedResendTime =
      new Date(existingRecord.updatedAt).getTime() + RESEND_WAIT_MS;
    const now = Date.now();

    if (now < nextAllowedResendTime) {
      const remainingSeconds = Math.ceil((nextAllowedResendTime - now) / 1000);
      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }

    ({ otp, otpExpiry } = await OtpService.sendOtpToPhone(phone));

    authRecord = await prisma.grandCelebrationAuth.update({
      where: { id: existingRecord.id },
      data: {
        otp: otp.toString(),
        expiresAt: otpExpiry,
        otpSendAt: new Date(),
        count: { increment: 1 },
      },
    });
  } else {
    ({ otp, otpExpiry } = await OtpService.sendOtpToPhone(phone));

    try {
      authRecord = await prisma.grandCelebrationAuth.create({
        data: {
          phone: trimmedPhone,
          otp: otp.toString(),
          expiresAt: otpExpiry,
          otpSendAt: new Date(),
          count: 1,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return await grandCelebrationLoginRequestOtp(payload);
      }
      throw err;
    }
  }

  const { authToken, refreshToken } = buildTokensTemp(authRecord);

  return {
    authToken: null,
    refreshToken,
    isVerifyPhone: authRecord.isVerifyPhone,
  };
};

//verify signup otp
const grandCelebrationVerifySignUp = async (payload = {}, token) => {
  const decoded = verifyToken(token, config.auth_refresh_temp_key);
  const { otp } = payload;
  const phone = decoded?.phone;
  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const record = await prisma.grandCelebrationAuth.findFirst({
    where: { phone: trimmedPhone },
  });

  if (!record) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "কোনো অ্যাকাউন্ট পাওয়া যায়নি");
  }

  // if (record.isVerifyPhone) {
  //   throw new AppErrors(StatusCodes.CONFLICT, "এই নম্বরটি ইতোমধ্যে ভেরিফাইড");
  // }

  if (!record.otp || !record.expiresAt) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "কোনো ওটিপি অনুরোধ পাওয়া যায়নি, দয়া করে নতুন ওটিপি চান",
    );
  }

  if (new Date() > new Date(record.expiresAt)) {
    throw new AppErrors(StatusCodes.GONE, "OTP এর মেয়াদ শেষ হয়ে গেছে");
  }

  if (record.otp.toString() !== otp?.toString()) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "OTP ভুল হয়েছে");
  }

  const verifiedRecord = await prisma.grandCelebrationAuth.update({
    where: { id: record.id },
    data: {
      isVerifyPhone: true,
      otp: null,
      expiresAt: null,
      otpSendAt: null,
      count: 0,
    },
  });

  const { authToken, refreshToken } = buildTokens(verifiedRecord);

  return {
    authToken,
    refreshToken,
    isVerifyPhone: verifiedRecord.isVerifyPhone,
  };
};

//login request with phone Number
const grandCelebrationLoginRequestOtp = async (payload = {}) => {
  const { phone } = payload;
  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const record = await prisma.grandCelebrationAuth.findFirst({
    where: { phone: trimmedPhone },
  });

  if (!record) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "কোনো অ্যাকাউন্ট পাওয়া যায়নি");
  }

  if (!record.isVerifyPhone) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "প্রথমে আপনার ফোন নম্বর ভেরিফাই করুন",
    );
  }

  assertOtpRateLimit(record);

  const { otp, otpExpiry } = await OtpService.sendOtpToPhone(phone);

  await prisma.grandCelebrationAuth.update({
    where: { id: record.id },
    data: {
      otp: otp.toString(),
      expiresAt: otpExpiry,
      otpSendAt: new Date(),
      count: { increment: 1 },
    },
  });

  const { authToken, refreshToken } = buildTokensTemp(record);

  return {
    authToken: null,
    refreshToken,
    isVerifyPhone: record.isVerifyPhone,
  };
};

//login celebration login OTP Verify
const grandCelebrationLogin = async (payload = {}, token) => {
  const decoded = verifyToken(token, config.auth_refresh_temp_key);
  const { otp } = payload;
  const phone = decoded?.phone;

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const record = await prisma.grandCelebrationAuth.findFirst({
    where: { phone: trimmedPhone },
  });

  if (!record) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "কোনো অ্যাকাউন্ট পাওয়া যায়নি");
  }

  if (!record.isVerifyPhone) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "প্রথমে আপনার ফোন নম্বর ভেরিফাই করুন",
    );
  }

  if (!record.otp || !record.expiresAt) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "কোনো ওটিপি অনুরোধ পাওয়া যায়নি, দয়া করে নতুন ওটিপি চান",
    );
  }

  if (OTP_VALIDITY_CHECK && new Date() > new Date(record.expiresAt)) {
    throw new AppErrors(StatusCodes.GONE, "OTP এর মেয়াদ শেষ হয়ে গেছে");
  }

  if (record.otp.toString() !== otp?.toString()) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "OTP ভুল হয়েছে");
  }

  const loggedInRecord = await prisma.grandCelebrationAuth.update({
    where: { id: record.id },
    data: {
      otp: null,
      expiresAt: null,
      otpSendAt: null,
      count: 0,
    },
  });

  const { authToken, refreshToken } = buildTokens(loggedInRecord);

  return { authToken, refreshToken };
};

//resend Otp
const grandCelebrationResendOtp = async (user, token) => {
  const phone = user?.phone;
  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const record = await prisma.grandCelebrationAuth.findFirst({
    where: { phone: trimmedPhone },
  });

  if (!record) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "কোনো অ্যাকাউন্ট পাওয়া যায়নি");
  }

  assertOtpRateLimit(record);

  const { otp, otpExpiry } = await OtpService.sendOtpToPhone(phone);

  const updatedRecord = await prisma.grandCelebrationAuth.update({
    where: { id: record.id },
    data: {
      otp: otp.toString(),
      expiresAt: otpExpiry,
      otpSendAt: new Date(),
      count: { increment: 1 },
    },
  });

  return {
    isVerifyPhone: updatedRecord.isVerifyPhone,
    message: "OTP পুনরায় পাঠানো হয়েছে",
  };
};

export const grandCelebrationAuth = {
  granCelebrationSignUp,
  grandCelebrationVerifySignUp,
  grandCelebrationLoginRequestOtp,
  grandCelebrationLogin,
  grandCelebrationResendOtp,
};
