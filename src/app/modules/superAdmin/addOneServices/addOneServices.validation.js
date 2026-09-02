import { z } from "zod";

const createAddOneServiceValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "name is required",
        invalid_type_error: "name must be a string",
      })
      .min(1, { message: "name cannot be empty" })
      .max(100, { message: "name must be at most 100 characters" }),

    description: z
      .string({
        invalid_type_error: "description must be a string",
      })
      .min(0, { message: "description cannot be negative length" })
      .max(500, { message: "description must be at most 500 characters" })
      .optional(),
  }),
});

//update AddOneService Schema
const updateAddOneServiceValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "name is required",
        invalid_type_error: "name must be a string",
      })
      .min(1, { message: "name cannot be empty" })
      .max(100, { message: "name must be at most 100 characters" })
      .optional(),

    description: z
      .string({
        invalid_type_error: "description must be a string",
      })
      .min(0, { message: "description cannot be negative length" })
      .max(500, { message: "description must be at most 500 characters" })
      .optional(),
  }),
});

export const AddOneServiceValidationSchema = {
  createAddOneServiceValidationSchema,
  updateAddOneServiceValidationSchema,
};
