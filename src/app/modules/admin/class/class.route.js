import { Router } from "express";
import { ClassController } from "./class.controller.js";
import {
  handleFileUpload,
  handleMultipuleFileUpload,
} from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { ClassValidationSchema } from "./class.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetAllClass,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetSingleClass,
);

router.get(
  "/download/video/:id",
  authorizationMiddleware.authorize(["student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetClassDownloadMetaData,
);

router.get(
  "/download/video/v2/:id",
  authorizationMiddleware.authorize(["student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetClassDownloadMetaDataV2,
);

router.get(
  "/all/videos/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetClassByCourseSubjectChapter,
);

router.get(
  "/all-info/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.GetEveryThingAboutClassByCourseId,
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(ClassValidationSchema.createClassValidationSchema),
  ClassController.createClass,
);

router.patch(
  "/:id",
  handleMultipuleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(ClassValidationSchema.updateClassValidationSchema),
  ClassController.updateClass,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  ClassController.deleteClass,
);

router.post(
  "/add-content",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(ClassValidationSchema.createClassWholeValidationSchema),
  ClassController.GodClass,
);

//user authentication based class
router.get(
  "/token/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  ClassController.getSinglAuthenticationTokenBasedClassController,
);

//bunny video statistics
router.get(
  "/bunny/video/statistics/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  ClassController.getBunnyVideoStatistics,
);

router.post(
  "/content-to-course-info",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
  ]),
  validationRequest(ClassValidationSchema.contentToCourseInfoSchema),
  ClassController.getContentToCourseInfo,
);
export const ClassRoute = router;
