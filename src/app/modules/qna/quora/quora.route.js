import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import {
  handleFileUpload,
  handleMultipuleFileUpload,
} from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import { Enums } from "../../../constant/enums.js";
import { QuoraValidationSchema } from "./quora.validation.js";
import { QuoraController } from "./quora.controller.js";
const router = Router();

router.post(
  "/",
  handleMultipuleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(QuoraValidationSchema.createQuoraValidationSchema),
  QuoraController.postNewQuora,
);

router.get("/", QuoraController.getQuoras);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
    Enums.roles.SOLVER,
    Enums.roles.STUDENT,
  ]),
  QuoraController.getQuoraDetails,
);

router.get("/similar/:id", QuoraController.getSimilarSolvedQuoras); //optional for similar quora finding

router.post(
  "/:id",
  handleMultipuleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([
    Enums.roles.SOLVER,
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  fileUploader.processFileUploads,
  QuoraController.postAnswer,
); //answer in the quora

router.post(
  "/mark-as-solve/:id",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  QuoraController.markAsSolved,
);

router.patch(
  "/force/post/duplicate/:id",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  QuoraController.forcePostQuora,
);

router.patch("/upvote/:id", QuoraController.giveUpvotes);

router.patch("/downvote/:id", QuoraController.giveDownvotes);

router.post(
  "/answer/comment/:id",
  handleMultipuleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([Enums.roles.SOLVER, Enums.roles.STUDENT]),
  fileUploader.processFileUploads,
  validationRequest(QuoraValidationSchema.commentOnAnswerValidationSchema),
  QuoraController.commentOnAnswer,
);

router.get(
  "/answer/comment/:id",
  authorizationMiddleware.authorize([Enums.roles.SOLVER, Enums.roles.STUDENT]),
  QuoraController.getAnswerComments,
);

export const QuoraRoute = router;
