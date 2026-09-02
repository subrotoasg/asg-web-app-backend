import { Router } from "express";
import validationRequest from "../../middleware/validationRequest.js";
import { authValidationSchema } from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import { authorizationMiddleware } from "../../middleware/authorization.js";
import { authMiddleware } from "./auth.middleware.js";
import { Enums } from "../../constant/enums.js";
import { handleFileUpload } from "../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../shared/fileUploader.js";
import {
  changePasswordRouteLimiter,
  forgetPasswordRouteDeepLimiter,
  forgetPasswordRouteIpLimiter,
  logInRouteLimiter,
  resetPasswordRouteLimiter,
  signUpRouteDeepRateLimiter,
  signUpRouteIpLimiter,
  verifyCredentialDeepLimiter,
  verifyCredentialIpLimiter,
} from "../../../helper/rateLimit.js";
const router = Router();

router.post(
  "/signup",
  validationRequest(authValidationSchema.signupValidationSchema),
  signUpRouteIpLimiter,
  signUpRouteDeepRateLimiter,
  authController.signUp,
);

//new signup time auth phone verification
router.post(
  "/init/signup/verification",
  validationRequest(authValidationSchema.credentialVerificationSchema),
  verifyCredentialIpLimiter,
  verifyCredentialDeepLimiter,
  authController.verifyCredential,
);

router.post(
  "/send-signup-otp",
  validationRequest(authValidationSchema.credentialVerificationSchema),
  verifyCredentialIpLimiter,
  verifyCredentialDeepLimiter,
  authController.sendSignUpOtp,
);

//new student signup time otp varification
router.post(
  "/init/signup/phone/verification",
  validationRequest(authValidationSchema.verifyCredentialVerificationSchema),
  verifyCredentialIpLimiter,
  verifyCredentialDeepLimiter,
  authController.verifyOtp,
);

//new student sign up time otp verification + signup together
router.post(
  "/init/signup/phone/verification/complete",
  validationRequest(authValidationSchema.verifyCredentialAndSignup),
  verifyCredentialIpLimiter,
  verifyCredentialDeepLimiter,
  authController.verifyOtpAndSignup,
);

router.post(
  "/v2/signup",
  validationRequest(authValidationSchema.signupV2ValidationSchema),
  verifyCredentialIpLimiter,
  verifyCredentialDeepLimiter,
  authController.signUpV2,
);

router.post(
  "/login",
  validationRequest(authValidationSchema.loginValidationSchema),
  logInRouteLimiter,
  authMiddleware.validatePhone,
  authController.login,
);

router.post(
  "/social-login",
  validationRequest(authValidationSchema.oAuthLoginVerifySchema),
  authController.oAuthLoginVerify,
);

router.post(
  "/check-social-login",
  validationRequest(authValidationSchema.checkSocialLoginValidationSchema),
  authController.checkSocialLogin,
);

router.post(
  "/existing/account/social-login/enable",
  validationRequest(
    authValidationSchema.existingAccountSocialLoginValidationSchema,
  ),
  authController.existingAccountSocialLogin,
);

router.post(
  "/login/otp/request",
  validationRequest(authValidationSchema.loginV2ValidationSchema),
  logInRouteLimiter,
  authMiddleware.validatePhone,
  authController.loginV2,
);

router.post(
  "/verify-login/otp",
  validationRequest(authValidationSchema.VerifyLoginV2ValidationSchema),
  authController.verifyLoginV2,
);

router.post(
  "/sync/student/oAuth",
  // authorizationMiddleware.authorize(["student"]),
  validationRequest(authValidationSchema.syncStudentoAuthValidationSchema),
  authController.syncStudentOauth,
);

router.post(
  "/verify-login",
  validationRequest(authValidationSchema.verifyValidationSchema),
  authController.verifyLogin,
);

router.post("/refresh-token", authController.refreshTheToken);

router.post("/logout", authController.logOut);

router.post(
  "/change-password",
  authorizationMiddleware.authorize(["admin", "solver"]),
  changePasswordRouteLimiter,
  validationRequest(authValidationSchema.changePasswordValidationSchema),
  authController.changePassword,
);

router.post(
  "/forget-password",
  validationRequest(authValidationSchema.forgottenPasswordValidationSchema),
  forgetPasswordRouteIpLimiter,
  forgetPasswordRouteDeepLimiter,
  authController.forgetPassword,
);

router.post(
  "/reset-password",
  validationRequest(authValidationSchema.resetPasswordValidationSchema),
  resetPasswordRouteLimiter,
  authController.resetPassword,
);

router.get(
  "/get-me",
  authorizationMiddleware.authorize([
    // Enums.roles.SUPERADMIN,
    // Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    // Enums.roles.SOLVER,
  ]),
  authController.getProfile,
);

router.patch(
  "/update-profile",
  authorizationMiddleware.authorize([
    // Enums.roles.SUPERADMIN,
    // Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    // Enums.roles.SOLVER,
  ]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  authController.updateProfile,
);

router.get(
  "/ping",
  authorizationMiddleware.authorize([Enums.roles.ADMIN, Enums.roles.STUDENT]),
  authController.ping,
);

router.post(
  "/delete-account",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  authController.deleteAccount,
);

router.get(
  "/get/social/accounts",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  authController.getSocialLinkedAccounts,
);

router.get("/get/user/for/exam", authController.getUserForExam);

router.patch(
  "/unlink/social/account",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  validationRequest(authValidationSchema.unlinkSocialValidationSchema),
  authController.unlinkSocialAccount,
);

router.patch(
  "/link/social/account",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  validationRequest(authValidationSchema.linkSocialValidationSchema),
  authController.linkSocialAccount,
);

router.get(
  "/user/devices/info",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authController.userDevicesInfoController,
);

//for exam site: get all courses of student in webapp
router.get(
  "/get/student/all/courses/:uid",
  authController.getAllCoursesOfStudent,
);

export const authRoutes = router;
