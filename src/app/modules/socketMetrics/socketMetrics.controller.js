import { StatusCodes } from "http-status-codes";

import { pick } from "../../../helper/pick.js";

import { SocketMetricsServices } from "./socketMetrics.services.js";

import { pickQueryFields, metricsFormats } from "./socketMetrics.constants.js";
import catchAsync from "../../utlis/catchAsync.js";
import sendResponse from "../../utlis/sendResponse.js";

const GetSocketMetrics = catchAsync(async (req, res) => {
  const payloadQuery = req?.query;

  const query = pick(payloadQuery, pickQueryFields);

  if (query?.format === metricsFormats.PROMETHEUS) {
    const text =
      await SocketMetricsServices.getSocketMetricsPrometheusfromRedis();

    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");

    res.setHeader("Cache-Control", "no-store");

    return res.status(StatusCodes.OK).send(text);
  }

  const result = await SocketMetricsServices.getSocketMetricsfromRedis();

  return sendResponse(res, {
    statusCodes: StatusCodes.OK,
    success: true,
    message: "Socket Metrics retrive Successfull",
    data: result,
  });
});

export const SocketMetricsController = {
  GetSocketMetrics,
};
