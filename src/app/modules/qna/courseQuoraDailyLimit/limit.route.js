import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { courseQuoraDailyLimitValidationSchema } from "./limit.validation.js";
import { courseQuoraDailyLimit } from "./limit.controller.js";
const router = Router();

router.post(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    courseQuoraDailyLimitValidationSchema.createcourseQuoraDailyLimitValidationSchema
  ),
  courseQuoraDailyLimit.createDailyLimitModel
);

router.get(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  courseQuoraDailyLimit.getCourseQuoraDailyLimit
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    courseQuoraDailyLimitValidationSchema.updateCourseQuoraDailyLimitValidationSchema
  ),
  courseQuoraDailyLimit.updateDailyLimitModel
);

export const courseQuoraDailyLimitRoute = router;
