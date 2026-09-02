import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";

import { CourseAdminServiceOfferingSelectionController } from "./courseAdminServiceOfferingSelection.controller.js";
import { CourseAdminServiceOfferingSelectionValidationSchema } from "./courseAdminServiceOfferingSelection.validation.js";

router.get(
  "/all",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminServiceOfferingSelectionController.GetAllCourseAdminServiceOfferingSelection,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminServiceOfferingSelectionController.GetSingleCourseAdminServiceOfferingSelection,
);

router.post(
  "/",
  validationRequest(
    CourseAdminServiceOfferingSelectionValidationSchema.createCourseAdminServiceOfferingSelectionValidationSchema,
  ),
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CourseAdminServiceOfferingSelectionController.createCourseAdminServiceOfferingSelection,
);

router.patch(
  "/:id",
  validationRequest(
    CourseAdminServiceOfferingSelectionValidationSchema.updateCourseAdminServiceOfferingSelectionValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminServiceOfferingSelectionController.updateCourseAdminServiceOfferingSelection,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CourseAdminServiceOfferingSelectionController.deleteCourseAdminServiceOfferingSelection,
);

export const CourseAdminServiceOfferingSelectionRoute = router;
