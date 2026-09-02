import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { grandCelebrationValidationSchema } from "./auth.validation.js";
import { grandCelebrationController } from "./auth.controller.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import grandCelebrationTempAuthMiddleware from "../middleware/tempAuthMiddleWare.js";
import {
  verifyCredentialDeepLimiterForGC,
  verifyCredentialDeepLimiterForGCResendOTP,
} from "../../../../helper/rateLimit.js";
const router = Router();

router.post(
  "/signup",
  validationRequest(grandCelebrationValidationSchema.signupValidationSchema),
  verifyCredentialDeepLimiterForGC,
  grandCelebrationController.grandCelebrationSignUp,
);

//resend otp
router.get(
  "/resend/otp",
  grandCelebrationTempAuthMiddleware(["student"]),
  verifyCredentialDeepLimiterForGCResendOTP,
  grandCelebrationController.resendOTP,
);

router.post(
  "/verify/signup",
  validationRequest(grandCelebrationValidationSchema.verifySignUpOTP),
  grandCelebrationController.verifySignUpOTP,
);

//login request OTP
router.post(
  "/request/login/otp",
  validationRequest(grandCelebrationValidationSchema.loginRequeOTP),
  verifyCredentialDeepLimiterForGC,
  grandCelebrationController.loginRequestOTP,
);

//verify login
router.post(
  "/verify/login",
  validationRequest(grandCelebrationValidationSchema.verifyLoginOTP),
  grandCelebrationController.verifyLoginOTP,
);

export const grandCelebrationRoutes = router;
