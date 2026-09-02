import { prisma } from "../../../../constants/index.js";
import * as UAParserJS from "ua-parser-js";
import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../errors/AppErrors.js";
import config from "../../config/index.js";
import jwt from "jsonwebtoken";
import axios from "axios";

export const findUserWithRole = async (emailOrPhone) => {
  // check admin
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });
  if (admin) return { user: admin, role: "admin" };

  // check student
  const student = await prisma.student.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });
  if (student) return { user: student, role: "student" };

  // check solver
  const solver = await prisma.solver.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });
  if (solver) return { user: solver, role: "solver" };

  // check super admin
  const superAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });
  if (superAdmin) return { user: superAdmin, role: "superAdmin" };

  return null;
};

const getClientIp = (req) => {
  try {
    const TRUSTED_PROXIES = ["127.0.0.1", "::1"];
    let ip = null;
    if (req.headers["cf-connecting-ip"]) {
      ip = req.headers["cf-connecting-ip"];
    } else if (req.headers["x-forwarded-for"]) {
      const forwardedIps = req.headers["x-forwarded-for"]
        .split(",")
        .map((ip) => ip.trim());
      ip = forwardedIps[0];
    } else {
      ip =
        req.socket?.remoteAddress || req.connection?.remoteAddress || "0.0.0.0";
    }
    if (ip === "::1") ip = "127.0.0.1";
    if (ip.includes("::ffff:")) ip = ip.split("::ffff:")[1];

    return ip || "0.0.0.0";
  } catch (error) {
    return "0.0.0.0";
  }
};
const getUserAgentInfo = (req) => {
  try {
    const ua = req.headers["user-agent"] || "Unknown User Agent";

    const parser = new UAParserJS.UAParser(ua);
    const result = parser.getResult();

    return {
      ua,
      browser: {
        name: result.browser.name || "Unknown Browser",
        version: result.browser.version || "",
      },
      os: {
        name: result.os.name || "Unknown OS",
        version: result.os.version || "",
      },
      device: {
        type: result.device.type || "Unknown Device",
        model: result.device.model || "",
        vendor: result.device.vendor || "",
      },
      cpu: {
        architecture: result.cpu.architecture || "Unknown",
      },
      engine: {
        name: result.engine.name || "Unknown",
        version: result.engine.version || "",
      },
    };
  } catch (error) {
    return {
      ua: "Unknown User Agent",
      browser: { name: "Unknown Browser", version: "" },
      os: { name: "Unknown OS", version: "" },
      device: { type: "Unknown Device", model: "", vendor: "" },
      cpu: { architecture: "Unknown" },
      engine: { name: "Unknown", version: "" },
    };
  }
};

export function captureRequestInfo(req, res, next) {
  try {
    const ip = getClientIp(req);
    const uaInfo = getUserAgentInfo(req);
    req.requestInfo = {
      ip,
      ...uaInfo,
    };

    next();
  } catch (error) {
    req.requestInfo = {
      ip: "0.0.0.0",
      ua: "Unknown User Agent",
      browser: { name: "Unknown Browser", version: "" },
      os: { name: "Unknown OS", version: "" },
      device: { type: "Unknown Device", model: "", vendor: "" },
      cpu: { architecture: "Unknown" },
      engine: { name: "Unknown", version: "" },
    };
    next();
  }
}

export const verifyUserTokenWithSignature = (token) => {
  try {
    if (!token) {
      throw new AppErrors(
        StatusCodes.NOT_ACCEPTABLE,
        "Authentication credentials missing!",
      );
    }
    const decoded = jwt.verify(token, config.jwt_access_secret_key, {
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

export const verifyRefreshTokenWithSignature = (token) => {
  try {
    if (!token) {
      throw new AppErrors(
        StatusCodes.NOT_ACCEPTABLE,
        "Authentication credentials missing!",
      );
    }
    const decoded = jwt.verify(token, config.jwt_refress_secret_key, {
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

export const getIpLocation = async (ip) => {
  try {
    const { data } = await axios.get(`https://ipwho.is/${ip}`, {
      timeout: 5000,
    });

    if (data.success === false) {
      return null;
    }

    return {
      continent: data?.continent || null,
      country: data?.country || null,
      countryCode: data?.country_code || null,
      region: data?.region || null,
      city: data?.city || null,
      timezone: data?.timezone?.id || null,
      capital: data?.capital || null,
      flag: data?.flag?.img || null,
    };
  } catch (error) {
    console.error("IP lookup failed:", error);
    return null;
  }
};
