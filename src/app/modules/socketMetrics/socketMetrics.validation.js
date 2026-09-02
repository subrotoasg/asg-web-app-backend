import { z } from "zod";

import { metricsFormats } from "./socketMetrics.constants.js";

const getSocketMetricsValidationSchema = z.object({
  body: z.object({
    format: z
      .enum([metricsFormats.JSON, metricsFormats.PROMETHEUS], {
        message: "Format must be either json or prometheus",
      })
      .optional(),
  }),
});

export const SocketMetricsValidationSchema = {
  getSocketMetricsValidationSchema,
};
