import { Router } from "express";
import { LiveClassController } from "./liveClass.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { LiveClassValidationSchema } from "./liveClass.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { signUpRouteIpLimiter } from "../../../../helper/rateLimit.js";
const router = Router();

router.get(
  "/",
  // authorizationMiddleware.authorize([
  //   Enums.roles.ADMIN,
  //   Enums.roles.SUPERADMIN,
  //   Enums.roles.STUDENT,
  // ]),
  signUpRouteIpLimiter,
  LiveClassController.GetAllLiveClass,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  LiveClassController.GetSingleLiveClass,
);

//uploading class
router.get(
  "/uploading/:id", //course subject chapter id
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  LiveClassController.processingRecordedClass,
);

//join live class
router.get(
  "/join/class/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  LiveClassController.joinLiveClass,
);

//join flow live class
router.get(
  "/flow/join/class/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  LiveClassController.joinFlowLiveClass,
);

//join live class for cycle
router.get(
  "/cycle/join/class/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCycle,
  LiveClassController.joinLiveClass,
);

//join flow live cycle class
router.get(
  "/flow/cycle/join/class/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  LiveClassController.joinFlowLiveClass,
);

router.patch("/status/change", LiveClassController.updateLiveClassStatusIntoDb);

router.post(
  "/flow/webhook",
  LiveClassController.updateFlowLiveClassStatusIntoDb,
);

//bunny webhooks update status
router.post(
  "/bunny/status/change",
  LiveClassController.updateBunnyLiveClassVideoStatus,
);

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(LiveClassValidationSchema.createLiveClassValidationSchema),
  LiveClassController.createLiveClass,
);

router.post(
  "/flow",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    LiveClassValidationSchema.createLiveClassToFlowValidationSchema,
  ),
  LiveClassController.createLiveClassToFlow,
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(LiveClassValidationSchema.updateLiveClassValidationSchema),
  LiveClassController.updateLiveClass,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  LiveClassController.deleteLiveClass,
);

router.get(
  "/room/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
    Enums.roles.STUDENT,
  ]),
  LiveClassController.liveCommentAndPollController,
);
router.get(
  "/session/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
    Enums.roles.STUDENT,
  ]),
  LiveClassController.allSessionDataController,
);

router.get(
  "/session/info/:id",
  LiveClassController.teachmentAutometicSessionDataController,
);

export const LiveClassRoute = router;
