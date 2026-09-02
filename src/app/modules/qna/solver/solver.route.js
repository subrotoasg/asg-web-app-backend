import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { Enums } from "../../../constant/enums.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { SolverValidationSchema } from "./solver.validation.js";
import { SolverController } from "./solver.controller.js";
const router = Router();

router.post(
  "/registration",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  fileUploader.processFileUploads,
  validationRequest(SolverValidationSchema.registrationValidationSchema),
  SolverController.registration
);

router.get(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  SolverController.getAllSolvers
);

router.patch(
  //application accept or reject
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(SolverValidationSchema.registrationResolveSchema),
  SolverController.acceptOrRejectRegistration
);

export const SolverRoute = router;
