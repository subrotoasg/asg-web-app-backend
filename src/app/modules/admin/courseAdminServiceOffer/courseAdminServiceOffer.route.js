import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { CourseAdminServiceOfferValidationSchema } from "./courseAdminServiceOffer.validation.js";
import { CourseAdminServiceOfferController } from "./courseAdminServiceOffer.controller.js";

router.get(
  "/all",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminServiceOfferController.GetAllCourseAdminServiceOffer,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminServiceOfferController.GetSingleCourseAdminServiceOffer,
);
//get all admin offer
router.get(
  "/teacher/offer",
  authorizationMiddleware.authorize([Enums.roles.ADMIN]),
  CourseAdminServiceOfferController.GetAllAdminServiceOffer,
);
router.post(
  "/",
  validationRequest(
    CourseAdminServiceOfferValidationSchema.createCourseAdminServiceOfferValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminServiceOfferController.createCourseAdminServiceOffer,
);

router.patch(
  "/:id",
  validationRequest(
    CourseAdminServiceOfferValidationSchema.updateCourseAdminServiceOfferValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminServiceOfferController.updateCourseAdminServiceOffer,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminServiceOfferController.deleteCourseAdminServiceOffer,
);

export const CourseAdminServiceOfferRoute = router;
