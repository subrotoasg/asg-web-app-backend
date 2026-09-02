import { z } from "zod";

const createSubjectValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(100, "Title must be at most 100 characters long")
      .trim(),
    subjectImage: z.string().optional(),
  }),
});

//update Subject Schema
const updateSubjectValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(100, "Title must be at most 100 characters long")
      .trim()
      .optional(),
  }),
});

export const SubjectValidationSchema = {
  createSubjectValidationSchema,
  updateSubjectValidationSchema,
};
