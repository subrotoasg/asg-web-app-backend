import { StatusCodes } from "http-status-codes";
import AppErrors from "../../errors/AppErrors.js";
import config from "../config/index.js";
import catchAsync from "../utlis/catchAsync.js";
import jwt from "jsonwebtoken";
import { prisma } from "../../../constants/index.js";
import { Enums } from "../constant/enums.js";
import {
  findCourseByAnyHierarchyId,
  newfindCourseByAnyHierarchyId,
  newfindCycleByAnyHierarchyId,
} from "./handleCourseAuth.js";
import { CookieHelper } from "../../helper/cookieHelper.js";
import { verifyUserTokenWithSignature } from "../modules/authentication/auth.utlis.js";
import { getCachedAuthUser } from "../modules/authentication/cache/auth-user.cache.js";
import { validateCachedStudentSession } from "../modules/authentication/session/student-session.cache.js";
import { getAuthorizationEntityId } from "../modules/authentication/cache/authorization.cache.helpers.js";
import {
  getCachedCourseContext,
  getCachedCycleContext,
  canUserAccessCourse,
  canUserAccessCycle,
  hasCourseStudentAccess,
} from "../modules/authentication/cache/authorization.cache.js";

const authorize = (allowedRoles = []) => {
  return catchAsync(async (req, res, next) => {
    const token = req?.headers["x-access-token"];
    const hostName = CookieHelper.getFrontendHost(req);
    const cookieKey = CookieHelper.refreshCookieName(hostName);
    const refreshToken = req?.cookies?.[cookieKey];
    let decoded = null;
    decoded = verifyUserTokenWithSignature(token);

    if (!decoded?.id || decoded?.type !== Enums.tokenType.access) {
      const hostName = CookieHelper.getFrontendHost(req);
      const cookieKey = CookieHelper.refreshCookieName(hostName);
      CookieHelper.clearTheCookie(res, cookieKey);
      throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid Token Type");
    }

    //new added
    const tokenRole = decoded?.role;
    if (!tokenRole || !allowedRoles.includes(tokenRole)) {
      throw new AppErrors(StatusCodes.UNAUTHORIZED, "You are not authorized");
    }

    const checkUser = await getCachedAuthUser({
      role: tokenRole,
      userId: decoded.id,
    });

    if (!checkUser || checkUser.role !== tokenRole) {
      CookieHelper.clearTheCookie(res, cookieKey);

      throw new AppErrors(StatusCodes.UNAUTHORIZED, "You are not authorized");
    }
    const { roles } = Enums;
    if (tokenRole === roles.STUDENT) {
      const isSessionValid = await validateCachedStudentSession({
        studentId: checkUser.id,
        hostName,
        refreshToken,
      });

      if (!isSessionValid) {
        CookieHelper.clearTheCookie(res, cookieKey);

        throw new AppErrors(
          StatusCodes.MULTIPLE_CHOICES,

          "আমাদের নীতি অনুযায়ী, একটি অ্যাকাউন্ট থেকে এক সময়ে শুধুমাত্র একটি ডিভাইসে লগইন করার অনুমতি রয়েছে। অন্য ডিভাইসে সেশনটি শেষ হওয়ার জন্য অনুগ্রহ করে ৫ থেকে ১০ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
        );
      }
    }

    if (tokenRole === roles.ADMIN) {
      const passwordChangedAt = checkUser?.passwordChangedAt;

      if (passwordChangedAt) {
        const tokenIssuedAt = decoded?.iat * 1000;

        const changedAt = new Date(passwordChangedAt).getTime();

        if (tokenIssuedAt < changedAt) {
          throw new AppErrors(
            StatusCodes.UNAUTHORIZED,
            "আপনার পাসওয়ার্ড পরিবর্তিত হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
          );
        }
      }
    }

    if (
      (tokenRole === roles.ADMIN || tokenRole === roles.STUDENT) &&
      (checkUser?.isDeleted || checkUser?.status !== "ACTIVE")
    ) {
      throw new AppErrors(
        StatusCodes.IM_A_TEAPOT,
        "You are banned by the authority.",
      );
    }
    if (!req.body || typeof req.body !== "object") {
      req.body = {};
    }

    req.authUser = checkUser;

    req.auth = {
      userId: checkUser.id,
      role: checkUser.role,
      hostName,
    };

    req.body[`${tokenRole}Id`] = checkUser.id;

    req.body[`${tokenRole}Phone`] = checkUser.phone;

    req.body[`${tokenRole}Email`] = checkUser.email;

    req.body.userRole = checkUser.role;

    req.body.userIdForLimit = checkUser.id;

    return next();

    //new end
  });
};

const authorizeEveryoneForCourses = catchAsync(async (req, res, next) => {
  const userId = req?.auth?.userId;

  const role = req?.auth?.role;

  if (!userId || !role) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Authentication context missing",
    );
  }
  const id = getAuthorizationEntityId(req);

  if (!id) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid Id");
  }

  const { found, course } = await getCachedCourseContext(id);

  if (!found || !course) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "invalid Id");
  }
  const allowed = await canUserAccessCourse({
    role,
    userId,
    course,
  });

  if (!allowed) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You are not authorized for this course",
    );
  }
  req.body.courseId = course.id;

  return next();
});

const authorizeEveryoneForCycle = catchAsync(async (req, res, next) => {
  const userId = req?.auth?.userId;
  const role = req?.auth?.role;
  if (!userId || !role) {
    throw new AppErrors(
      StatusCodes.UNAUTHORIZED,
      "Authentication context missing",
    );
  }
  const id = getAuthorizationEntityId(req, ["courseId"]);
  if (!id) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid Id");
  }
  const { found, cycle } = await getCachedCycleContext(id);
  if (!found || !cycle) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "invalid Id");
  }
  const allowed = await canUserAccessCycle({
    role,
    userId,
    cycle,
  });

  if (!allowed) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "You are not authorized for this cycle",
    );
  }

  req.body.cycleId = cycle.id;
  return next();
});

const authorizeStudentForCourses = catchAsync(async (req, res, next) => {
  const userId = req?.auth?.userId;
  const role = req?.auth?.role;
  if (!userId || role !== Enums.roles.STUDENT) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "Student authorization required",
    );
  }
  const id = getAuthorizationEntityId(req);
  if (!id) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid Id");
  }
  const { found, course } = await getCachedCourseContext(id);
  if (!found || !course) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid course");
  }
  const allowed = await hasCourseStudentAccess({
    studentId: userId,

    courseId: course.id,
  });
  if (!allowed) {
    throw new AppErrors(
      StatusCodes.FORBIDDEN,
      "you are not authorize for this course",
    );
  }
  req.body.courseId = course.id;
  return next();
});

export const authorizationMiddleware = {
  authorize,
  authorizeEveryoneForCourses,
  authorizeEveryoneForCycle,
  authorizeStudentForCourses,
};
