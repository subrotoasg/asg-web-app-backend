import { Router } from "express";
const router = Router();
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { NotesController } from "./notes.controller.js";
import { NotesValidationSchema } from "./notes.validation.js";

router.get(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  NotesController.GetAllNotes
);

router.get(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  NotesController.GetSingleNotes
);

router.post(
  "/",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(NotesValidationSchema.createNotesValidationSchema),
  NotesController.createNotes
);

router.patch(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  validationRequest(NotesValidationSchema.updateNotesValidationSchema),
  NotesController.updateNotes
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize([
    Enums.roles.STUDENT,
    Enums.roles.ADMIN,
    Enums.roles.SUPERADMIN,
  ]),
  NotesController.deleteNotes
);

router.get(
  "/download/me/:id",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  NotesController.downloadNotesController
);

export const NotesRoute = router;
