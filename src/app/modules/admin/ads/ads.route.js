import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { adsValidationSchema } from "./ads.validation.js";
import { adsController } from "./ads.controller.js";

const router = Router();

const { SUPERADMIN, ADMIN, STUDENT } = Enums.roles;

/* ---------- প্লেয়ার (স্টুডেন্ট + অ্যাডমিন প্রিভিউ) ---------- */

// GET /ads/serve?contextScope=CLASS_CONTENT&contextId=<uuid>
router.get(
  "/serve",
  authorizationMiddleware.authorize([STUDENT, ADMIN, SUPERADMIN]),
  adsController.serveAds,
);

// POST /ads/track  — impression / complete / skip / click
router.post(
  "/track",
  authorizationMiddleware.authorize([STUDENT, ADMIN, SUPERADMIN]),
  validationRequest(adsValidationSchema.trackEventValidation),
  adsController.trackAdEvent,
);

/* ---------- অ্যাডমিন প্যানেল ---------- */

// GET /ads/running?courseId=&cycleId=  — এখন কোথায় কী চলছে
router.get(
  "/running",
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  adsController.getRunningAds,
);

// GET /ads
router.get(
  "/",
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  adsController.getAllAds,
);

// GET /ads/:id
router.get(
  "/:id",
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  adsController.getAdById,
);

// POST /ads
router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  fileUploader.processFileUploads,
  validationRequest(adsValidationSchema.createAdValidation),
  adsController.createAd,
);

// PATCH /ads/:id
router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  fileUploader.processFileUploads,
  validationRequest(adsValidationSchema.updateAdValidation),
  adsController.updateAd,
);

// PATCH /ads/:id/status — ট্যাব থেকে চালু/বন্ধ করার জন্য আলাদা, হালকা রুট
router.patch(
  "/:id/status",
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  validationRequest(adsValidationSchema.updateStatusValidation),
  adsController.updateAdStatus,
);

// DELETE /ads/:id  — soft delete
router.delete(
  "/:id",
  authorizationMiddleware.authorize([SUPERADMIN, ADMIN]),
  adsController.deleteAd,
);

export const AdsRoute = router;
