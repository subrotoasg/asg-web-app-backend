import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";

router.get("/", TemplateController.GetAllTemplate);

router.get("/:id", TemplateController.GetSingleTemplate);

router.post(
  "/",
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(TemplateValidationSchema.createTemplateValidationSchema),
  TemplateController.createTemplate
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(TemplateValidationSchema.updateTemplateValidationSchema),
  TemplateController.updateTemplate
);

router.delete("/:id", TemplateController.deleteTemplate);

export const TemplateRoute = router;
