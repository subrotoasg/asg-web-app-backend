import { StatusCodes } from "http-status-codes";

import { prisma } from "../../../../../constants/index.js";

import AppErrors from "../../../../errors/AppErrors.js";

import config from "../../../config/index.js";

import { invalidateStudentSessionCache } from "./student-session.cache.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function getNextAllowedTimeMessage(lastLogedIn) {
  const nextAllowedTime = new Date(
    new Date(lastLogedIn).getTime() + SIX_HOURS_MS,
  );
  const year = nextAllowedTime.getFullYear();
  const month = (nextAllowedTime.getMonth() + 1).toString().padStart(2, "0");
  const day = nextAllowedTime.getDate().toString().padStart(2, "0");
  const hours = nextAllowedTime.getHours().toString().padStart(2, "0");
  const minutes = nextAllowedTime.getMinutes().toString().padStart(2, "0");

  return {
    year,
    month,
    day,
    hours,
    minutes,
  };
}

export async function registerStudentSession({
  studentId,
  hostName,
  refreshToken,
  requestInfo = {},
}) {
  if (!studentId || !hostName || !refreshToken) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Invalid student session data",
    );
  }
  let message = "";

  const existingSession = await prisma.studentAuthLog.findFirst({
    where: {
      studentId,
      hostName,
    },

    orderBy: {
      lastLogedIn: "desc",
    },
  });

  if (!existingSession) {
    await prisma.studentAuthLog.create({
      data: {
        studentId,

        hostName,

        refreshToken,

        lastLogedIn: new Date(),

        ip: requestInfo?.ip,

        userAgent: requestInfo?.ua,

        browserName: requestInfo?.browser?.name,

        browserVersion: requestInfo?.browser?.version,

        osName: requestInfo?.os?.name,

        osVersion: requestInfo?.os?.version,

        deviceType: requestInfo?.device?.type,

        deviceModel: requestInfo?.device?.model,

        deviceVendor: requestInfo?.device?.vendor,

        cpuArchitecture: requestInfo?.cpu?.architecture,

        engineName: requestInfo?.engine?.name,

        engineVersion: requestInfo?.engine?.version,
      },
    });

    await invalidateStudentSessionCache({
      studentId,
      hostName,
    });

    return {
      message,
    };
  }

  const lastLogedIn = new Date(existingSession.lastLogedIn);

  const now = new Date();

  const diffMs = now.getTime() - lastLogedIn.getTime();

  const isWithinSixHours = diffMs < SIX_HOURS_MS;

  if (isWithinSixHours) {
    if (existingSession.hoppCount > Number(config?.acceptHopCount)) {
      await prisma.studentAuthLog.update({
        where: {
          id: existingSession.id,
        },

        data: {
          refreshToken: null,
        },
      });

      await invalidateStudentSessionCache({
        studentId,
        hostName,
      });

      const { year, month, day, hours, minutes } =
        getNextAllowedTimeMessage(lastLogedIn);

      throw new AppErrors(
        StatusCodes.PRECONDITION_FAILED,

        `WARNING:আপনার অ্যাকাউন্ট বিভিন্ন ডিভাইসে একাধিকবার লগইন হয়েছে। আগামী ৬ ঘণ্টা, ${day}-${month}-${year} ${hours}:${minutes} পর্যন্ত আপনার লগইন নিষিদ্ধ করা হলো,`,
      );
    }

    message =
      "Sign In Successful, NB:আপনার অ্যাকাউন্ট বিভিন্ন ডিভাইসে একাধিকবার লগইন হয়েছে, নিরাপত্তার স্বার্থে ভবিষ্যৎ এ আপনার সাময়িক এক্সেস বন্ধ হতে পারে।";
  }

  await prisma.studentAuthLog.update({
    where: {
      id: existingSession.id,
    },

    data: {
      refreshToken,

      lastLogedIn: new Date(),

      hoppCount: isWithinSixHours
        ? {
            increment: 1,
          }
        : 1,

      ip: requestInfo?.ip,

      userAgent: requestInfo?.ua,

      browserName: requestInfo?.browser?.name,

      browserVersion: requestInfo?.browser?.version,

      osName: requestInfo?.os?.name,

      osVersion: requestInfo?.os?.version,

      deviceType: requestInfo?.device?.type,

      deviceModel: requestInfo?.device?.model,

      deviceVendor: requestInfo?.device?.vendor,

      cpuArchitecture: requestInfo?.cpu?.architecture,

      engineName: requestInfo?.engine?.name,

      engineVersion: requestInfo?.engine?.version,
    },
  });

  await invalidateStudentSessionCache({
    studentId,
    hostName,
  });

  return {
    message,
  };
}

export async function revokeStudentSession({
  studentId,
  hostName,
  refreshToken,
}) {
  if (!studentId || !hostName) {
    return false;
  }

  await prisma.studentAuthLog.updateMany({
    where: {
      studentId,

      hostName,

      ...(refreshToken
        ? {
            refreshToken,
          }
        : {}),
    },

    data: {
      refreshToken: null,
    },
  });

  await invalidateStudentSessionCache({
    studentId,
    hostName,
  });

  return true;
}

export async function revokeAllStudentSessions(studentId) {
  if (!studentId) {
    return;
  }

  await prisma.studentAuthLog.updateMany({
    where: {
      studentId,
    },

    data: {
      refreshToken: null,
    },
  });
}
