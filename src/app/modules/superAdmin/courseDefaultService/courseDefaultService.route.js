import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { CourseDefaultServiceController } from "./courseDefaultService.controller.js";
import { CourseDefaultServiceValidationSchema } from "./courseDefaultService.validation.js";

router.get("/",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),  CourseDefaultServiceController.GetAllCourseDefaultService);

router.get("/:id",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),  CourseDefaultServiceController.GetSingleCourseDefaultService);

router.post(
  "/",
  validationRequest(
    CourseDefaultServiceValidationSchema.createCourseDefaultServiceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), 
  CourseDefaultServiceController.createCourseDefaultService,
);

router.patch(
  "/:id",
  validationRequest(
    CourseDefaultServiceValidationSchema.updateCourseDefaultServiceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), 
  CourseDefaultServiceController.updateCourseDefaultService,
);

router.delete("/:id",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),  CourseDefaultServiceController.deleteCourseDefaultService);

export const CourseDefaultServiceRoute = router;
