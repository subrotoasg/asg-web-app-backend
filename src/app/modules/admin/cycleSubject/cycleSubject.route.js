import { Router } from "express";
import { CycleSubjectController } from "./cycleSubject.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { CycleSubjectValidationSchema } from "./cycleSubject.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
const router = Router();

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleSubjectController.GetCourseBasedCycleSubject,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleSubjectController.GetSingleCycleSubject,
);

router.get(
  "/subjects/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleSubjectController.GetCycleIdBasedSubjects,
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
    CycleSubjectValidationSchema.createCycleSubjectValidationSchema,
  ),
  CycleSubjectController.createCycleSubject,
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  fileUploader.processFileUploads,
  validationRequest(
    CycleSubjectValidationSchema.updateCycleSubjectValidationSchema,
  ),
  CycleSubjectController.updateCycleSubject,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleSubjectController.deleteCycleSubject,
);

export const CycleSubjectRoute = router;
