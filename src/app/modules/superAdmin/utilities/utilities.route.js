import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { utilitiesController } from "./utilities.controller.js";
import { StudentValidationSchema } from "./utilities.validation.js";
import grandCelebrationAuthMiddleware from "../../grandCelebration/middleware/authMiddleware.js";

const router = Router();

router.get(
  "/get/studentInfo/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  utilitiesController.getStudentInfo,
);

router.get(
  "/get/shop/access/info/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.getShopInfo,
);

router.get(
  "/fix/uid/:id/student/:studentId",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.fixUid,
);

router.get(
  "/get/super-admin/info",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  utilitiesController.getSuperAdminInfo,
);

router.get(
  "/get/:id/student",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  utilitiesController.getStudent,
);

router.patch(
  "/remove/student/access",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    StudentValidationSchema.removeStudentAccessValidationSchema,
  ),
  utilitiesController.removeStudentAccess,
);

router.get(
  "/get/banned/students",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.getBannedStudents,
);

router.patch(
  "/update/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(StudentValidationSchema.updateStudentValidationSchema),
  utilitiesController.updateStudent,
);

router.patch(
  "/action/ban-unban/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(StudentValidationSchema.studentBanUnbanValidationSchema),
  utilitiesController.studentAction,
);

router.get(
  "/dashboard-info/:id",
  // authorizationMiddleware.authorize([
  //   Enums.roles.SUPERADMIN,
  //   Enums.roles.ADMIN,
  // ]),
  utilitiesController.getDashboardInfo,
);

router.get(
  "/init/buyFromFeatured/:id",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  utilitiesController.initPurchaseFromWebAppv1,
);

router.post(
  "/init/buyFromFeatured",
  validationRequest(StudentValidationSchema.validateInitPurchase),
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  utilitiesController.initPurchaseFromWebAppv2,
);

router.post(
  "/buyFromFeatured",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  validationRequest(StudentValidationSchema.validatePurchase),
  utilitiesController.purchaseFormWebApp,
);

router.get("/check-cupon/:productId/:Cupon", utilitiesController.checkCupon);

router.post(
  "/add-streaming-services",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    StudentValidationSchema.addStreamingServiceValidationSchema,
  ),
  utilitiesController.addStreamingService,
);

router.post(
  "/another/add-streaming-services",
  utilitiesController.addStreamingService2,
);

router.post(
  "/add-bunny-storage-services",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(StudentValidationSchema.addStorageServiceValidationSchema),
  utilitiesController.addStorageService,
);

router.get(
  "/get-student-status",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.getStudentStatus,
);

router.patch(
  "/remove-auth-ban/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.removeAuthBan,
);

router.get(
  "/get-activity-log",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  utilitiesController.getActivityLogs,
);

router.post(
  "/notify/new-transaction",
  validationRequest(StudentValidationSchema.transactionNotifyValidationSchema),
  utilitiesController.getNotifiedFromCrm,
);

router.get("/student/lookup", utilitiesController.studentLookupForAFS);

router.get("/student/lookup/camp", utilitiesController.studentLookupForCAMP);

router.get("/daily/ayah", utilitiesController.getDailyAyah);

router.get("/surah/:id", utilitiesController.getSurah);

router.patch(
  "/action/interaction/ban-unban",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(StudentValidationSchema.interactionBannedUnbannedSchema),
  utilitiesController.interactionBannedUnbannedController,
);

router.get(
  "/all/actice/chat",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.getAllActiveChatInfoController,
);

router.get(
  "/all/actice/chat/content-or-cycle/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
    Enums.roles.STUDENT,
  ]),
  utilitiesController.getContentBasedActiveChatController,
);

//get creadentials
router.get(
  "/media/credentials",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  utilitiesController.getMediaCredentialsController,
);

//check credentials
router.post(
  "/check/media/credentials",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(StudentValidationSchema.checkMediaCredentials),
  utilitiesController.checkMediaCredentialsController,
);

router.post("/desktop/event", utilitiesController.addEvent);

router.get("/desktop/event", utilitiesController.getEvent);

router.get(
  "/check/gc/eligibility",
  grandCelebrationAuthMiddleware(["student"]),
  utilitiesController.checkGcEligibility,
);
export const utilitiesRoute = router;
