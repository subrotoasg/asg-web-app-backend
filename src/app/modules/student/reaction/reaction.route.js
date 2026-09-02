import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { ReactionValidationSchema } from "./reaction.validation.js";
import { ReactionController } from "./reaction.controller.js";

router.get("/", ReactionController.GetAllReaction);

router.get("/:id", ReactionController.GetSingleReaction);

router.get(
  "/me/:id",
  authorizationMiddleware.authorize([Enums.roles.ADMIN, Enums.roles.STUDENT]),
  ReactionController.GetMySingleReaction
);

router.post(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(ReactionValidationSchema.createReactionValidationSchema),
  ReactionController.createReaction
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(ReactionValidationSchema.updateReactionValidationSchema),
  ReactionController.updateReaction
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.ADMIN,
    Enums.roles.STUDENT,
    Enums.roles.SUPERADMIN,
  ]),
  ReactionController.deleteReaction
);

export const ReactionRoute = router;
