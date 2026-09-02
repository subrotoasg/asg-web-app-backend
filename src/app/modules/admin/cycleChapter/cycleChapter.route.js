import { Router } from "express";
import { CycleChapterController } from "./cycleChapter.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { CycleChapterValidationSchema } from "./cycleChapter.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";

const router = Router();

// router.get(
//   "/all/:id",
//   authorizationMiddleware.authorize(["superAdmin", "admin"]),
//   authorizationMiddleware.authorizeEveryoneForCourses,
//   CycleChapterController.GetAllInfoByCourseId
// );

router.get(
  "/get-all-by-cycleId/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  CycleChapterController.GetAllSubjectChapterByCycle,
);

//get single cycle subject chapter by id
router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleChapterController.GetSingleCycleChapter,
);

//get all chapters by cycle Subject id
router.get(
  "/chapters/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  CycleChapterController.GetChapterBasedOnSubjectId,
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
  validationRequest(
    CycleChapterValidationSchema.createCycleChapterValidationSchema,
  ),
  CycleChapterController.createCycleChapter,
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    CycleChapterValidationSchema.updateCycleChapterValidationSchema,
  ),
  CycleChapterController.updateCycleChapter,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  CycleChapterController.deleteCycleChapter,
);

export const CycleChapterRoute = router;
