import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../constants/index.js";
import AppErrors from "../../../errors/AppErrors.js";
import { Enums } from "../../constant/enums.js";
import { verifyRefreshTokenWithSignature } from "../authentication/auth.utlis.js";
import { helpers } from "../superAdmin/admin/admin.utils.js";
import { hashInstallationId } from "./desktopAuth.crypto.js";

const DESKTOP_SESSION_CONFLICT_WINDOW_MS = 10 * 60 * 1000;

const sessionPayload = (student, type) => ({
  id: student.id,
  email: student.email,
  phone: student.phone,
  name: student.name,
  status: student.status,
  role: student.role,
  uid: student.uid,
  oAuthLoginVerify: student.isOAuthUser,
  type,
});

const deviceData = (requestInfo = {}) => ({
  ip: requestInfo.ip,
  userAgent: requestInfo.ua,
  browserName: requestInfo.browser?.name,
  browserVersion: requestInfo.browser?.version,
  osName: requestInfo.os?.name,
  osVersion: requestInfo.os?.version,
  deviceType: requestInfo.device?.type || "Desktop",
  deviceModel: requestInfo.device?.model,
  deviceVendor: requestInfo.device?.vendor,
  cpuArchitecture: requestInfo.cpu?.architecture,
  engineName: requestInfo.engine?.name,
  engineVersion: requestInfo.engine?.version,
});

export const desktopSessionHost = (installationId) =>
  `acs-desktop:${hashInstallationId(installationId)}`;

const requireActiveStudent = async (studentId) => {
  const student = await prisma.student.findFirst({ where: { id: studentId } });

  if (!student) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Student account was not found");
  }
  if (student.status !== "ACTIVE") {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "Your access is restricted. Please contact administration.",
    );
  }
  return student;
};

const protectAgainstRecentDeviceSwitch = async (studentId, hostName) => {
  const recentOtherSession = await prisma.studentAuthLog.findFirst({
    where: {
      studentId,
      hostName: { not: hostName },
      refreshToken: { not: null },
      lastLogedIn: {
        gte: new Date(Date.now() - DESKTOP_SESSION_CONFLICT_WINDOW_MS),
      },
    },
    orderBy: { lastLogedIn: "desc" },
  });

  if (recentOtherSession) {
    throw new AppErrors(
      StatusCodes.PRECONDITION_FAILED,
      "আমাদের নীতি অনুযায়ী, একটি অ্যাকাউন্ট থেকে এক সময়ে শুধুমাত্র একটি ডিভাইসে লগইন করার অনুমতি রয়েছে। অন্য ডিভাইসে সেশনটি শেষ হওয়ার জন্য অনুগ্রহ করে ৫ থেকে ১০ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
    );
  }

  await prisma.studentAuthLog.updateMany({
    where: {
      studentId,
      hostName: { not: hostName },
      refreshToken: { not: null },
    },
    data: { refreshToken: null },
  });
};

export const issueDesktopSession = async ({
  studentId,
  installationId,
  requestInfo,
  provider,
  providerUid,
}) => {
  const student = await requireActiveStudent(studentId);
  const hostName = desktopSessionHost(installationId);
  const existingLog = await prisma.studentAuthLog.findFirst({
    where: { hostName, studentId: student.id },
    orderBy: { lastLogedIn: "desc" },
  });

  await protectAgainstRecentDeviceSwitch(student.id, hostName);

  const authToken = helpers.generateAuthToken(
    sessionPayload(student, Enums.tokenType.access),
  );
  const refreshToken = helpers.generateRefreshToken(
    sessionPayload(student, Enums.tokenType.refresh),
  );
  const authMethod = provider === "APPLE" ? "APPLE" : "GOOGLE";
  const data = {
    refreshToken,
    lastLogedIn: new Date(),
    hoppCount: 1,
    authMethod,
    providerUid,
    ...deviceData(requestInfo),
  };

  if (existingLog) {
    await prisma.studentAuthLog.update({
      where: { id: existingLog.id },
      data,
    });
  } else {
    await prisma.studentAuthLog.create({
      data: {
        studentId: student.id,
        hostName,
        ...data,
      },
    });
  }

  return {
    authToken,
    refreshToken,
    message: "",
    oAuthVerified: student.isOAuthUser,
  };
};

export const refreshDesktopSession = async ({
  refreshToken,
  installationId,
}) => {
  const decoded = verifyRefreshTokenWithSignature(refreshToken);
  if (!decoded?.id || decoded.type !== Enums.tokenType.refresh) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Invalid desktop refresh token",
    );
  }

  const student = await requireActiveStudent(decoded.id);
  const hostName = desktopSessionHost(installationId);
  const authLog = await prisma.studentAuthLog.findFirst({
    where: {
      studentId: student.id,
      hostName,
      refreshToken,
    },
    orderBy: { lastLogedIn: "desc" },
  });

  if (!authLog) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "This desktop session is no longer active",
    );
  }

  const nextRefreshToken = helpers.generateRefreshToken(
    sessionPayload(student, Enums.tokenType.refresh),
  );
  const authToken = helpers.generateAuthToken(
    sessionPayload(student, Enums.tokenType.access),
  );

  const rotated = await prisma.studentAuthLog.updateMany({
    where: {
      id: authLog.id,
      refreshToken,
    },
    data: {
      refreshToken: nextRefreshToken,
      lastLogedIn: new Date(),
    },
  });

  if (rotated.count !== 1) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "This desktop refresh token was already used",
    );
  }

  return {
    authToken,
    refreshToken: nextRefreshToken,
    oAuthVerified: student.isOAuthUser,
  };
};

export const logoutDesktopSession = async ({
  refreshToken,
  installationId,
}) => {
  const hostName = desktopSessionHost(installationId);
  await prisma.studentAuthLog.updateMany({
    where: { hostName, refreshToken },
    data: { refreshToken: null },
  });
  return {};
};
