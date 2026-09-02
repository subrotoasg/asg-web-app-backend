import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
dotenv.config();

const generateTempPassword = () => {
  return Math.random().toString(36).slice(-8);
};

const generateTempToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_TEMP_KEY, {
    expiresIn: process.env.JWT_TEMP_EXPIERS,
    algorithm: "HS256",
  });
};

const generateAuthToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPRESS_KEY,
    algorithm: "HS256",
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_KEY, {
    expiresIn: process.env.JWT_REFRESS_EXPRESS_KEY,
    algorithm: "HS256",
  });
};

const distinguisePhoneAndEmail = (emailOrPhone) => {
  const input = emailOrPhone.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

  if (emailRegex.test(input)) {
    return { isValid: true, type: "email" };
  }

  const digitsOnly = input.replace(/\D/g, "");

  if (bdPhoneRegex.test(digitsOnly)) {
    return { isValid: true, type: "phone" };
  }

  return { isValid: false, type: "invalid" };
};

const generateOtpSms = (otp) => {
  return `Your otp is ${otp}, otp expires in 5 minutes.`;
};

const trimBDCountryCode = (phone) => {
  return phone
    .replace(/^(\+880|880)/, "0") // Replace +880 or 880 with 0
    .replace(/[^\d]/g, ""); // Remove any non-numeric characters
};

export const helpers = {
  generateTempPassword,
  generateTempToken,
  generateAuthToken,
  generateRefreshToken,
  generateOtpSms,
  trimBDCountryCode,
  distinguisePhoneAndEmail,
};
