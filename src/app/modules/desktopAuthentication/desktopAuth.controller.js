import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import AppErrors from "../../../errors/AppErrors.js";
import catchAsync from "../../utlis/catchAsync.js";
import sendResponse from "../../utlis/sendResponse.js";
import {
  getDesktopAuthConfig,
  hasFirebaseBrowserConfig,
} from "./desktopAuth.config.js";
import { renderDesktopAuthPage } from "./desktopAuth.page.js";
import { desktopAuthService } from "./desktopAuth.service.js";

const resolvePublicUrl = (req) => {
  const configured = getDesktopAuthConfig().publicUrl;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new AppErrors(
      StatusCodes.SERVICE_UNAVAILABLE,
      "DESKTOP_AUTH_PUBLIC_URL is not configured",
    );
  }
  return `${req.protocol}://${req.get("host")}`;
};

const requireBrowserConfig = () => {
  const firebase = getDesktopAuthConfig().firebase;
  if (!hasFirebaseBrowserConfig(firebase)) {
    throw new AppErrors(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Desktop Firebase browser configuration is incomplete",
    );
  }
  return firebase;
};

const start = catchAsync(async (req, res) => {
  const result = await desktopAuthService.start({
    payload: req.body,
    requestInfo: req.requestInfo || {},
    publicUrl: resolvePublicUrl(req),
  });
  return sendResponse(res, {
    statusCodes: StatusCodes.CREATED,
    success: true,
    message: "Desktop authentication transaction created",
    data: result,
  });
});

const browserContext = catchAsync(async (req, res) => {
  requireBrowserConfig();
  const result = await desktopAuthService.getBrowserContext({
    transactionId: req.params.transactionId,
    browserToken: req.get("x-desktop-auth-browser-token"),
  });
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Desktop browser authentication is ready",
    data: result,
  });
});

const complete = catchAsync(async (req, res) => {
  const result = await desktopAuthService.complete(req.body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const status = catchAsync(async (req, res) => {
  const result = await desktopAuthService.getStatus({
    transactionId: req.params.transactionId,
    pollToken: req.get("x-desktop-auth-poll-token"),
  });
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const exchange = catchAsync(async (req, res) => {
  const result = await desktopAuthService.exchange(req.body);
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message || "Desktop sign-in successful",
    data: result,
  });
});

const cancel = catchAsync(async (req, res) => {
  const result = await desktopAuthService.cancel(req.body);
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const linkAccount = catchAsync(async (req, res) => {
  const result = await desktopAuthService.linkAccount({
    ...req.body,
    accessToken: req.get("x-access-token"),
  });
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const requestRegistrationOtp = catchAsync(async (req, res) => {
  const result = await desktopAuthService.requestRegistrationOtp(req.body);
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const completeRegistration = catchAsync(async (req, res) => {
  const result = await desktopAuthService.completeRegistration(req.body);
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const refreshSession = catchAsync(async (req, res) => {
  const result = await desktopAuthService.refreshSession(req.body);
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Desktop session refreshed",
    data: result,
  });
});

const logoutSession = catchAsync(async (req, res) => {
  const result = await desktopAuthService.logoutSession(req.body);
  res.setHeader("Cache-Control", "no-store");
  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Desktop session signed out",
    data: result,
  });
});

const page = catchAsync(async (req, res) => {
  const firebaseConfig = requireBrowserConfig();
  const publicUrl = resolvePublicUrl(req);
  const nonce = crypto.randomBytes(18).toString("base64");

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      `script-src 'nonce-${nonce}' https://www.gstatic.com https://apis.google.com`,
      `style-src 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "connect-src 'self' https://www.gstatic.com https://apis.google.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com",
      "frame-src https://accounts.google.com https://appleid.apple.com https://*.firebaseapp.com",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  res
    .status(StatusCodes.OK)
    .type("html")
    .send(
      renderDesktopAuthPage({
        firebaseConfig,
        apiBaseUrl: `${publicUrl}/api/v1/desktop-auth`,
        nonce,
      }),
    );
});

export const desktopAuthController = {
  start,
  browserContext,
  complete,
  status,
  exchange,
  cancel,
  linkAccount,
  requestRegistrationOtp,
  completeRegistration,
  refreshSession,
  logoutSession,
  page,
};
