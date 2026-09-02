import { z } from "zod";

const createCycleChapterValidationSchema = z.object({
  body: z.object({
    cycleSubjectId: z
      .string({
        required_error: "cycle Subject Id is required",
        invalid_type_error: "cycle Subject Id must be a string",
      })
      .uuid({ message: "cycle Subject Id must be a valid UUID" }),

    chapterId: z
      .array(
        z
          .string({
            required_error: "Each chapter Id must be a string",
            invalid_type_error: "Each chapter Id must be a string",
          })
          .uuid({ message: "Each chapter Id must be a valid UUID" }),
      )
      .min(1, { message: "At least one chapter Id is required" }),

    title: z.string().min(1, "title can't be empty").optional(),
  }),
});

//update CycleChapter Schema
const updateCycleChapterValidationSchema = z.object({
  body: z.object({
    chapterId: z
      .string({
        required_error: "Each chapter Id must be a string",
        invalid_type_error: "Each chapter Id must be a string",
      })
      .uuid({ message: "Each chapter Id must be a valid UUID" })
      .min(1, { message: "At least one chapter Id is required" })
      .optional(),

    cycleSubjectChapterImage: z
      .string()
      .min(1, "image url can't be short")
      .optional(),

    title: z.string().min(1, "title can't be empty").optional(),
    serial: z
      .number()
      .int("Serial must be an integer")
      .positive("Serial must be greater than 0")
      .optional(),
  }),
});

export const CycleChapterValidationSchema = {
  createCycleChapterValidationSchema,
  updateCycleChapterValidationSchema,
};
