import { Router } from "express";
import validationRequest from "../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../middleware/authorization.js";
import { Enums } from "../../constant/enums.js";
import { SocketMetricsController } from "./socketMetrics.controller.js";
import { SocketMetricsValidationSchema } from "./socketMetrics.validation.js";
import { metricsTokenBypass } from "./socketMetrics.utlis.js";

const router = Router();

router.get(
  "/",
  // metricsTokenBypass(
  //   authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  // ),
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    SocketMetricsValidationSchema.getSocketMetricsValidationSchema,
  ),
  SocketMetricsController.GetSocketMetrics,
);

export const SocketMetricsRoute = router;
