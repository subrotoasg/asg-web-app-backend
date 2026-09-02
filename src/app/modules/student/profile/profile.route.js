import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { profileValidationSchema } from "../profile/profile.validation.js";
import { profileController } from "../profile/profile.controller.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.patch(
  "/update",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  fileUploader.processFileUploadsForProfile,
  profileController.studentProfileUpdate,
);

router.get(
  "/download",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  profileController.studentInfoDownloader,
);

router.get(
  "/checkForUpdate",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  profileController.getMe,
);

export const studentProfileRoute = router;
