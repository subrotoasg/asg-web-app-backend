import { Router } from "express";
import { handleFileUpload } from "../../../middleware/handleFileUpload.js";
import { fileUploader } from "../../../../shared/fileUploader.js";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { featuredValidationSchema } from "./featured.validation.js";
import { featuredController } from "./featured.controller.js";
const router = Router();

router.post(
  "/",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  // authorizationMiddleware.authorize(["superAdmin", "admin"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(featuredValidationSchema.createCourseFeatureValidation),
  featuredController.createFeatured,
);

router.get(
  "/all/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  featuredController.getAllFeaturedByCourseId,
);

router.get(
  "/all/course-cycle/:id",
  featuredController.getAllFeaturedByCourseId,
);

router.get(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  featuredController.getOneById,
);

router.get(
  "/cycle/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin", "student"]),
  // authorizationMiddleware.authorizeEveryoneForCourses,
  authorizationMiddleware.authorizeEveryoneForCycle,
  featuredController.getAllFeaturedByCycleId,
);

router.patch(
  "/:id",
  handleFileUpload,
  fileUploader.fileAndDataParser,
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  fileUploader.processFileUploads,
  validationRequest(featuredValidationSchema.updateCourseFeatureValidation),
  featuredController.updateFeatured,
);

router.delete(
  "/:id",
  authorizationMiddleware.authorize(["superAdmin", "admin"]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  featuredController.deleteFeatured,
);

export const CourseFeaturedRoute = router;
