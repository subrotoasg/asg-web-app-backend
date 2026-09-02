import { Router } from "express";
const router = Router();
import { PushMessagingController } from "./pushMessaging.controller.js";
import { PushMessagingValidationSchema } from "./pushMessaging.validation.js";
import { authorizationMiddleware } from "../../../../../middleware/authorization.js";
import { Enums } from "../../../../../constant/enums.js";
import validationRequest from "../../../../../middleware/validationRequest.js";
import { handleFileUpload } from "../../../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../../../shared/fileUploader.js";

//get all notification
router.get(
  "/",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  PushMessagingController.getAllNotificationController,
);

//device registration route
router.post(
  "/register",
  validationRequest(PushMessagingValidationSchema.pushMessigingRegisterSchema),
  PushMessagingController.RegistercreatePushMessagingController,
);

//send all PushMessaging route admin-only
router.post(
  "/send/user",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.ADMIN]),
  fileUploader.processFileUploadsForNotification,
  validationRequest(PushMessagingValidationSchema.pushMessigingUserSendSchema),
  PushMessagingController.sendPushMessagingController,
);

//broadcast admin-only
router.post(
  "/broadcast",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.ADMIN]),
  fileUploader.processFileUploadsForNotification,
  validationRequest(
    PushMessagingValidationSchema.pushMessigingBroadcastCourseSchema,
  ),
  PushMessagingController.broadcastSendPushMessagingController,
);

//broadcast superadmin-only
router.post(
  "/broadcast/all/users",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  fileUploader.processFileUploadsForNotification,
  validationRequest(
    PushMessagingValidationSchema.pushMessigingBroadcastAllUsersSchema,
  ),
  PushMessagingController.broadcastAllUserSendPushMessagingController,
);

//get student and admin notification
router.get(
  "/my-notification",
  authorizationMiddleware.authorize([Enums.roles.STUDENT, Enums.roles.ADMIN]),
  PushMessagingController.getAllStudentNotificationController,
);
router.patch(
  "/update/my-notification",
  authorizationMiddleware.authorize([Enums.roles.STUDENT, Enums.roles.ADMIN]),
  validationRequest(
    PushMessagingValidationSchema.studentNotificationUpdateSchema,
  ),
  PushMessagingController.studentNotificationUpdateController,
);

router.post(
  "/send/single/user",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  fileUploader.processFileUploadsForNotification,
  validationRequest(PushMessagingValidationSchema.singleUserNotificationSchema),
  PushMessagingController.sendSingleUserPushMessagingController,
);

export const PushMessagingRoute = router;
