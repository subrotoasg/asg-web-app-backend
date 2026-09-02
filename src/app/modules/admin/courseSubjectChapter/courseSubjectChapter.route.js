import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { courseSubjectChapterValidationSchema } from "./courseSubjectChapter.validation.js";
import { courseSubjectChapterController } from "./courseSubjectChapter.controller.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  courseSubjectChapterController.getAllCourseSubjectChapter
);

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  courseSubjectChapterController.getAllSubjectChapterByCourse
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  courseSubjectChapterController.getCourseSubjectChapterById
);

router.get(
  "/course-subject/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  courseSubjectChapterController.getAllChaptersByCourseSubjectId
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    courseSubjectChapterValidationSchema.createCourseSubjectValidationSchema
  ),
  courseSubjectChapterController.courseSubjectChapterCreate
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    courseSubjectChapterValidationSchema.updateCouseSubjectChapterValidationSchema
  ),
  courseSubjectChapterController.updateCourseSubjectChapter
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  courseSubjectChapterController.deleteCourseSubjectChapter
);

export const courseSubjectChapterRoute = router;
