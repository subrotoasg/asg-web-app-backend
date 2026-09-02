import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../constants/index.js";
import AppErrors from "../../../errors/AppErrors.js";
import { helpers } from "../superAdmin/admin/admin.utils.js";
import { OtpService } from "../../../helper/otpService.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "../../config/index.js";
import { sendEmailWithProbaho } from "../../utlis/sendEmail.js";
import { Enums } from "../../constant/enums.js";
import {
  selectFieldsForAdmin,
  selectFieldsForStudent,
  selectFieldsForSuperAdmin,
} from "./auth.constants.js";
import { activity } from "../../../helper/activityLog.js";
import {
  findUserWithRole,
  verifyRefreshTokenWithSignature,
  verifyUserTokenWithSignature,
} from "./auth.utlis.js";

import crypto from "crypto";
import { validateGoogleToken } from "../../../helper/googleValidation.js";
import { validateAppleToken } from "../../../helper/appleValidation.js";
import { initFirebase } from "../student/firebase/configFirebase/admin.js";
import admin from "firebase-admin";
import axios from "axios";
import {
  getCachedAuthUser,
  invalidateAuthUserCache,
} from "./cache/auth-user.cache.js";
import {
  registerStudentSession,
  revokeStudentSession,
} from "./session/student-session.service.js";

async function generateUniquePhone() {
  while (true) {
    const phone = `011${crypto.randomInt(10000000, 100000000)}`;

    const existing = await prisma.student.findFirst({
      where: { phone },
    });

    if (!existing) {
      return phone;
    }
  }
}

const signUpV2 = async (payload, hostName, requestInfo, platform) => {
  if (platform === "ios") {
    const { name, phone, email, password } = payload;

    const iosPhone = phone ? phone : await generateUniquePhone();

    const trimmedPhone = helpers.trimBDCountryCode(iosPhone);

    const checkForExistingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    const checkForAdmin = await prisma.admin.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    const checkSolver = await prisma.solver.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    if (checkForExistingStudent || checkForAdmin || checkSolver) {
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "এই ইমেইল/ফোন ইতোমধ্যে লিপিবদ্ধ, দয়াকরে ভিন্ন ইমেইল/ফোন দিন",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_hash_random),
    );

    const createStudent = await prisma.student.create({
      data: {
        name,
        phone: trimmedPhone,
        email,
        password: hashedPassword,
      },
    });

    //log activity
    const logTitle = `নতুন স্টুডেন্ট সাইন-আপ করেছেন।`;
    const logDescription = `${name} সাইন-আপ করেছেন।`;
    const logType = Enums.logType.student;
    await activity.logActivity(logTitle, logDescription, logType);

    const jwtpayload = {
      id: createStudent?.id,
      email: createStudent?.email,
      phone: createStudent?.phone,
      name: createStudent?.name,
      role: createStudent?.role,
      status: createStudent?.status,
      uid: createStudent?.uid, //the updated uid
      oAuthLoginVerify: createStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: createStudent?.id,
      email: createStudent?.email,
      phone: createStudent?.phone,
      name: createStudent?.name,
      role: createStudent?.role,
      status: createStudent?.status,
      uid: createStudent?.uid, //the updated uid
      oAuthLoginVerify: createStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const storeRefreshToken = await prisma.student.update({
      where: {
        id: createStudent?.id,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    //new code for auth logs
    await registerStudentSession({
      studentId: createStudent.id,
      hostName,
      refreshToken,
      requestInfo,
    });

    return {
      authToken: authToken,
      refreshToken: refreshToken,
    };
  } else {
    const { name, phone, email, password } = payload;

    if (!phone)
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "একটি সঠিক বাংলাদেশি নম্বর (+8801XXXXXXX) প্রদান করুন",
      );

    const trimmedPhone = helpers.trimBDCountryCode(phone);

    const checkForExistingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    const checkForAdmin = await prisma.admin.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    const checkSolver = await prisma.solver.findFirst({
      where: {
        OR: [{ email: email }, { phone: trimmedPhone }],
      },
    });

    if (checkForExistingStudent || checkForAdmin || checkSolver) {
      throw new AppErrors(
        StatusCodes.CONFLICT,
        "এই ইমেইল/ফোন ইতোমধ্যে লিপিবদ্ধ, দয়াকরে ভিন্ন ইমেইল/ফোন দিন",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_hash_random),
    );

    const createStudent = await prisma.student.create({
      data: {
        name,
        phone: trimmedPhone,
        email,
        password: hashedPassword,
      },
    });

    //log activity
    const logTitle = `নতুন স্টুডেন্ট সাইন-আপ করেছেন।`;
    const logDescription = `${name} সাইন-আপ করেছেন।`;
    const logType = Enums.logType.student;
    await activity.logActivity(logTitle, logDescription, logType);

    const jwtpayload = {
      id: createStudent?.id,
      email: createStudent?.email,
      phone: createStudent?.phone,
      name: createStudent?.name,
      role: createStudent?.role,
      status: createStudent?.status,
      uid: createStudent?.uid, //the updated uid
      oAuthLoginVerify: createStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: createStudent?.id,
      email: createStudent?.email,
      phone: createStudent?.phone,
      name: createStudent?.name,
      role: createStudent?.role,
      status: createStudent?.status,
      uid: createStudent?.uid, //the updated uid
      oAuthLoginVerify: createStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const storeRefreshToken = await prisma.student.update({
      where: {
        id: createStudent?.id,
      },
      data: {
        refreshToken: refreshToken,
      },
    });

    //new code for auth logs
    await registerStudentSession({
      studentId: createStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    return {
      authToken: authToken,
      refreshToken: refreshToken,
    };
  }
};

const signUp = async (payload, hostName, requestInfo) => {
  const { name, phone, email, password } = payload;

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  const checkForAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  const checkSolver = await prisma.solver.findFirst({
    where: {
      OR: [{ email: email }, { phone: trimmedPhone }],
    },
  });

  if (checkForExistingStudent || checkForAdmin || checkSolver) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "এই ই-মেইল/ফোন ইতোমধ্যে লিপিবদ্ধ, দয়াকরে ভিন্ন ই-মেইল/ফোন দিন",
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_hash_random),
  );

  const createStudent = await prisma.student.create({
    data: {
      name,
      phone: trimmedPhone,
      email,
      password: hashedPassword,
    },
  });

  //log activity
  const logTitle = `নতুন স্টুডেন্ট সাইন-আপ করেছেন।`;
  const logDescription = `${name} সাইন-আপ করেছেন।`;
  const logType = Enums.logType.student;
  await activity.logActivity(logTitle, logDescription, logType);

  const jwtpayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid, //the updated uid
    oAuthLoginVerify: createStudent?.isOAuthUser,
    type: Enums.tokenType.access,
  };

  const jwtRefreshPayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid, //the updated uid
    oAuthLoginVerify: createStudent?.isOAuthUser,
    type: Enums.tokenType.refresh,
  };

  const authToken = helpers.generateAuthToken(jwtpayload);
  const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

  const storeRefreshToken = await prisma.student.update({
    where: {
      id: createStudent?.id,
    },
    data: {
      refreshToken: refreshToken,
    },
  });

  //new code for auth logs
  await registerStudentSession({
    studentId: createStudent.id,

    hostName,

    refreshToken,

    requestInfo,
  });

  return {
    authToken: authToken,
    refreshToken: refreshToken,
  };
};

const logIn = async (payload) => {
  const { emailOrPhone } = payload;

  const checkAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  const checkSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  const checkStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  const checkSolver = await prisma.solver.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  if (!checkAdmin && !checkSuperAdmin && !checkStudent && !checkSolver) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "এই ইমেইল/ফোন দিয়ে কোন ব্যবহারকারী খুঁজে পাওয়া যায়নি!",
    );
  }

  if (checkAdmin) {
    return { role: "admin", message: "নির্ধারিত পাসওয়ার্ড প্রদান করুন" };
  } else if (checkStudent) {
    return { role: "student", message: "নির্ধারিত পাসওয়ার্ড প্রদান করুন" };
  } else if (checkSolver) {
    return { role: "solver", message: "নির্ধারিত পাসওয়ার্ড প্রদান করুন" };
  } else if (checkSuperAdmin) {
    const { isValid, type } = helpers.distinguisePhoneAndEmail(emailOrPhone);

    const checkAttempts = await prisma.otpAttempts.findFirst({
      where: {
        OR: [{ email: emailOrPhone.trim() }, { phone: emailOrPhone.trim() }],
        expiresAt: { gt: new Date() },
      },
    });

    if (checkAttempts && checkAttempts?.count >= 4)
      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        "আপনি সর্বোচ্চবার OTP চেয়েছেন, কিছুসময় পর আবার চেষ্টা করুন",
      );

    if (type === "phone") {
      const { otp, otpExpiry } = await OtpService.sendOtpToPhone(
        emailOrPhone.trim(),
      );

      if (checkAttempts)
        await prisma.otpAttempts.update({
          where: {
            id: checkAttempts.id,
          },
          data: {
            expiresAt: otpExpiry,
            count: {
              increment: 1,
            },
          },
        });

      if (!checkAttempts)
        await prisma.otpAttempts.create({
          data: {
            phone: emailOrPhone,
            email: checkSuperAdmin.email,
            expiresAt: otpExpiry,
          },
        });

      const saveOtpToDb = await prisma.superAdmin.update({
        where: {
          phone: emailOrPhone,
        },
        data: {
          otp: otp + "",
          otpExpiry: otpExpiry,
        },
      });
    } else if (type === "email") {
      const { otp, otpExpiry } = await OtpService.sendOtpToEmail(
        emailOrPhone.trim(),
      );

      if (checkAttempts)
        await prisma.otpAttempts.update({
          where: {
            id: checkAttempts.id,
          },
          data: {
            expiresAt: otpExpiry,
            count: {
              increment: 1,
            },
          },
        });

      if (!checkAttempts)
        await prisma.otpAttempts.create({
          data: {
            email: emailOrPhone,
            phone: checkSuperAdmin.phone,
            expiresAt: otpExpiry,
          },
        });

      const saveOtpToDb = await prisma.superAdmin.update({
        where: {
          email: emailOrPhone,
        },
        data: {
          otp: otp + "",
          otpExpiry: otpExpiry,
        },
      });
    } else
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "ভুল ইমেইল / ফোননম্বর প্রদান করেছেন",
      );

    return {
      role: "superAdmin",
      message: "আপনার দেয়া ই-মেইল / ফোন এ OTP প্রদান করা হয়েছে",
    };
  } else {
    throw new AppErrors(StatusCodes.FORBIDDEN, "তথ্যটি ভুল হয়েছে");
  }
};

const logInV2 = async (payload, hostName) => {
  const { emailOrPhone } = payload;
  const checkStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });

  if (!checkStudent)
    throw new AppErrors(StatusCodes.NOT_FOUND, "ব্যবহারকারী পাওয়া যায়নি");

  const { isValid, type } = helpers.distinguisePhoneAndEmail(emailOrPhone);

  if (checkStudent && checkStudent?.status === "DISABLED")
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You access is being restricted! Please contact administration.",
    );

  const getAuthLog = await prisma.studentAuthLog.findFirst({
    where: {
      hostName: hostName,
      studentId: checkStudent?.id,
    },
  });

  //as sending otp is expensive then check auth ban before sending otp
  //check bunny hopping
  const lastLogedIn = new Date(getAuthLog?.lastLogedIn);
  const now = new Date();
  const diffMs = now.getTime() - lastLogedIn.getTime();
  const twelveHoursMs = 6 * 60 * 60 * 1000;
  const isSameUTCDate = diffMs < twelveHoursMs;
  const nextAllowedTimeBD = new Date(lastLogedIn.getTime() + twelveHoursMs);
  const year = nextAllowedTimeBD.getFullYear();
  const month = (nextAllowedTimeBD.getMonth() + 1).toString().padStart(2, "0");
  const day = nextAllowedTimeBD.getDate().toString().padStart(2, "0");
  const hours = nextAllowedTimeBD.getHours().toString().padStart(2, "0");
  const minutes = nextAllowedTimeBD.getMinutes().toString().padStart(2, "0");

  if (isSameUTCDate) {
    if (getAuthLog?.hoppCount > Number(config?.acceptHopCount)) {
      throw new AppErrors(
        StatusCodes.PRECONDITION_FAILED,
        `WARNING:আপনার অ্যাকাউন্ট বিভিন্ন ডিভাইসে একাধিকবার লগইন হয়েছে। আগামী ৬ ঘণ্টা, ${day}-${month}-${year} ${hours}:${minutes} পর্যন্ত আপনার লগইন নিষিদ্ধ করা হলো,`,
      );
    }
  }

  //send otp
  const checkAttempts = await prisma.otpAttempts.findFirst({
    where: {
      OR: [{ email: emailOrPhone.trim() }, { phone: emailOrPhone.trim() }],
      expiresAt: { gt: new Date() },
      otp: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (checkAttempts && checkAttempts?.count >= 4) {
    throw new AppErrors(
      StatusCodes.TOO_MANY_REQUESTS,
      "আপনি OTP পাওয়ার লিমিট পার করেছেন",
    );
  }

  const resendWaitTime = 2 * 60 * 1000;

  if (checkAttempts) {
    const nextAllowedResendTime =
      new Date(checkAttempts.updatedAt).getTime() + resendWaitTime;

    const now = Date.now();

    if (now < nextAllowedResendTime) {
      const remainingSeconds = Math.ceil((nextAllowedResendTime - now) / 1000);

      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }
  }

  if (type === "phone") {
    const { otp, otpExpiry } = await OtpService.sendOtpToPhone(emailOrPhone);
    if (checkAttempts) {
      await prisma.otpAttempts.update({
        where: {
          id: checkAttempts.id,
        },
        data: {
          expiresAt: otpExpiry,
          otpExpiry: otpExpiry,
          otp: otp + "",
          count: {
            increment: 1,
          },
        },
      });
    }
    if (!checkAttempts) {
      await prisma.otpAttempts.create({
        data: {
          phone: emailOrPhone,
          expiresAt: otpExpiry,
          otp: otp + "",
          otpExpiry: otpExpiry,
        },
      });
    }
  } else if (type === "email") {
    const { otp, otpExpiry } =
      await OtpService.sendOtpToEmailForStudent(emailOrPhone);
    if (checkAttempts) {
      await prisma.otpAttempts.update({
        where: {
          id: checkAttempts.id,
        },
        data: {
          expiresAt: otpExpiry,
          otpExpiry: otpExpiry,
          otp: otp + "",
          count: {
            increment: 1,
          },
        },
      });
    }
    if (!checkAttempts) {
      await prisma.otpAttempts.create({
        data: {
          email: emailOrPhone,
          expiresAt: otpExpiry,
          otp: otp + "",
          otpExpiry: otpExpiry,
        },
      });
    }
  } else {
    throw new AppErrors(StatusCodes.FORBIDDEN, "আপনার দেয়া ই-মেইল/ফোন সঠিক নয়");
  }

  return {
    message: "আপনার দেয়া ই-মেইল/ফোন এ OTP প্রদান করা হয়েছে",
  };
};

const verifyLogin = async (payload, hostName, requestInfo) => {
  const { emailOrPhone, passOrOtp } = payload;
  //check current user role
  const result = await findUserWithRole(emailOrPhone);
  const role = result?.role;
  if (!result) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "তথ্যটি সঠিক নয়");
  }

  //admin login verifyy
  if (role === "admin") {
    if (hostName === "https://admin.aparsclassroom.com")
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You are not authorized to login here",
      );
    const checkAdmin = await prisma.admin.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!checkAdmin) {
      throw new AppErrors(StatusCodes.NOT_FOUND, "তথ্যটি সঠিক নয়");
    }

    if (!(await bcrypt.compare(passOrOtp, checkAdmin.password))) {
      throw new AppErrors(StatusCodes.FORBIDDEN, "তথ্যটি সঠিক নয়");
    }

    if (
      checkAdmin &&
      (checkAdmin.status === "DISABLED" || checkAdmin.isDeleted)
    )
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You access is being restricted!",
      );

    const jwtpayload = {
      id: checkAdmin?.id,
      email: checkAdmin?.email,
      phone: checkAdmin?.phone,
      name: checkAdmin?.name,
      status: checkAdmin?.status,
      role: checkAdmin?.role,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkAdmin?.id,
      email: checkAdmin?.email,
      phone: checkAdmin?.phone,
      name: checkAdmin?.name,
      status: checkAdmin?.status,
      role: checkAdmin?.role,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const setRefreshTokenToDb = await prisma.admin.update({
      where: {
        id: checkAdmin.id,
      },
      data: {
        refreshToken: refreshToken,
        ip: requestInfo?.ip,
        userAgent: requestInfo?.ua,
        browserName: requestInfo?.browser?.name,
        browserVersion: requestInfo?.browser?.version,
        osName: requestInfo.os?.name,
        osVersion: requestInfo?.os?.version,
        deviceType: requestInfo?.device?.type,
        deviceModel: requestInfo?.device?.model,
        deviceVendor: requestInfo?.device?.vendor,
        cpuArchitecture: requestInfo?.cpu?.architecture,
        engineName: requestInfo?.engine?.name,
        engineVersion: requestInfo?.engine?.version,
      },
    });

    if (!checkAdmin?.isPasswordChange) {
      return {
        newLogin: true,
        authToken: authToken,
        refreshToken: refreshToken,
      };
    }

    return {
      authToken: authToken,
      refreshToken: refreshToken,
      role: "admin",
    };
  } else if (role === "student") {
    if (hostName === "https://admin.aparsclassroom.com")
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You are not authorized to login here",
      );
    const checkStudent = await prisma.student.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!checkStudent) {
      throw new AppErrors(StatusCodes.NOT_FOUND, "তথ্যটি সঠিক নয়");
    }

    if (!(await bcrypt.compare(passOrOtp, checkStudent?.password))) {
      throw new AppErrors(StatusCodes.FORBIDDEN, "তথ্যটি সঠিক নয়");
    }

    if (checkStudent && checkStudent?.status === "DISABLED")
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You access is being restricted! Please contact administration.",
      );

    const jwtpayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid,
      oAuthVerified: checkStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid,
      oAuthVerified: checkStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: checkStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });

    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
      oAuthVerified: checkStudent?.isOAuthUser,
      role: "student",
    };
  } else if (role === "solver") {
    if (hostName === "https://admin.aparsclassroom.com")
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You are not authorized to login here",
      );

    const checkSolver = await prisma.solver.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });

    if (!checkSolver) {
      throw new AppErrors(StatusCodes.NOT_FOUND, "তথ্যটি সঠিক নয়");
    }

    if (!(await bcrypt.compare(passOrOtp, checkSolver?.password))) {
      throw new AppErrors(StatusCodes.FORBIDDEN, "তথ্যটি সঠিক নয়");
    }

    if (
      checkSolver &&
      (checkSolver?.status === "DISABLED" || checkSolver?.isDeleted)
    )
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "You access is being restricted!",
      );

    const jwtpayload = {
      id: checkSolver?.id,
      email: checkSolver?.email,
      phone: checkSolver?.phone,
      name: checkSolver?.name,
      status: checkSolver?.status,
      role: checkSolver?.role,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkSolver?.id,
      email: checkSolver?.email,
      phone: checkSolver?.phone,
      name: checkSolver?.name,
      status: checkSolver?.status,
      role: checkSolver?.role,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    await prisma.solver.update({
      where: {
        id: checkSolver?.id,
      },
      data: {
        refreshToken: refreshToken,
        ip: requestInfo?.ip,
        userAgent: requestInfo?.ua,
        browserName: requestInfo?.browser?.name,
        browserVersion: requestInfo?.browser?.version,
        osName: requestInfo.os?.name,
        osVersion: requestInfo?.os?.version,
        deviceType: requestInfo?.device?.type,
        deviceModel: requestInfo?.device?.model,
        deviceVendor: requestInfo?.device?.vendor,
        cpuArchitecture: requestInfo?.cpu?.architecture,
        engineName: requestInfo?.engine?.name,
        engineVersion: requestInfo?.engine?.version,
      },
    });

    if (!checkSolver?.isPasswordChange) {
      return {
        newLogin: true,
        authToken: authToken,
        refreshToken: refreshToken,
      };
    }

    return {
      authToken: authToken,
      refreshToken: refreshToken,
    };
  }

  //verify super admin login
  else {
    const checkSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      },
    });
    if (!checkSuperAdmin || checkSuperAdmin.otp + "" !== passOrOtp + "") {
      throw new AppErrors(StatusCodes.CONFLICT, "তথ্যটি সঠিক নয়");
    }
    if (checkSuperAdmin.otpExpiry && new Date() > checkSuperAdmin.otpExpiry) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "দুঃখিত OTP এর মেয়াদ শেষ হয়েছে",
      );
    }
    const makeOtpNull = await prisma.superAdmin.update({
      where: {
        id: checkSuperAdmin.id,
      },
      data: {
        otp: null,
        otpExpiry: null,
      },
    });
    const jwtpayload = {
      id: checkSuperAdmin?.id,
      email: checkSuperAdmin?.email,
      phone: checkSuperAdmin?.phone,
      name: checkSuperAdmin?.name,
      status: checkSuperAdmin?.status,
      role: checkSuperAdmin?.role,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkSuperAdmin?.id,
      email: checkSuperAdmin?.email,
      phone: checkSuperAdmin?.phone,
      name: checkSuperAdmin?.name,
      status: checkSuperAdmin?.status,
      role: checkSuperAdmin?.role,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    await prisma.superAdmin.update({
      where: {
        id: checkSuperAdmin.id,
      },
      data: {
        refreshToken: refreshToken,
        ip: requestInfo?.ip,
        userAgent: requestInfo?.ua,
        browserName: requestInfo?.browser?.name,
        browserVersion: requestInfo?.browser?.version,
        osName: requestInfo.os?.name,
        osVersion: requestInfo.os?.version,
        deviceType: requestInfo?.device?.type,
        deviceModel: requestInfo?.device?.model,
        deviceVendor: requestInfo?.device?.vendor,
        cpuArchitecture: requestInfo?.cpu?.architecture,
        engineName: requestInfo?.engine?.name,
        engineVersion: requestInfo?.engine?.version,
      },
    });

    return {
      authToken: authToken,
      refreshToken: refreshToken,
    };
  }
};

const refreshTheToken = async (payload, hostName) => {
  const { refreshToken } = payload;

  const decoded = verifyRefreshTokenWithSignature(refreshToken);

  if (
    !decoded?.id ||
    !decoded?.role ||
    decoded?.type !== Enums.tokenType.refresh
  ) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
  }

  const userId = decoded.id;

  const role = decoded.role;

  let user = null;

  if (role === Enums.roles.STUDENT) {
    const session = await prisma.studentAuthLog.findFirst({
      where: {
        studentId: userId,

        hostName,

        refreshToken,
      },

      select: {
        id: true,
        studentId: true,
      },
    });

    if (!session) {
      throw new AppErrors(
        StatusCodes.UNAUTHORIZED,
        "Session expired. Please login again.",
      );
    }

    user = await getCachedAuthUser({
      role,
      userId,
    });
  } else if (role === Enums.roles.ADMIN) {
    user = await prisma.admin.findFirst({
      where: {
        id: userId,
        refreshToken,
      },
    });
  } else if (role === Enums.roles.SOLVER) {
    user = await prisma.solver.findFirst({
      where: {
        id: userId,
        refreshToken,
      },
    });
  } else if (role === Enums.roles.SUPERADMIN) {
    user = await prisma.superAdmin.findFirst({
      where: {
        id: userId,
        refreshToken,
      },
    });
  } else {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid user role");
  }
  if (!user) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Session expired. Please login again.",
    );
  }

  if (
    (role === Enums.roles.ADMIN || role === Enums.roles.STUDENT) &&
    (user?.isDeleted || user?.status !== "ACTIVE")
  ) {
    throw new AppErrors(StatusCodes.FORBIDDEN, "Your account is disabled.");
  }

  const jwtPayload = {
    id: user.id,

    email: user.email,

    phone: user.phone,

    name: user.name,

    status: user.status,

    role: user.role,

    ...(role === Enums.roles.STUDENT &&
      user?.uid && {
        uid: user.uid,
      }),

    type: Enums.tokenType.access,
  };

  const newAccessToken = helpers.generateAuthToken(jwtPayload);

  return newAccessToken;
};

const logOut = async ({ refreshToken, hostName }) => {
  if (!refreshToken) {
    return true;
  }

  const decoded = verifyRefreshTokenWithSignature(refreshToken);

  if (
    !decoded?.id ||
    !decoded?.role ||
    decoded?.type !== Enums.tokenType.refresh
  ) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
  }

  const userId = decoded.id;

  const role = decoded.role;
  if (role === Enums.roles.STUDENT) {
    await revokeStudentSession({
      studentId: userId,
      hostName,
      refreshToken,
    });

    return true;
  }

  if (role === Enums.roles.ADMIN) {
    await prisma.admin.updateMany({
      where: {
        id: userId,

        refreshToken,
      },

      data: {
        refreshToken: null,
      },
    });

    return true;
  }
  if (role === Enums.roles.SOLVER) {
    await prisma.solver.updateMany({
      where: {
        id: userId,

        refreshToken,
      },

      data: {
        refreshToken: null,
      },
    });

    return true;
  }
  if (role === Enums.roles.SUPERADMIN) {
    await prisma.superAdmin.updateMany({
      where: {
        id: userId,

        refreshToken,
      },

      data: {
        refreshToken: null,
      },
    });

    return true;
  }

  return true;
};

const changePassword = async (payload, refreshToken) => {
  const { newPassword, adminId, solverId } = payload;

  if (!refreshToken || refreshToken === undefined)
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "please login!");

  const checkUser = await prisma.admin.findFirst({
    where: {
      id: adminId,
    },
  });

  const checkSolver = await prisma.solver.findFirst({
    where: {
      id: solverId,
    },
  });

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_hash_random),
  );

  if (checkUser) {
    const response = await prisma.admin.update({
      where: {
        id: adminId,
      },
      data: {
        password: hashedPassword,
        isPasswordChange: true,
        passwordChangedAt: new Date(),
        refreshToken: null,
      },
    });

    await invalidateAuthUserCache(Enums.roles.ADMIN, adminId);
    return true;
  }

  if (checkSolver) {
    const response = await prisma.solver.update({
      where: {
        id: solverId,
      },
      data: {
        password: hashedPassword,
        isPasswordChange: true,
        refreshToken: null,
      },
    });
    await invalidateAuthUserCache(Enums.roles.SOLVER, solverId);
    return true;
  }
};

const forgetPassword = async (payload, hostName) => {
  const { email } = payload;

  const checkAdmin = await prisma.admin.findFirst({
    where: {
      email,
    },
  });

  const checkSolver = await prisma.solver.findFirst({
    where: {
      email,
    },
  });

  const checkStudent = await prisma.student.findFirst({
    where: {
      email,
    },
  });

  if (!checkAdmin && !checkStudent && !checkSolver) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "No user found!");
  }

  if (checkStudent && checkStudent?.lastResetPassword) {
    const lastReset = new Date(checkStudent?.lastResetPassword);
    const now = new Date();
    const diffMinutes = (now - lastReset) / (1000 * 60);
    if (diffMinutes < 15) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "Password reset already requested recently. Please wait 15 minutes before trying again.",
      );
    }
  }

  //create token send to the client
  const jwtPayload = {
    email: checkAdmin?.email || checkStudent?.email || checkSolver?.email,
    role: checkAdmin?.role || checkStudent?.role || checkSolver?.role,
    phone: checkAdmin?.phone || checkStudent?.phone || checkSolver?.phone,
    type: Enums.tokenType.reset,
  };

  const resetToken = helpers.generateTempToken(jwtPayload);

  //Send Url to Frontend Data
  const resetUILink = `${hostName === config.frb_host_name || hostName === config.frb_local_host_name ? config.frb_frontend_url_prod : hostName === config.varsity_host_name ? config.varsity_frontend_url_prod : hostName === config.medical_host_name ? config.medical_frontend_url_prod : hostName === config.academic_host_name ? config.academic_frontend_url_prod : config.frontend_url_prod}/reset-password?user=${resetToken}?email=${email}`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Reset Your Password (Link expires within 20 minutes)</h2>
    <p>We received a request to reset your password. Click the button below to proceed:</p>
    <a href="${resetUILink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
      Click to Reset Password
    </a>
    <br/>
    <p>Or, you can copy this link : ${resetUILink} and paste to your browser.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Thanks,<br>The ASG SHOP Team</p>
  </div>
`;
  const emailSubject = `${checkAdmin?.name || checkStudent?.name || checkSolver?.name}, Requested password reset for Apar's Classroom webapp`;
  const response = await sendEmailWithProbaho(
    checkAdmin?.name || checkStudent?.name || checkSolver?.name,
    checkAdmin?.email || checkStudent?.email || checkSolver?.email,
    emailSubject,
    html,
  );
  if (response?.data?.status === "success") {
    if (checkStudent) {
      const updateUser = await prisma.student.update({
        where: { email: checkStudent?.email },
        data: {
          lastResetPassword: new Date(),
        },
      });
    }
    return "Password reset link is sent, please check you E-mail";
  } else {
    return "Sorry! Please Contact Authority";
  }
};

const resetPassword = async (payload) => {
  const { email, newPassword, resetToken } = payload;

  if (!resetToken) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid Request");
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, config.jwt_temp_secret_key, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "Password reset link expired (reset window 10 minutes), please try to reset again.",
    );
  }

  if (!decoded) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Session Expired!");
  }

  if (decoded?.type !== Enums.tokenType.reset)
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid Token Type");

  const tokenEmail = String(decoded?.email || "")
    .trim()
    .toLowerCase();

  const requestedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!tokenEmail || tokenEmail !== requestedEmail) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Invalid password reset request",
    );
  }

  const isExistUser = await prisma.admin.findUnique({
    where: {
      email,
    },
  });

  const checkSolver = await prisma.solver.findUnique({
    where: {
      email,
    },
  });

  const checkStudent = await prisma.student.findUnique({
    where: {
      email,
    },
  });

  //Checking if the user is not Exist
  if (!isExistUser && !checkStudent && !checkSolver) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "User not exist");
  }

  //Checking if the user is Blocked
  if (
    (isExistUser?.role === Enums.roles.ADMIN &&
      isExistUser?.status !== "ACTIVE") ||
    (checkStudent && checkStudent?.status !== "ACTIVE") ||
    (checkSolver && checkSolver?.status !== "ACTIVE")
  ) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Please Contact Administrator as soon as Possible.",
    );
  }

  //Hash New Password
  const hashNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_hash_random),
  );

  //update password
  if (isExistUser) {
    const data = {
      password: hashNewPassword,
      passwordChangedAt: new Date(),
    };
    const updatedPasswordUser = await prisma.admin.update({
      where: { email },
      data,
    });

    await invalidateAuthUserCache(Enums.roles.ADMIN, isExistUser.id);
  }

  if (checkStudent) {
    const data = {
      password: hashNewPassword,
      lastResetPassword: new Date(),
    };
    const updatedPasswordUser = await prisma.student.update({
      where: { email },
      data,
    });

    await invalidateAuthUserCache(Enums.roles.STUDENT, checkStudent.id);
  }
  if (checkSolver) {
    const data = {
      password: hashNewPassword,
    };
    const updatedPasswordUser = await prisma.solver.update({
      where: { email },
      data,
    });

    await invalidateAuthUserCache(Enums.roles.SOLVER, checkSolver.id);
  }
  const result = {
    name: isExistUser?.name || checkStudent?.name || checkSolver?.name,
    email: isExistUser?.email || checkStudent?.email || checkSolver?.email,
  };
  return result;
};

const getProfile = async (payload) => {
  const { superAdminId, adminId, studentId, solverId } = payload;
  const getSuperAdmin = superAdminId
    ? await prisma.superAdmin.findFirst({
        where: {
          id: superAdminId,
        },
        select: selectFieldsForSuperAdmin,
      })
    : null;

  const getAdmin = adminId
    ? await prisma.admin.findFirst({
        where: {
          id: adminId,
        },
        select: selectFieldsForAdmin,
      })
    : null;

  const getSolver = solverId
    ? await prisma.solver.findFirst({
        where: {
          id: solverId,
        },
        select: selectFieldsForAdmin,
      })
    : null;

  const getStudent = studentId
    ? await prisma.student.findFirst({
        where: {
          id: studentId,
        },
        select: selectFieldsForStudent,
      })
    : null;

  if (!getSuperAdmin && !getAdmin && !getStudent && !getSolver)
    throw new AppErrors(StatusCodes.NOT_FOUND, "user not found");

  //here we list all means of account linked
  const authInfo = {};

  const getOAuthInfo = await prisma.studentOAuthProvider.findMany({
    where: {
      studentId: getStudent?.id,
    },
    take: 2,
    orderBy: { createdAt: "desc" },
  });

  for (const e of getOAuthInfo) {
    if (e?.provider === "GOOGLE") {
      authInfo.isGoogleLinked = true;
      authInfo.googleEmail = e?.email;
    } else {
      authInfo.isGoogleLinked = false;
      authInfo.googleEmail = null;
    }
    if (e?.provider === "APPLE") {
      authInfo.isAppleLinked = true;
      authInfo.appleEmail = e?.email;
    } else {
      authInfo.isAppleLinked = false;
      authInfo.appleEmail = null;
    }
  }

  getStudent.oAuthInfo = authInfo;

  return getAdmin || getStudent || getSuperAdmin || getSolver;
};

const updateProfile = async (payload, profileImage) => {
  const { superAdminId, adminId, studentId, solverId } = payload;

  if (superAdminId) {
    await prisma.superAdmin.update({
      where: {
        id: superAdminId,
      },

      data: {
        photo: profileImage,
      },
    });

    await invalidateAuthUserCache(Enums.roles.SUPERADMIN, superAdminId);

    return true;
  }

  if (adminId) {
    await prisma.admin.update({
      where: {
        id: adminId,
      },

      data: {
        photo: profileImage,
      },
    });

    await invalidateAuthUserCache(Enums.roles.ADMIN, adminId);

    return true;
  }

  if (solverId) {
    await prisma.solver.update({
      where: {
        id: solverId,
      },

      data: {
        photo: profileImage,
      },
    });

    await invalidateAuthUserCache(Enums.roles.SOLVER, solverId);

    return true;
  }

  if (studentId) {
    await prisma.student.update({
      where: {
        id: studentId,
      },

      data: {
        profilePhoto: profileImage,
      },
    });

    await invalidateAuthUserCache(Enums.roles.STUDENT, studentId);

    return true;
  }

  throw new AppErrors(StatusCodes.BAD_REQUEST, "User id is required");
};

const verifyCredential = async (payload, hostName, requestInfo) => {
  const { email, phone, idToken, provider } = payload;

  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  //check admin account
  const checkForAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  //check super admin account
  const checkSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForAdmin || checkSuperAdmin) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "এই মেথড শুধুমাত্র শিক্ষার্থীদের জন্য প্রযোজ্য",
    );
  }

  //direct login
  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    //direct login
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    if (getStudent && getStudent?.status === "DISABLED") {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Your access is being restricted! Please contract administration",
      );
    }

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    //retun the auth tokens
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
    };
  }

  //check account student
  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForExistingStudent) {
    return { isExisting: true };
  } else {
    return {
      isExisting: false,
    };
  }

  //send otp to phone
  const checkAttempts = await prisma.otpAttempts.findFirst({
    where: {
      phone: phone,
      expiresAt: { gt: new Date() },
    },
  });

  if (checkAttempts && checkAttempts?.count >= 4) {
    throw new AppErrors(StatusCodes.TOO_MANY_REQUESTS, "Too many OTP attempts");
  }

  const resendWaitTime = 2 * 60 * 1000;

  if (checkAttempts) {
    const nextAllowedResendTime =
      new Date(checkAttempts.updatedAt).getTime() + resendWaitTime;

    const now = Date.now();

    if (now < nextAllowedResendTime) {
      const remainingSeconds = Math.ceil((nextAllowedResendTime - now) / 1000);

      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }
  }

  const { otp, otpExpiry } = await OtpService.sendOtpToPhone(phone);

  if (checkAttempts) {
    await prisma.otpAttempts.update({
      where: {
        id: checkAttempts.id,
      },
      data: {
        expiresAt: otpExpiry,
        count: {
          increment: 1,
        },
      },
    });
  }

  if (!checkAttempts) {
    await prisma.otpAttempts.create({
      data: {
        phone: phone,
        expiresAt: otpExpiry,
        otp: otp + "",
        otpExpiry: otpExpiry,
      },
    });
  }

  return {
    message: "OTP send to phone & will expire in 5 minutes",
  };
};

const verifyOtp = async (payload, platform) => {
  const { phone, otp, idToken } = payload;
  const normalizedOtp = String(otp).trim();

  //verify the g-idToken
  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  const getOtp = await prisma.otpAttempts.findFirst({
    where: {
      phone: phone,
      otp: normalizedOtp,
      expiresAt: { gt: new Date() },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!getOtp) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "OTP ভুল হয়েছে অথবা মেয়াদ শেষ হয়েগেছে",
    );
  }

  if (getOtp?.otpExpiry && new Date() > getOtp?.otpExpiry) {
    throw new AppErrors(StatusCodes.GONE, "OTP এর মেয়াদ শেষ হয়ে গেছে");
  }

  const makeOtpNull = await prisma.otpAttempts.update({
    where: {
      id: getOtp?.id,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  return true;
};

const verifyOtpAndSignup = async (payload, hostName, platform, requestInfo) => {
  const {
    otp,
    uid,
    name = "guest",
    phone,
    email,
    provider,
    profilePhoto,
    googleId,
    appleId,
    idToken,
  } = payload;
  const normalizedOtp = String(otp).trim();

  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  const checkForAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  const checkSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForAdmin || checkSuperAdmin) {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "এই মেথডটি শুধুমাত্র শিক্ষার্থীদের জন্য",
    );
  }

  if (checkForExistingStudent) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "এই ই-মেইল / ফোন ইতোমধ্যে নিবন্ধিত",
    );
  }

  const getOtp = await prisma.otpAttempts.findFirst({
    where: {
      phone: phone,
      otp: normalizedOtp,
      expiresAt: { gt: new Date() },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!getOtp) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "OTP ভুল হয়েছে অথবা মেয়াদ শেষ হয়েছে",
    );
  }

  if (getOtp?.otpExpiry && new Date() > getOtp?.otpExpiry) {
    throw new AppErrors(StatusCodes.GONE, "OTP এর মেয়াদ শেষ");
  }

  const makeOtpNull = await prisma.otpAttempts.update({
    where: {
      id: getOtp?.id,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  //also check if existing oAuth sign in then direct login
  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    //direct login
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    if (getStudent && getStudent?.status === "DISABLED") {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Your access is being restricted! Please contract administration",
      );
    }

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    //retun the auth tokens
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
    };
  }

  const createStudent = await prisma.student.create({
    data: {
      name: name || "guest",
      phone: phone,
      email: gTicket?.email,
      uid: uid,
      password: "default password dummy",
      profilePhoto: profilePhoto,
      googleId: googleId,
      appleId: appleId,
      leads: platform ? "app" : "web",
      isOAuthUser: true,
      phoneVerified: true,
      emailVerified: true,
    },
  });

  const entryInOAuthProvider = await prisma.studentOAuthProvider.create({
    data: {
      studentId: createStudent?.id,
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
      secondaryUid: uid,
    },
  });

  //log activity
  const logTitle = `নতুন স্টুডেন্ট ${platform} থেকে সাইন-আপ করেছেন।`;
  const logDescription = `${name} সাইন-আপ করেছেন।`;
  const logType = Enums.logType.student;
  await activity.logActivity(logTitle, logDescription, logType);

  const jwtpayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid, //the updated uid
    oAuthLoginVerify: createStudent?.isOAuthUser,
    type: Enums.tokenType.access,
  };

  const jwtRefreshPayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid, //the updated uid
    oAuthLoginVerify: createStudent?.isOAuthUser,
    type: Enums.tokenType.refresh,
  };

  const authToken = helpers.generateAuthToken(jwtpayload);
  const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

  const storeRefreshToken = await prisma.student.update({
    where: {
      id: createStudent?.id,
    },
    data: {
      refreshToken: refreshToken,
    },
  });

  //new code for auth logs
  await registerStudentSession({
    studentId: createStudent.id,
    hostName,
    refreshToken,
    requestInfo,
  });

  return {
    authToken: authToken,
    refreshToken: refreshToken,
  };
};

const signUpV3 = async (payload, hostName, platform, requestInfo) => {
  const {
    uid,
    name,
    phone,
    email,
    provider,
    profilePhoto,
    googleId,
    appleId,
    idToken,
  } = payload;

  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  const checkForAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  const checkSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForAdmin || checkSuperAdmin) {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "এই মেথডটি শুধুমাত্র শিক্ষার্থীদের জন্য",
    );
  }

  if (checkForExistingStudent) {
    throw new AppErrors(
      StatusCodes.CONFLICT,
      "এই ই-মেইল / ফোন ইতোমধ্যে নিবন্ধিত",
    );
  }

  //also check if existing oAuth sign in then direct login
  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    //direct login
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    if (getStudent && getStudent?.status === "DISABLED") {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Your access is being restricted! Please contract administration",
      );
    }

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    //retun the auth tokens
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
    };
  }

  const createStudent = await prisma.student.create({
    data: {
      name: name,
      phone: phone,
      email: gTicket?.email,
      uid: uid,
      password: "default password dummy",
      profilePhoto: profilePhoto,
      googleId: googleId,
      appleId: appleId,
      leads: platform ? "app" : "web",
      isOAuthUser: true,
      phoneVerified: true,
      emailVerified: true,
    },
  });

  const entryInOAuthProvider = await prisma.studentOAuthProvider.create({
    data: {
      studentId: createStudent?.id,
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
      secondaryUid: uid,
    },
  });

  //log activity
  const logTitle = `নতুন স্টুডেন্ট ${platform} থেকে সাইন-আপ করেছেন।`;
  const logDescription = `${name} সাইন-আপ করেছেন।`;
  const logType = Enums.logType.student;
  await activity.logActivity(logTitle, logDescription, logType);

  const jwtpayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid,
    oAuthVerified: createStudent?.isOAuthUser,
    type: Enums.tokenType.access,
  };

  const jwtRefreshPayload = {
    id: createStudent?.id,
    email: createStudent?.email,
    phone: createStudent?.phone,
    name: createStudent?.name,
    role: createStudent?.role,
    status: createStudent?.status,
    uid: createStudent?.uid,
    oAuthVerified: createStudent?.isOAuthUser,
    type: Enums.tokenType.refresh,
  };

  const authToken = helpers.generateAuthToken(jwtpayload);
  const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

  const storeRefreshToken = await prisma.student.update({
    where: {
      id: createStudent?.id,
    },
    data: {
      refreshToken: refreshToken,
    },
  });

  //new code for auth logs
  await registerStudentSession({
    studentId: createStudent.id,
    hostName,
    refreshToken,
    requestInfo,
  });

  return {
    authToken: authToken,
    refreshToken: refreshToken,
  };
};

const oAuthLoginVerify = async (payload, platform, hostName, requestInfo) => {
  const { idToken, provider } = payload;
  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }
  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    //direct login
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    if (getStudent && getStudent?.status === "DISABLED") {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Your access is being restricted! Please contract administration",
      );
    }

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    //retun the auth tokens
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
    };
  } else {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Your account is not synced with OAuth, Please sync now, Or Login with Email/Phone instead",
    );
  }
};

const verifyLoginV2 = async (
  payload,
  emailOrPhoneFromCookie,
  hostname,
  requestInfo,
) => {
  const { emailOrPhone, otp } = payload;
  let message = "";
  const EmailOrPhone = emailOrPhone ? emailOrPhone : emailOrPhoneFromCookie;
  if (!EmailOrPhone)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "emailOrPhone is required");

  const getStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: EmailOrPhone }, { phone: EmailOrPhone }],
    },
  });

  if (!getStudent) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Student not found");
  }

  if (getStudent && getStudent?.status === "DISABLED")
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You access is being restricted! Please contact administration.",
    );

  const normalizedOtp = String(otp).trim();

  const checkAttempts = await prisma.otpAttempts.findFirst({
    where: {
      OR: [{ email: EmailOrPhone.trim() }, { phone: EmailOrPhone.trim() }],
      otp: normalizedOtp,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!checkAttempts) {
    throw new AppErrors(StatusCodes.CONFLICT, "তথ্যটি সঠিক নয়");
  }

  if (checkAttempts?.otpExpiry && new Date() > checkAttempts?.otpExpiry) {
    throw new AppErrors(StatusCodes.GONE, "দুঃখিত OTP এর মেয়াদ শেষ হয়ে গেছে");
  }

  const makeOtpNull = await prisma.otpAttempts.update({
    where: {
      id: checkAttempts?.id,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  const jwtpayload = {
    id: getStudent?.id,
    email: getStudent?.email,
    phone: getStudent?.phone,
    name: getStudent?.name,
    status: getStudent?.status,
    role: getStudent?.role,
    uid: getStudent?.uid,
    oAuthVerified: getStudent?.isOAuthUser,
    type: Enums.tokenType.access,
  };

  const jwtRefreshPayload = {
    id: getStudent?.id,
    email: getStudent?.email,
    phone: getStudent?.phone,
    name: getStudent?.name,
    status: getStudent?.status,
    role: getStudent?.role,
    uid: getStudent?.uid,
    oAuthVerified: getStudent?.isOAuthUser,
    type: Enums.tokenType.refresh,
  };

  const authToken = helpers.generateAuthToken(jwtpayload);
  const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

  const getAuthLog = await prisma.studentAuthLog.findFirst({
    where: {
      hostName: hostname,
      studentId: getStudent?.id,
    },
  });

  if (!getAuthLog) {
    const createAuthLog = await prisma.studentAuthLog.create({
      data: {
        studentId: getStudent?.id,
        hostName: hostname,
        refreshToken: refreshToken,
        lastLogedIn: new Date(),
      },
    });
  } else {
    //check bunny hopping
    const lastLogedIn = new Date(getAuthLog?.lastLogedIn);
    const now = new Date();
    const diffMs = now.getTime() - lastLogedIn.getTime();
    const twelveHoursMs = 6 * 60 * 60 * 1000;
    const isSameUTCDate = diffMs < twelveHoursMs;
    const nextAllowedTimeBD = new Date(lastLogedIn.getTime() + twelveHoursMs);
    const year = nextAllowedTimeBD.getFullYear();
    const month = (nextAllowedTimeBD.getMonth() + 1)
      .toString()
      .padStart(2, "0");
    const day = nextAllowedTimeBD.getDate().toString().padStart(2, "0");
    const hours = nextAllowedTimeBD.getHours().toString().padStart(2, "0");
    const minutes = nextAllowedTimeBD.getMinutes().toString().padStart(2, "0");

    if (isSameUTCDate) {
      if (getAuthLog?.hoppCount > Number(config?.acceptHopCount)) {
        const setRefreshTokenNull = await prisma.studentAuthLog.update({
          where: {
            id: getAuthLog?.id,
          },
          data: {
            refreshToken: null,
          },
        });
        throw new AppErrors(
          StatusCodes.PRECONDITION_FAILED,
          `WARNING:আপনার অ্যাকাউন্ট বিভিন্ন ডিভাইসে একাধিকবার লগইন হয়েছে। আগামী ৬ ঘণ্টা, ${day}-${month}-${year} ${hours}:${minutes} পর্যন্ত আপনার লগইন নিষিদ্ধ করা হলো,`,
        );
      } else {
        message =
          "Sign In Successful, NB:আপনার অ্যাকাউন্ট বিভিন্ন ডিভাইসে একাধিকবার লগইন হয়েছে, নিরাপত্তার স্বার্থে ভবিষ্যৎ এ আপনার সাময়িক এক্সেস বন্ধ হতে পারে।";
      }
    }

    //refresh the token and update log
    await prisma.studentAuthLog.update({
      where: {
        id: getAuthLog?.id,
      },
      data: {
        refreshToken: refreshToken,
        lastLogedIn: new Date(),
        hoppCount: isSameUTCDate
          ? {
              increment: 1,
            }
          : 1,
        ip: requestInfo?.ip,
        userAgent: requestInfo?.ua,
        browserName: requestInfo?.browser?.name,
        browserVersion: requestInfo?.browser?.version,
        osName: requestInfo.os?.name,
        osVersion: requestInfo?.os?.version,
        deviceType: requestInfo?.device?.type,
        deviceModel: requestInfo?.device?.model,
        deviceVendor: requestInfo?.device?.vendor,
        cpuArchitecture: requestInfo?.cpu?.architecture,
        engineName: requestInfo?.engine?.name,
        engineVersion: requestInfo?.engine?.version,
      },
    });
  }
  return {
    authToken: authToken,
    refreshToken: refreshToken,
    message: message,
    oAuthVerified: getStudent?.isOAuthUser,
  };
};

const syncStudentOauth = async (payload, hostName, requestInfo) => {
  const { uid, idToken, provider, accessToken } = payload;

  let message = null;
  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  let decoded = null;
  decoded = verifyUserTokenWithSignature(accessToken);

  if (!decoded?.id || decoded?.type !== Enums.tokenType.access) {
    throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid Token Type");
  }

  const getStudent = await prisma.student.findFirst({
    where: {
      id: decoded?.id,
    },
  });

  if (!getStudent)
    throw new AppErrors(StatusCodes.NOT_FOUND, "ব্যবহারকারীর তথ্য পাওয়া যায়নি");

  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      studentId: getStudent?.id,
      provider: provider,
    },
  });

  //if new sync
  if (!checkOAuth) {
    const entryOauth = await prisma.studentOAuthProvider.create({
      data: {
        studentId: getStudent?.id,
        secondaryUid: uid,
        provider: provider ? provider : "GOOGLE",
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    if (!getStudent?.uid) {
      const updateStudent = await prisma.student.update({
        where: {
          id: getStudent?.id,
        },
        data: {
          uid: uid,
          googleId: gTicket?.sub,
          isOAuthUser: true,
          emailVerified: true,
        },
      });
    } else {
      const updateStudent = await prisma.student.update({
        where: {
          id: getStudent?.id,
        },
        data: {
          googleId: gTicket?.sub,
          isOAuthUser: true,
          emailVerified: true,
        },
      });
    }

    const checkStudent = await prisma.student.findFirst({
      where: {
        id: getStudent?.id,
      },
    });

    //updated uid and field
    const jwtpayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid, //the updated uid
      oAuthLoginVerify: checkStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid, //the updated uid
      oAuthLoginVerify: checkStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });

    return {
      authToken: authToken,
      refreshToken: refreshToken,
      oAuthVerified: checkStudent?.isOAuthUser,
    };
  } else {
    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      oAuthVerified: getStudent?.isOAuthUser,
    };
  }
};

const checkSocialLogin = async (payload) => {
  const { idToken, provider } = payload;
  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  let checkStudent = null;
  let checkOAuth = null;

  checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    checkStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });
  } else {
    checkStudent = await prisma.student.findFirst({
      where: {
        email: gTicket?.email,
      },
    });
    if (checkStudent) {
      checkOAuth = await prisma.studentOAuthProvider.findFirst({
        where: {
          studentId: checkStudent?.id,
          provider: provider,
        },
      });
    }
  }

  return {
    accountExist: checkStudent ? true : false,
    socialLoginEnabled: checkOAuth ? true : false,
  };
};

const existingAccountSocialLogin = async (payload, hostName, requestInfo) => {
  const { uid, idToken, provider } = payload;
  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  let checkStudent = null;
  let checkOAuth = null;

  checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    checkStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });
  } else {
    checkStudent = await prisma.student.findFirst({
      where: {
        email: gTicket?.email,
      },
    });
    if (checkStudent) {
      checkOAuth = await prisma.studentOAuthProvider.findFirst({
        where: {
          studentId: checkStudent?.id,
          provider: provider,
        },
      });
    }
  }

  if (checkStudent && checkOAuth) {
    const jwtpayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid,
      oAuthLoginVerify: checkStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: checkStudent?.id,
      email: checkStudent?.email,
      phone: checkStudent?.phone,
      name: checkStudent?.name,
      status: checkStudent?.status,
      role: checkStudent?.role,
      uid: checkStudent?.uid, //the updated uid
      oAuthLoginVerify: checkStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: checkStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      oAuthVerified: checkStudent?.isOAuthUser,
    };
  } else if (checkStudent && !checkOAuth) {
    //sync new o auth
    const entryOauth = await prisma.studentOAuthProvider.create({
      data: {
        studentId: checkStudent?.id,
        secondaryUid: uid,
        provider: provider ? provider : "GOOGLE",
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    if (!checkStudent?.uid) {
      const updateStudent = await prisma.student.update({
        where: {
          id: checkStudent?.id,
        },
        data: {
          uid: uid,
          googleId: gTicket?.sub,
          isOAuthUser: true,
          emailVerified: true,
        },
      });
    } else {
      const updateStudent = await prisma.student.update({
        where: {
          id: checkStudent?.id,
        },
        data: {
          googleId: gTicket?.sub,
          isOAuthUser: true,
          emailVerified: true,
        },
      });
    }

    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkStudent?.id,
      },
    });

    //updated uid and field
    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      oAuthVerified: getStudent?.isOAuthUser,
    };
  } else if (!checkStudent && checkOAuth) {
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid, //the updated uid
      oAuthLoginVerify: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);

    const { message } = await registerStudentSession({
      studentId: getStudent.id,
      hostName,
      refreshToken,
      requestInfo,
    });
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      oAuthVerified: getStudent?.isOAuthUser,
    };
  } else {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "No student found for this email",
    );
  }
};

const sendSignUpOtp = async (payload, hostName, requestInfo) => {
  const { email, phone, idToken, provider } = payload;

  let gTicket;
  if (provider === "GOOGLE") {
    gTicket = await validateGoogleToken(idToken);
  }
  if (provider === "APPLE") {
    gTicket = await validateAppleToken(idToken);
  }

  const trimmedPhone = helpers.trimBDCountryCode(phone);

  //check admin account
  const checkForAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  const checkSuperAdmin = await prisma.superAdmin.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForAdmin || checkSuperAdmin) {
    throw new AppErrors(
      StatusCodes.NOT_ACCEPTABLE,
      "শুধুমাত্র শিক্ষার্থীদের জন্য প্রযোজ্য",
    );
  }

  //direct login
  const checkOAuth = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      providerUid: gTicket?.sub,
      email: gTicket?.email,
    },
  });

  if (checkOAuth) {
    //direct login
    const getStudent = await prisma.student.findFirst({
      where: {
        id: checkOAuth?.studentId,
      },
    });

    if (getStudent && getStudent?.status === "DISABLED") {
      throw new AppErrors(
        StatusCodes.FORBIDDEN,
        "Your access is being restricted! Please contract administration",
      );
    }

    const jwtpayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.access,
    };

    const jwtRefreshPayload = {
      id: getStudent?.id,
      email: getStudent?.email,
      phone: getStudent?.phone,
      name: getStudent?.name,
      status: getStudent?.status,
      role: getStudent?.role,
      uid: getStudent?.uid,
      oAuthVerified: getStudent?.isOAuthUser,
      type: Enums.tokenType.refresh,
    };

    const authToken = helpers.generateAuthToken(jwtpayload);
    const refreshToken = helpers.generateRefreshToken(jwtRefreshPayload);
    const { message } = await registerStudentSession({
      studentId: getStudent.id,

      hostName,

      refreshToken,

      requestInfo,
    });
    //retun the auth tokens
    return {
      authToken: authToken,
      refreshToken: refreshToken,
      message: message,
    };
  }

  //check account student
  const checkForExistingStudent = await prisma.student.findFirst({
    where: {
      OR: [{ email: gTicket?.email }, { phone: trimmedPhone }],
    },
  });

  if (checkForExistingStudent) {
    return { isExisting: true };
  }

  //send otp to phone
  const checkAttempts = await prisma.otpAttempts.findFirst({
    where: {
      phone: phone,
      expiresAt: { gt: new Date() },
      otp: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (checkAttempts && checkAttempts?.count >= 4) {
    throw new AppErrors(
      StatusCodes.TOO_MANY_REQUESTS,
      "OTP চাওয়ার লিমিট শেষ হয়েগেছ, কিছুক্ষণ পর আবার চেষ্টা করুন",
    );
  }

  const resendWaitTime = 2 * 60 * 1000;

  if (checkAttempts) {
    const nextAllowedResendTime =
      new Date(checkAttempts.updatedAt).getTime() + resendWaitTime;

    const now = Date.now();

    if (now < nextAllowedResendTime) {
      const remainingSeconds = Math.ceil((nextAllowedResendTime - now) / 1000);

      throw new AppErrors(
        StatusCodes.TOO_MANY_REQUESTS,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
    }
  }

  const { otp, otpExpiry } = await OtpService.sendOtpToPhone(phone);

  if (checkAttempts) {
    await prisma.otpAttempts.update({
      where: {
        id: checkAttempts.id,
      },
      data: {
        expiresAt: otpExpiry,
        otpExpiry: otpExpiry,
        otp: otp + "",
        count: {
          increment: 1,
        },
      },
    });
  }

  if (!checkAttempts) {
    await prisma.otpAttempts.create({
      data: {
        phone: phone,
        expiresAt: otpExpiry,
        otp: otp + "",
        otpExpiry: otpExpiry,
      },
    });
  }

  return {
    message: "OTP send to phone & will expire in 5 minutes",
  };
};

const getSocialLinkedAccounts = async (payload) => {
  const { studentId } = payload;

  const getStudentSocials = await prisma.studentOAuthProvider.findMany({
    where: {
      studentId: studentId,
    },
    take: 2,
    orderBy: { createdAt: "desc" },
  });

  let googleLinked = false;
  let appleLinked = false;
  let googleEmail = "";
  let appleEmail = "";

  for (const e of getStudentSocials) {
    if (e?.provider === "GOOGLE" && e?.providerUid) googleLinked = true;
    if (e?.provider === "GOOGLE" && e?.email) googleEmail = e?.email;
    if (e?.provider === "APPLE" && e?.providerUid) appleLinked = true;
    if (e?.provider === "APPLE" && e?.email) appleEmail = e?.email;
  }

  return {
    googleLinked,
    googleEmail,
    appleLinked,
    appleEmail,
  };
};

const getUserForExam = async (uid) => {
  if (!uid) throw new AppErrors(StatusCodes.BAD_REQUEST, "user id is required");
  console.log(uid, "gd");
  let user;
  try {
    initFirebase();
    user = await admin.auth().getUser(uid);
    console.log(user, "user fetched from firebase");
  } catch (error) {
    console.log(error?.message, "error finding user with uid");
  }

  return user;
};

const unlinkSocialAccount = async (payload) => {
  const { provider, studentId } = payload;

  if (provider === "GOOGLE") {
    const getOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        studentId: studentId,
        provider: provider,
      },
    });

    if (!getOAuth)
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "আপনার কোন গুগল একাউন্ট সংযোগ করা পাওয়া যায়নি",
      );

    //now unlink and free the google email form account
    const unLink = await prisma.studentOAuthProvider.delete({
      where: {
        id: getOAuth.id,
      },
    });

    //check other provider if not or if has
    const getAnotherOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        studentId: studentId,
        provider: "APPLE",
      },
    });

    if (!getAnotherOAuth) {
      //update the studet table
      const updateStudent = await prisma.student.update({
        where: {
          id: studentId,
        },
        data: {
          isOAuthUser: false,
          googleId: null,
        },
      });
    }
  } else if (provider === "APPLE") {
    const getOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        studentId: studentId,
        provider: provider,
      },
    });

    if (!getOAuth)
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "আপনার কোন অ্যাপল একাউন্ট সংযোগ করা পাওয়া যায়নি",
      );

    //now unlink and free the google email form account
    const unLink = await prisma.studentOAuthProvider.delete({
      where: {
        id: getOAuth.id,
      },
    });

    //check other provider if not or if has
    const getAnotherOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        studentId: studentId,
        provider: "GOOGLE",
      },
    });

    if (!getAnotherOAuth) {
      //update the studet table
      const updateStudent = await prisma.student.update({
        where: {
          id: studentId,
        },
        data: {
          isOAuthUser: false,
          appleId: null,
        },
      });
    }
  }
};

const linkSocialAccount = async (payload) => {
  const { uid, idToken, provider, studentId } = payload;

  const getStudent = await prisma.student.findFirst({
    where: {
      id: studentId,
    },
  });

  if (!getStudent) throw new AppErrors(StatusCodes.NOT_FOUND, "User not Found");

  //first check if any other same provider social is linked
  const checkProviderSocial = await prisma.studentOAuthProvider.findFirst({
    where: {
      provider: provider,
      studentId: studentId,
    },
  });

  if (checkProviderSocial)
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "একটি একাউন্টে সর্বোচ্চ একটি গুগল/অ্যাপল সংযুক্ত করা সম্বভ",
    );

  //first verify the idToken and see if any other account is alrady with the provider email
  if (provider === "GOOGLE") {
    const gTicket = await validateGoogleToken(idToken);

    const checkStudent = await prisma.student.findFirst({
      where: {
        email: gTicket?.email,
        id: {
          not: studentId,
        },
      },
    });

    const checkAdmin = await prisma.admin.findFirst({
      where: {
        email: gTicket?.email,
      },
    });

    const checkSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        email: gTicket?.email,
      },
    });

    const checkOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        provider: provider,
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    if (checkStudent || checkAdmin || checkSuperAdmin || checkOAuth)
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "এই ইমেইলে অন্য একটি একাউন্ট আছে, দয়াকরে ভিন্ন ইমেইলে চেষ্টা করুন",
      );

    const linkAccount = await prisma.studentOAuthProvider.create({
      data: {
        studentId: studentId,
        provider: provider,
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    const updateStudent = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        ...(!getStudent?.uid && { uid: uid }),
        ...(!getStudent?.isOAuthUser && { isOAuthUser: true }),
      },
    });
  } else if (provider === "APPLE") {
    const gTicket = await validateAppleToken(idToken);

    const checkStudent = await prisma.student.findFirst({
      where: {
        email: gTicket?.email,
        id: {
          not: studentId,
        },
      },
    });

    const checkAdmin = await prisma.admin.findFirst({
      where: {
        email: gTicket?.email,
      },
    });

    const checkSuperAdmin = await prisma.superAdmin.findFirst({
      where: {
        email: gTicket?.email,
      },
    });

    const checkOAuth = await prisma.studentOAuthProvider.findFirst({
      where: {
        provider: provider,
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    if (checkStudent || checkAdmin || checkSuperAdmin || checkOAuth)
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "এই ইমেইলে অন্য একটি একাউন্ট আছে, দয়াকরে ভিন্ন ইমেইলে চেষ্টা করুন",
      );

    const linkAccount = await prisma.studentOAuthProvider.create({
      data: {
        studentId: studentId,
        provider: provider,
        providerUid: gTicket?.sub,
        email: gTicket?.email,
      },
    });

    const updateStudent = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        ...(!getStudent?.uid && { uid: uid }),
        ...(!getStudent?.isOAuthUser && { isOAuthUser: true }),
      },
    });
  }
  return true;
};

const userLoginDeviceInfo = async (payload = {}, user = {}) => {
  let ipData = null;
  let userDevices = [];

  try {
    const { data } = await axios.get(`https://ipwho.is/${payload.ip}`, {
      timeout: 5000,
    });
    if (data.success !== false) {
      ipData = data;
    }
  } catch (error) {
    console.error("IP lookup failed:", error.message);
  }

  //if admin
  if (user?.adminId) {
    userDevices = await prisma.admin.findMany({
      where: {
        id: user?.adminId,
      },
      select: {
        id: true,
        browserName: true,
        browserVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } else if (user?.studentId) {
    userDevices = await prisma.studentAuthLog.findMany({
      where: {
        studentId: user?.studentId,
      },
      select: {
        id: true,
        ip: true,
        hostName: true,
        lastLogedIn: true,
        authMethod: true,
        providerUid: true,
        browserName: true,
      },
      orderBy: {
        lastLogedIn: "desc",
      },
    });
  } else {
    userDevices = [];
  }

  return {
    activeData: {
      device: payload?.device?.type,
      os: payload?.os?.name,
      osVersion: payload?.os?.version,
      browserName: payload?.browser?.name,
      browserVersion: payload?.browser?.version,
      engine: payload?.engine?.name,
      engineVersion: payload?.engine?.version,
    },

    location: {
      continent: ipData?.continent || null,
      country: ipData?.country || null,
      countryCode: ipData?.country_code || null,
      region: ipData?.region || null,
      city: ipData?.city || null,
      timezone: ipData?.timezone?.id || null,
      capital: ipData?.capital || null,
      flag: ipData?.flag?.img || null,
    },

    network: {
      isp: ipData?.connection?.isp || null,
      org: ipData?.connection?.org || null,
      domain: ipData?.connection?.domain || null,
      asn: ipData?.connection?.asn || null,
    },

    previousDevices: userDevices,
  };
};

// const getAllCoursesOfStudent = async (uid) => {
//   const getStudent = await prisma.student.findFirst({
//     where: {
//       uid: uid,
//     },
//   });

//   if (!getStudent) return [];

//   const getAllCourses = await prisma.courseStudent.findMany({
//     where: {
//       studentId: getStudent?.id,
//       course: {
//         markAsArchieve: false,
//         isDeleted: false,
//         cycleAvailable: false,
//       },
//     },
//     select: {
//       course: true,
//     },
//   });

//   const getAllCycle = await prisma.cycleStudent.findMany({
//     where: {
//       studentId: getStudent?.id,
//       cycle: {
//         isDeleted: false,
//         markAsArchieve: false,
//       },
//     },
//     select: {
//       cycle: true,
//     },
//   });

//   let webStudentCourses = [];

//   for (const course of getAllCourses) {
//     webStudentCourses.push({
//       productId: course?.course?.productId,
//       affiliates: course?.course?.affiliateProductIds,
//     });
//   }

//   for (const cycle of getAllCycle) {
//     webStudentCourses.push({
//       productId: cycle?.cycle?.productId,
//       affiliates: cycle?.cycle?.affiliateProductIds,
//     });
//   }

//   return webStudentCourses;
// };

const getAllCoursesOfStudent = async (uid) => {
  const students = await prisma.student.findMany({
    where: {
      uid,
    },
    select: {
      id: true,
    },
  });

  if (students.length === 0) return [];

  const studentIds = students.map((student) => student.id);

  const [courses, cycles] = await Promise.all([
    prisma.course.findMany({
      where: {
        markAsArchieve: false,
        isDeleted: false,
        cycleAvailable: false,
        student: {
          some: {
            studentId: {
              in: studentIds,
            },
          },
        },
      },
      select: {
        productId: true,
        affiliateProductIds: true,
      },
    }),

    prisma.cycle.findMany({
      where: {
        isDeleted: false,
        markAsArchieve: false,
        student: {
          some: {
            studentId: {
              in: studentIds,
            },
          },
        },
      },
      select: {
        productId: true,
        affiliateProductIds: true,
      },
    }),
  ]);

  return [
    ...courses.map((course) => ({
      productId: course.productId,
      affiliates: course.affiliateProductIds,
    })),
    ...cycles.map((cycle) => ({
      productId: cycle.productId,
      affiliates: cycle.affiliateProductIds,
    })),
  ];
};

export const authService = {
  signUp,
  signUpV2,
  signUpV3,
  oAuthLoginVerify,
  logIn,
  logInV2,
  verifyCredential,
  verifyOtp,
  verifyOtpAndSignup,
  logOut,
  updateProfile,
  verifyLogin,
  verifyLoginV2,
  changePassword,
  forgetPassword,
  resetPassword,
  refreshTheToken,
  getProfile,
  syncStudentOauth,
  checkSocialLogin,
  existingAccountSocialLogin,
  getSocialLinkedAccounts,
  sendSignUpOtp,
  getUserForExam,
  unlinkSocialAccount,
  linkSocialAccount,
  userLoginDeviceInfo,
  getAllCoursesOfStudent,
};
