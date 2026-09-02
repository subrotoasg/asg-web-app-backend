import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { CourseAdminOfferPriseValidationSchema } from "./courseAdminServiceOfferingPrice.validation.js";
import { CourseAdminOfferPriseController } from "./courseAdminServiceOfferingPrice.controller.js";

router.get(
  "/all",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminOfferPriseController.GetAllCourseAdminOfferPrise,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminOfferPriseController.GetSingleCourseAdminOfferPrise,
);

router.post(
  "/",
  validationRequest(
    CourseAdminOfferPriseValidationSchema.createCourseAdminOfferPriseValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminOfferPriseController.createCourseAdminOfferPrise,
);

router.patch(
  "/:id",
  validationRequest(
    CourseAdminOfferPriseValidationSchema.updateCourseAdminOfferPriseValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminOfferPriseController.updateCourseAdminOfferPrise,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminOfferPriseController.deleteCourseAdminOfferPrise,
);

export const CourseAdminServiceOfferPriceRoute = router;
