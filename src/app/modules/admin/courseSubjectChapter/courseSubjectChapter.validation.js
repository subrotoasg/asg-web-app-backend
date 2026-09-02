import { z } from "zod";

const createCourseSubjectValidationSchema = z.object({
  body: z.object({
    courseSubjectId: z
      .string()
      .min(1, "course is required.")
      .uuid("Invalid courseId format, must be a valid UUID."),
    chapterId: z
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

const updateCouseSubjectChapterValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters long")
      .max(100, "Title must be at most 100 characters long")
      .trim()
      .optional(),
    courseSubjectChapterImage: z.string().optional(),
    serial: z
      .number()
      .int("Serial must be an integer")
      .positive("Serial must be greater than 0")
      .optional(),
  }),
});

export const courseSubjectChapterValidationSchema = {
  createCourseSubjectValidationSchema,
  updateCouseSubjectChapterValidationSchema,
};
