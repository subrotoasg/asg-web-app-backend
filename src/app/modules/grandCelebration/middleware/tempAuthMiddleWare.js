import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import config from "../../../config/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { CookieHelper } from "../../../../helper/cookieHelper.js";
import { verifyToken } from "../auth/auth.utlis.js";

const grandCelebrationTempAuthMiddleware = (roles = []) => {
  return async (req, res, next) => {
    try {
      const hostName = CookieHelper.getFrontendHost(req);
      const cookieKey = CookieHelper.refreshCookieName(hostName);
      const token = req?.cookies?.[cookieKey];
      if (!token) {
        throw new AppErrors(
          StatusCodes.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      let decoded;
      try {
        decoded = verifyToken(token, config.auth_refresh_temp_key);
      } catch (error) {
        throw new AppErrors(
          StatusCodes.UNAUTHORIZED,
          "Invalid or expired token.",
        );
      }

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        throw new AppErrors(
          StatusCodes.FORBIDDEN,
          "You are not authorized to access this resource.",
        );
      }

      req.tempUser = decoded;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default grandCelebrationTempAuthMiddleware;
