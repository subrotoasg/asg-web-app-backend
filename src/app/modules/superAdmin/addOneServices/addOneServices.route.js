import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { AddOneServiceController } from "./addOneServices.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { AddOneServiceValidationSchema } from "./addOneServices.validation.js";
import { Enums } from "../../../constant/enums.js";

router.get(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.GetAllAddOneService,
);

//get all admin and course based info
router.get(
  "/all-services-prices",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.getAllAddOneServicePrices,
);
//admin id based
router.get(
  "/admin/services/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.getAdminIdBasedAddOneServicePricesData,
);
//admin id and course id based
router.get(
  "/admin/services/:id/courses/:courseId",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.getAdminIdAndCourseIdBasedAddOneServiceAndPrices,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.GetSingleAddOneService,
);

router.post(
  "/",
  validationRequest(
    AddOneServiceValidationSchema.createAddOneServiceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.createAddOneService,
);

router.patch(
  "/:id",
  validationRequest(
    AddOneServiceValidationSchema.updateAddOneServiceValidationSchema,
  ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.updateAddOneService,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  AddOneServiceController.deleteAddOneService,
);

export const AddOneServiceRoute = router;
