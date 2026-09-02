import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { profileValidationSchema } from "../profile/profile.validation.js";
import { profileController } from "../profile/profile.controller.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
const router = Router();

router.patch(
  "/change-photo",
  // authorizationMiddleware.authorize(["admin"]),
  handleFileUpload,
  fileUploader.processFileUploads,
  profileController.changeProfilePhoto
);

export const profileRoute = router;
