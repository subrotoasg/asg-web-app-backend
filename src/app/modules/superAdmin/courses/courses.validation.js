import { z } from "zod";

const createCourseValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(100, "Title must be at most 100 characters long")
      .trim(),
    cycleAvailable: z.boolean().default(false).optional(),
    courseImage: z.string().optional(),
  }),
});

//update Course Schema
const updateCourseValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(100, "Title must be at most 100 characters long")
      .trim()
      .optional(),
    cycleAvailable: z.boolean().default(false).optional(),
    courseImage: z.string().optional(),
    markAsArchieve: z.string().optional(),
    archieveCourseId: z.string().optional(),
  }),
});

const cloneCourseValidationSchema = z.object({
  body: z.object({
    productName: z
      .string({ required_error: "productName can be given" })
      .optional(),
    productFullName: z
      .string({
        required_error: "product Full Name can be given",
      })
      .optional(),
    courseOrCycleId: z.string({
      required_error: "course or cycle id required for cloneing",
    }),
    type: z.string({
      required_error: "type course/cycle required",
    }),
  }),
});

const setAactiveBillerValidationSchema = z.object({
  body: z.object({
    // courseId: z.string({ required_error: "course id is required" }),
    ownerCourseId: z.string({ required_error: "owner course Id required" }),
  }),
});

export const courseValidationSchema = {
  createCourseValidationSchema,
  updateCourseValidationSchema,
  cloneCourseValidationSchema,
  setAactiveBillerValidationSchema,
};
