import { Router } from "express";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { issueTrackController } from "./issueTrack.controller.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { issueTrackValidationSchema } from "./issueTrack.validation.js";
import {
  handleFileUpload,
  handleMultipuleFileUpload,
} from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";

const router = Router();

router.post(
  "/add/tags",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    issueTrackValidationSchema.createNewIssueTagValidationSchema,
  ),
  issueTrackController.addNewIssueTag,
);

router.get(
  "/get/tags",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  issueTrackController.getIssueTags,
);

router.patch(
  "/update/tags/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(issueTrackValidationSchema.updateIssueTagsValidationSchema),
  issueTrackController.updateIssueTags,
);

router.post(
  "/add/issue/priority",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    issueTrackValidationSchema.createNewIssuePriorityValidationSchema,
  ),
  issueTrackController.addNewIssuePriority,
);

router.get(
  "/get/priorities",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  issueTrackController.getIssuePriorities,
);

router.patch(
  "/update/priority/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    issueTrackValidationSchema.updateIssuePriorityValidationSchema,
  ),
  issueTrackController.updateIssuePriority,
);

router.post(
  "/post/new/issue",
  authorizationMiddleware.authorize([Enums.roles.ADMIN]),
  handleMultipuleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(issueTrackValidationSchema.createNewIssueValidationSchema),
  issueTrackController.postNewIssue,
);

router.get(
  "/get/issues",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  issueTrackController.getAllIssues,
);

router.get(
  "/get/stats",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  issueTrackController.getStats,
);

router.patch(
  "/update/issue/by/admins/:id",
  authorizationMiddleware.authorize([Enums.roles.ADMIN]),
  handleMultipuleFileUpload,
  fileUploader.processFileUploads,
  fileUploader.fileAndDataParser,
  validationRequest(
    issueTrackValidationSchema.updateIssueByAdminValidationSchema,
  ),
  issueTrackController.updateIssueContent,
);

router.patch(
  "/update/issue/:id",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(issueTrackValidationSchema.updateIssueValidationSchema),
  issueTrackController.updateIssue,
);

export const issueRoute = router;
