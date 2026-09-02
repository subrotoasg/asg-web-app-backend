import { Router } from "express";
const router = Router();
import { SubjectController } from "./subject.controller.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { SubjectValidationSchema } from "./subject.validation.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";

router.get(
  "/",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  SubjectController.GetAllSubject
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  SubjectController.GetSingleSubject
);

router.post(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(SubjectValidationSchema.createSubjectValidationSchema),
  SubjectController.createSubject
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(SubjectValidationSchema.updateSubjectValidationSchema),
  SubjectController.updateSubject
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  SubjectController.deleteSubject
);

export const SubjectRoute = router;
