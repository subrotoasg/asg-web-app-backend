import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { courseAdminController } from "./courseAdmin.controller.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  courseAdminController.getAdminCourseAll,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  courseAdminController.getAdminsOfCourse,
);

router.get(
  "/course/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  courseAdminController.getCourseByAdminIdController,
);

export const courseAdminRoute = router;
