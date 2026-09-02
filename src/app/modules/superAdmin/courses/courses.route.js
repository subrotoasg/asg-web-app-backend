import { Router } from "express";
import { coursesController } from "./courses.controller.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { courseValidationSchema } from "./courses.validation.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";

const router = Router();

router.get(
  "/",
  // authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  coursesController.GetAllCourses,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  coursesController.GetSingleCourse,
);

router.get(
  "/get-all/archieve-courses",
  // authorizationMiddleware.authorize(["superAdmin", "admin"]),
  coursesController.GetAllArchieveCourses,
);

router.get(
  "/get-all/archieve-courses/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  coursesController.getArchieveCourseByCourseId,
);

router.post(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(courseValidationSchema.createCourseValidationSchema),
  coursesController.createCourses,
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(courseValidationSchema.updateCourseValidationSchema),
  coursesController.updateCourse,
);

router.get(
  "/get/archive/with/no-biller",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  coursesController.getNoActiveBiller,
);

router.post(
  "/add/active/biller",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(courseValidationSchema.setAactiveBillerValidationSchema),
  coursesController.setActiveBiller,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  coursesController.deleteCourse,
);

router.post(
  "/pull-course",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  coursesController.pullCourse,
);

router.post(
  "/clone-course-or-cycle",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(courseValidationSchema.cloneCourseValidationSchema),
  coursesController.cloneCourseOrCycle,
);

router.post(
  "/detect-content/before/clone-course-or-cycle",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(courseValidationSchema.cloneCourseValidationSchema),
  coursesController.detectContent,
);

router.get(
  "/get-course-stats/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  coursesController.getCourseStats,
);

router.get(
  "/get-course/approval/bill/from/crm/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  coursesController.getCourseApprovalBill,
);

router.get("/stats/for-crm", coursesController.getCourseStatsForCrm);

router.get(
  "/webapp/enroll/stats/for-crm",
  coursesController.getCourseEnrollStatsForCrm,
);

router.get(
  "/get-all-course-stats/bunny",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  coursesController.getAllCourseStats,
);

router.get("/afs/access/count/:productId", coursesController.getAfsAccessCount);

router.get(
  "/get/course/content/download/:courseId",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  coursesController.downloadCourseContent,
);

router.get(
  "/get/course/students/info/:courseId",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  coursesController.getCourseStudentsInfoLink,
);

router.get(
  "/download/student/info/:courseId",
  coursesController.downloadTheFile,
);

export const coursesRoute = router;
