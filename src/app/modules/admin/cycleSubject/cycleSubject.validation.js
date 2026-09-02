import { z } from "zod";

const createCycleSubjectValidationSchema = z.object({
  body: z.object({
    cycleId: z
      .string({
        required_error: "cycleId is required",
        invalid_type_error: "cycleId must be a string",
      })
      .uuid({ message: "cycleId must be a valid UUID" }),
    subjectId: z
      .array(
        z
          .string({
            required_error: "Each subjectId must be a string",
            invalid_type_error: "Each subjectId must be a string",
          })
          .uuid({ message: "Each subjectId must be a valid UUID" }),
        {
          required_error: "subjectId is required",
          invalid_type_error: "subjectId must be an array of strings",
        },
      )
      .min(1, { message: "subjectId must contain at least one item" }),
  }),
});

//update CycleSubject Schema
const updateCycleSubjectValidationSchema = z.object({
  body: z.object({
    cycleSubjectImage: z
      .string()
      .min(3, "image url can't be that short")
      .optional(),
    title: z.string().min(1, "title can't be null").optional(),
    serial: z
      .number()
      .int("Serial must be an integer")
      .positive("Serial must be greater than 0")
      .optional(),
  }),
});

export const CycleSubjectValidationSchema = {
  createCycleSubjectValidationSchema,
  updateCycleSubjectValidationSchema,
};
