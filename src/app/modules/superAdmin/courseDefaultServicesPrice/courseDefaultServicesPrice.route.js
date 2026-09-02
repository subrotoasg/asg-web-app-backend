import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { CourseDefaultServicesPriceValidationSchema } from "./courseDefaultServicesPrice.validation.js";
import { CourseDefaultServicesPriceController } from "./courseDefaultServicesPrice.controller.js";

router.get("/all",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), CourseDefaultServicesPriceController.GetAllCourseDefaultServicesPrice);

router.get("/:id",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), CourseDefaultServicesPriceController.GetSingleCourseDefaultServicesPrice);

router.post(
  "/",
  validationRequest(
    CourseDefaultServicesPriceValidationSchema.createCourseDefaultServicesPriceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), 
  CourseDefaultServicesPriceController.createCourseDefaultServicesPrice,
);

router.patch(
  "/:id",
  validationRequest(
    CourseDefaultServicesPriceValidationSchema.updateCourseDefaultServicesPriceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]), 
  CourseDefaultServicesPriceController.updateCourseDefaultServicesPrice,
);

router.delete("/:id",authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),CourseDefaultServicesPriceController.deleteCourseDefaultServicesPrice);

export const CourseDefaultServicesPriceRoute = router;
