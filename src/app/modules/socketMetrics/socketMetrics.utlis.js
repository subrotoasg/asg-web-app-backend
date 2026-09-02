import { StatusCodes } from "http-status-codes";

import AppErrors from "../../../errors/AppErrors.js";

import config from "../../config/index.js";

export const metricsTokenBypass = (authorizeMiddleware) => {
  return (req, res, next) => {
    const token = req?.headers?.["x-metrics-token"];

    const expected = config.metrics_token;

    if (!token) {
      return authorizeMiddleware(req, res, next);
    }

    if (!expected) {
      throw new AppErrors(
        StatusCodes.UNAUTHORIZED,
        "Metrics token is not configured",
      );
    }

    if (token !== expected) {
      throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid metrics token");
    }

    return next();
  };
};
