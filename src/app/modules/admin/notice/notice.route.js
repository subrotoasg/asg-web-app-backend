import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { NoticeValidationSchema } from "./notice.validation.js";
import { NoticeController } from "./notice.controller.js";

const router = Router();

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(NoticeValidationSchema.createCourseNoticeValidation),
  NoticeController.createNotice,
);

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  NoticeController.getAllNoticeByCourseId,
);

router.get(
  "/all/course-cycle/notice/:id",
  NoticeController.getAllNoticeByCourseId,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  NoticeController.getOneById,
);

router.get(
  "/cycle/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  NoticeController.getAllNoticeByCycleId,
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(NoticeValidationSchema.updateCourseNoticeValidation),
  NoticeController.updateNotice,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  NoticeController.deleteNotice,
);

export const CourseNoticeRoute = router;
