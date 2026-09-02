import { z } from "zod";

const createCycleValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({
        required_error: "courseId is required.",
      })
      .uuid("Invalid courseId format, must be a valid UUID."),
    productId: z.string({
      required_error: "productId is required.",
    }),
    title: z.string({
      required_error: "title is required.",
    }),
  }),
});

//update Cycle Schema
const updateCycleValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: "Title cannot be empty." }).optional(),
    productId: z.string().min(1, "productId can't be empty").optional(),
    cycleImage: z.string().optional(),
    markAsArchieve: z.string().optional(),
    archieveCycleId: z.string().optional(),
  }),
});

export const CycleValidationSchema = {
  createCycleValidationSchema,
  updateCycleValidationSchema,
};
