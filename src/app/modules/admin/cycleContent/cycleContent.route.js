import { Router } from "express";
import { CycleContentController } from "./cycleContent.controller.js";
import {
  handleFileUpload,
  handleMultipuleFileUpload,
} from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { CycleContentValidationSchema } from "./cycleContent.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  CycleContentController.GetAllCycleContent,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
    Enums.roles.STUDENT,
  ]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleContentController.GetSingleCycleContent,
);

router.get(
  "/download/video/:id",
  authorizationMiddleware.authorize(["student"]),
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleContentController.GetCycleContentDownloadMetaData,
);

router.get(
  "/classes/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
  ]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleContentController.getClassBasedOnCycleChapterId,
);

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  // authorizationMiddleware.authorizeEveryoneForCycle,
  CycleContentController.GetCycleSubjectChapterContentInfoByCourseId,
);

router.get(
  "/get-all-content-by-cycleId/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleContentController.GetCycleContentByCycleId,
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  fileUploader.processFileUploads,
  validationRequest(
    CycleContentValidationSchema.createCycleContentValidationSchema,
  ),
  CycleContentController.createCycleContent,
);

router.patch(
  "/:id",
  handleMultipuleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  fileUploader.processFileUploads,
  validationRequest(
    CycleContentValidationSchema.updateCycleContentValidationSchema,
  ),
  CycleContentController.updateCycleContent,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  CycleContentController.deleteCycleContent,
);

router.post(
  "/add-content",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    CycleContentValidationSchema.createCycleWholeValidationSchema,
  ),
  CycleContentController.GodClass,
);

export const CycleContentRoute = router;
