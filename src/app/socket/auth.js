import { Enums } from "../constant/enums.js";

import { CookieHelper } from "../../helper/cookieHelper.js";

import { verifyRefreshTokenWithSignature } from "../modules/authentication/auth.utlis.js";

import {
  getSocketUser,
  allowConnectionFromIp,
} from "./authAccess/socketUser.cache.js";

export default async function socketAuth(socket, next) {
  try {
    const ip =
      socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      socket.handshake.address;

    const allowed = await allowConnectionFromIp(ip);

    if (!allowed) {
      return next(new Error("Too many connections"));
    }

    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next(new Error("Unauthorized"));
    }

    const origin = socket.handshake.headers.origin;

    const host = origin?.replace(/^https?:\/\//, "")?.replace(/\/$/, "");

    const fakeReq = {
      headers: {
        host: host,

        origin: origin,
      },

      cookies: {},
    };

    cookieHeader?.split(";")?.forEach((cookie) => {
      const [key, value] = cookie.trim().split("=");

      fakeReq.cookies[key] = value;
    });

    const hostName = CookieHelper.getFrontendHost(fakeReq);

    const cookieKey = CookieHelper.refreshCookieName(hostName);

    const refreshToken = fakeReq.cookies[cookieKey];

    if (!refreshToken) {
      return next(new Error("Token missing"));
    }

    const decoded = verifyRefreshTokenWithSignature(refreshToken);

    if (!decoded?.id || decoded.type !== Enums.tokenType.refresh) {
      return next(new Error("Invalid token"));
    }

    const user = await getSocketUser(decoded.role, decoded.id);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;

    next();
  } catch (error) {
    next(new Error(error.message));
  }
}
