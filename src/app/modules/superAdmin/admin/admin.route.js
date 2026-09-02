import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { superAdminValidationSchema } from "../admin/admin.validation.js";
import { superAdminController } from "../admin/admin.controller.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.post(
  "/create-admin",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  validationRequest(superAdminValidationSchema.createAdminValidationSchema),
  superAdminController.createAdmin,
);

router.get(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  superAdminController.getAllAdmins,
);
router.get(
  "/superadmin-portal-call",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  superAdminController.getAllAdminsForSuperadminPortalCallController,
);

router.post(
  "/assign-admin-course",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  validationRequest(
    superAdminValidationSchema.assignAdminToCourseValidationSchema,
  ),
  superAdminController.assignAdminCourse,
);

router.patch(
  "/unassign-admin-course",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    superAdminValidationSchema.unAssignAdminFromCourseValidationSchema,
  ),
  superAdminController.unassignAdminCourse,
);

router.patch(
  "/deactive-admin",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(superAdminValidationSchema.deactiveAdmin),
  superAdminController.deactiveAdmin,
);

router.delete(
  "/delete-admin",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(superAdminValidationSchema.deactiveAdmin),
  superAdminController.deleteAdmin,
);

export const superAdminRoute = router;
