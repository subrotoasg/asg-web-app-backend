import { Router } from "express";
const router = Router();
import validationRequest from "../../middleware/validationRequest.js";
import { checkEligibilityController } from "./checkEligibility.controller.js";
import { checkEligibilityValidationSchema } from "./checkEligibility.validation.js";

router.post(
  "/",
  validationRequest(
    checkEligibilityValidationSchema.createcheckEligibilityValidationSchema,
  ),
  checkEligibilityController.GetAllcheckEligibility,
);

router.get("/all", checkEligibilityController.GetAllUniversityInfo);

router.get("/:id", checkEligibilityController.GetSinglecheckEligibility);

router.post(
  "/ssc-hsc/result",
  validationRequest(
    checkEligibilityValidationSchema.getBoardResultsValidationSchema,
  ),
  checkEligibilityController.GetBoardResult,
);

router.get("/hsc/routine", checkEligibilityController.GetHscRoutine);

export const checkEligibilityRoute = router;
