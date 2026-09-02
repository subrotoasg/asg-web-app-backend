import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { RoutineValidationSchema } from "./routine.validation.js";
import { RoutineController } from "./routine.controller.js";

const router = Router();

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(RoutineValidationSchema.createCourseRoutineValidation),
  RoutineController.createRoutine
);

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  RoutineController.getAllRoutineByCourseId
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  RoutineController.getOneById
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  fileUploader.processFileUploads,
  validationRequest(RoutineValidationSchema.updateCourseRoutineValidation),
  RoutineController.updateRoutine
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  RoutineController.deleteRoutine
);

export const CourseRoutineRoute = router;
