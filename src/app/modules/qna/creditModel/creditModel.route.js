import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { creditModelValidationSchema } from "./creditModel.validation.js";
import { creditModelController } from "./creditModel.controller.js";
const router = Router();

router.post(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    creditModelValidationSchema.createCreditModelValidationSchema
  ),
  creditModelController.createCreditModel
);

router.get(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  creditModelController.getCreditModel
);

export const creditModelRoute = router;
