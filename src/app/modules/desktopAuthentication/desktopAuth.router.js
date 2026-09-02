import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import validationRequest from "../../middleware/validationRequest.js";
import { desktopAuthController } from "./desktopAuth.controller.js";
import {
  cancelDesktopAuthSchema,
  completeDesktopAuthSchema,
  completeDesktopRegistrationSchema,
  exchangeDesktopAuthSchema,
  linkDesktopAuthSchema,
  logoutDesktopSessionSchema,
  refreshDesktopSessionSchema,
  requestDesktopRegistrationOtpSchema,
  startDesktopAuthSchema,
} from "./desktopAuth.validation.js";

const router = Router();

const mutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many desktop authentication attempts. Please try again later.",
});

const registrationOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many OTP requests. Please try again later.",
});

router.get("/desktop-auth", desktopAuthController.page);

router.post(
  "/api/v1/desktop-auth/start",
  mutationLimiter,
  validationRequest(startDesktopAuthSchema),
  desktopAuthController.start,
);

router.get(
  "/api/v1/desktop-auth/browser/:transactionId",
  desktopAuthController.browserContext,
);

router.post(
  "/api/v1/desktop-auth/complete",
  mutationLimiter,
  validationRequest(completeDesktopAuthSchema),
  desktopAuthController.complete,
);

router.get(
  "/api/v1/desktop-auth/status/:transactionId",
  desktopAuthController.status,
);

router.post(
  "/api/v1/desktop-auth/exchange",
  mutationLimiter,
  validationRequest(exchangeDesktopAuthSchema),
  desktopAuthController.exchange,
);

router.post(
  "/api/v1/desktop-auth/cancel",
  mutationLimiter,
  validationRequest(cancelDesktopAuthSchema),
  desktopAuthController.cancel,
);

router.post(
  "/api/v1/desktop-auth/link",
  mutationLimiter,
  validationRequest(linkDesktopAuthSchema),
  desktopAuthController.linkAccount,
);

router.post(
  "/api/v1/desktop-auth/registration/otp",
  registrationOtpLimiter,
  validationRequest(requestDesktopRegistrationOtpSchema),
  desktopAuthController.requestRegistrationOtp,
);

router.post(
  "/api/v1/desktop-auth/registration/complete",
  mutationLimiter,
  validationRequest(completeDesktopRegistrationSchema),
  desktopAuthController.completeRegistration,
);

router.post(
  "/api/v1/desktop-auth/refresh",
  mutationLimiter,
  validationRequest(refreshDesktopSessionSchema),
  desktopAuthController.refreshSession,
);

router.post(
  "/api/v1/desktop-auth/logout",
  mutationLimiter,
  validationRequest(logoutDesktopSessionSchema),
  desktopAuthController.logoutSession,
);

export const desktopAuthRoutes = router;
