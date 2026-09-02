import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { Enums } from "../../../constant/enums.js";
import { UsageTrackingValidationSchema } from "./UsageTracking.validation.js";
import { UsageTrackingController } from "./usageTracking.controller.js";

router.post(
  "/track/hourly",
  validationRequest(
    UsageTrackingValidationSchema.createPerHourUsageTrackingValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  // UsageTrackingController.perHourTracking,
  UsageTrackingController.trackUsage,
);

// all admin usage show
router.get(
  "/all-admins/usage",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  UsageTrackingController.allAdminUsageShow,
);

//monthly bill generate
router.post(
  "/billing/generate",
  validationRequest(
    UsageTrackingValidationSchema.createMonthlyBillGenerateValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  UsageTrackingController.monthlyBillGenerate,
);

// Get all bills with filters
router.get(
  "/bills",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.getAllBills,
);

// Get single bill details
router.get(
  "/bills/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.getBillDetails,
);

// Update bill payment
router.put(
  "/bills/:id/payment",
  validationRequest(
    UsageTrackingValidationSchema.updateBillPaymentValidationSchema,
  ),
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.updateBillPayment,
);

// Get teacher courses
router.get(
  "/teachers/:adminId/courses",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.getTeacherCourses,
);

// Get teacher services for a specific course
router.get(
  "/teachers/:adminId/courses/:courseId/services",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.getTeacherServices,
);

// Get service with price details
router.get(
  "/teachers/:adminId/courses/:courseId/services/:serviceId/price",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  UsageTrackingController.getServiceWithPrice,
);

export const UsageAddOnesServicesRoute = router;
