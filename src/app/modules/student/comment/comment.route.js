import { Router } from "express";
import { CommentController } from "./comment.controller.js";
import { CommentValidationSchema } from "./comment.validation.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import {
  checkRestriction,
  RestrictionType,
} from "../../../middleware/studentRestriction.js";

const router = Router();

router.get(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  CommentController.GetAllComment,
);

router.get(
  "/:id", //classContentId
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  CommentController.GetSingleComment,
);

router.post(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(CommentValidationSchema.createCommentValidationSchema),
  checkRestriction(RestrictionType.MEDIA_COMMENT),
  CommentController.createComment,
);

router.post(
  "/replay",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(CommentValidationSchema.replayCommentValidationSchema),
  checkRestriction(RestrictionType.MEDIA_COMMENT),
  CommentController.replyToComment,
);

router.patch(
  "/:id", //commentId
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(CommentValidationSchema.updateCommentValidationSchema),
  CommentController.updateComment,
);

router.delete(
  "/:id", //commentId
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  CommentController.deleteComment,
);

export const CommentRoute = router;
