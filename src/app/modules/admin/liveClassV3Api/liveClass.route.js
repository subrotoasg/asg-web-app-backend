import { Router } from "express";
import { LiveClassController } from "./liveClass.controller.js";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { LiveClassValidationSchema } from "./liveClass.validation.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
const router = Router();

//create
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

//create Free class Uploader
router.post(
  "/free-class",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(LiveClassValidationSchema.createfreeClassValidationSchema),
  LiveClassController.createFreeClassUploader,
);

//create Live class version 4
router.post(
  "/v4/class/create",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(
    LiveClassValidationSchema.createLiveClassValidationSchemaVersion4,
  ),
  LiveClassController.createLiveClassVersion4Controller,
);

//join live class by course
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

//join live class by cycle
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

//join live class from app by course
router.get(
  "/join/class/token/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  LiveClassController.joinLiveClassFromApp,
);

//join live class from app by cycle
router.get(
  "/cycle/join/class/token/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCycle,
  LiveClassController.joinLiveClassFromApp,
);

//status update
router.post("/status/change", LiveClassController.updateLiveClassStatusIntoDb);

//status update frb
router.post(
  "/status/change/frb",
  LiveClassController.updateLiveClassStatusIntoDb,
);

//delete Room
router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  LiveClassController.deleteLiveClassRoom,
);

router.get(
  "/messages/participants/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  LiveClassController.getParticipantsAndMessagesController,
);
export const LiveClassRouteV3Api = router;
