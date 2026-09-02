import { z } from "zod";

const createCreditModelValidationSchema = z.object({
  body: z.object({
    perQuoraCredit: z
      .number()
      .int({ message: "per question credit must be an integer" })
      .min(0, { message: "per question cannot be negative" }),
    asgshop: z
      .number()
      .int({ message: "asgshop per question credit must be an integer" })
      .min(0, { message: "asgshop credit cannot be negative" }),
    solver: z
      .number()
      .int({ message: "solver per question credit must be an integer" })
      .min(0, { message: "solver credit cannot be negative" }),
  }),
});

export const creditModelValidationSchema = {
  createCreditModelValidationSchema,
};
