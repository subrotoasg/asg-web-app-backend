import { Router } from "express";
const router = Router();
import { ChepterController } from "./chepter.controller.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { ChepterValidationSchema } from "./chepter.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";

router.get("/", ChepterController.GetAllChepter);

router.get("/:id", ChepterController.GetSingleChepter);

router.get(
  "/all/chapters/:subjectId",
  ChepterController.GetChepterBasedOnSubject,
);

router.post(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(ChepterValidationSchema.createChapterValidationSchema),
  ChepterController.createChepter,
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(ChepterValidationSchema.updateChapterValidationSchema),
  ChepterController.updateChepter,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  ChepterController.deleteChepter,
);

export const ChepterRoute = router;
