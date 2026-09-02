import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import AppErrors from "../../../../errors/AppErrors.js";
import config from "../../../config/index.js";
import { StatusCodes } from "http-status-codes";

export const generateTempAuthToken = (payload) => {
  return jwt.sign(payload, config.auth_token_temp_key, {
    expiresIn: config.auth_token_expire_temp,
    algorithm: "HS256",
  });
};

export const generateTempRefreshToken = (payload) => {
  return jwt.sign(payload, config.auth_refresh_temp_key, {
    expiresIn: config.auth_refresh_expire_temp,
    algorithm: "HS256",
  });
};

export const generateAuthToken = (payload) => {
  return jwt.sign(payload, config.auth_token_key, {
    expiresIn: config.auth_token_expire,
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.auth_refresh_token_key, {
    expiresIn: config.auth_refresh_expire,
    algorithm: "HS256",
  });
};

export const verifyToken = (token, secret) => {
  try {
    if (!token) {
      throw new AppErrors(
        StatusCodes.NOT_ACCEPTABLE,
        "Authentication credentials missing!",
      );
    }
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!decoded) {
      throw new AppErrors(
        StatusCodes.UNAUTHORIZED,
        "Session expired. Please login again.",
      );
    }
    return decoded;
  } catch (error) {
    handleJwtError(error);
  }
};

const handleJwtError = (error) => {
  if (error.name === "TokenExpiredError") {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "Session expired. Please login again.",
    );
  }
  if (error.name === "JsonWebTokenError") {
    switch (error.message) {
      case "invalid signature":
        throw new AppErrors(
          StatusCodes.UNAUTHORIZED,
          "Signature verification failed.",
        );

      case "jwt malformed":
        throw new AppErrors(
          StatusCodes.NOT_ACCEPTABLE,
          "Malformed credentials.",
        );

      case "jwt signature is required":
        throw new AppErrors(
          StatusCodes.NOT_ACCEPTABLE,
          "Signature is required.",
        );

      case "invalid token":
        throw new AppErrors(StatusCodes.NOT_ACCEPTABLE, "Invalid credentials.");

      case "jwt audience invalid":
        throw new AppErrors(StatusCodes.NOT_ACCEPTABLE, "Invalid audience.");

      case "jwt issuer invalid":
        throw new AppErrors(StatusCodes.NOT_ACCEPTABLE, "Invalid issuer.");

      case "jwt id invalid":
        throw new AppErrors(StatusCodes.NOT_ACCEPTABLE, "Invalid identifier.");

      case "jwt subject invalid":
        throw new AppErrors(StatusCodes.NOT_ACCEPTABLE, "Invalid subject.");

      default:
        throw new AppErrors(
          StatusCodes.NOT_ACCEPTABLE,
          "Authentication failed.",
        );
    }
  }

  throw new AppErrors(
    StatusCodes.NOT_ACCEPTABLE,
    "Session expired. Please login again.",
  );
};
