import { Router } from "express";
import { CycleController } from "./cycle.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { CycleValidationSchema } from "./cycle.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  CycleController.GetAllCycle,
);

router.get("/get-all/archive-cycles", CycleController.getAllArchiveCycles);

router.get(
  "/get-all/archive-cycles/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleController.getArchiveCycleByCycleId,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleController.GetSingleCycle,
);

router.get(
  "/course/:id",
  // authorizationMiddleware.authorize(["superAdmin", "admin"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  CycleController.GetAllCyclebyCourseId,
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(CycleValidationSchema.createCycleValidationSchema),
  CycleController.createCycle,
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin"]),
  handleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(CycleValidationSchema.updateCycleValidationSchema),
  CycleController.updateCycle,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleController.deleteCycle,
);

router.get(
  "/get/cycle/content/download/:cycleId",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CycleController.downloadCycleContent,
);

router.get(
  "/get/cycle/students/info/:cycleId",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  CycleController.getCycleStudentsInfoLink,
);

router.get("/download/student/info/:cycleId", CycleController.downloadTheFile);

export const CycleRoute = router;
