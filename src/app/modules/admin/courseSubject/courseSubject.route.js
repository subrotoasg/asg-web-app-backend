import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { courseSubjectValidationSchema } from "./courseSubject.validation.js";
import { courseSubjectController } from "./courseSubject.controller.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  courseSubjectController.getAllCourseSubject
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  courseSubjectController.getCourseSubjectById
);

router.get(
  "/subjects/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  courseSubjectController.getAllSubjectsByCourseId
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    courseSubjectValidationSchema.createCourseSubjectValidationSchema
  ),
  courseSubjectController.courseSubjectCreate
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    courseSubjectValidationSchema.updateCouseSubjectValidationSchema
  ),
  courseSubjectController.updateCouseSubject
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  courseSubjectController.deleteCourseSubject
);

export const courseSubjectRoute = router;
