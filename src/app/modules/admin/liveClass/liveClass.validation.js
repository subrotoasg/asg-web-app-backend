import { z } from "zod";

const uuid = z.string().uuid({ message: "Invalid UUID" });
// const isoDate = z.string().datetime({
//   offset: true,
//   message: "Must be ISO 8601 with timezone (e.g. 2025-08-15T14:00:00Z)",
// });

//Create Live Class Validation
const createLiveClassValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "title is required" })
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long"),
    description: z
      .string({ required_error: "description is required" })
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long"),
    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),
    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),
    startTime: z.string(),
    instructor: z
      .string({ required_error: "instructor is required" })
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long"),
    practiceSheet: z.string().url("invalid practiceSheet url").optional(),
    solutionSheet: z.string().url("invalid solutionSheet url").optional(),
    slidesUrl: z.string().url("invalid slides url").optional(),
    classNumber: z
      .string({ invalid_type_error: "Only String is required" })
      .optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
  }),
});

const createLiveClassToFlowValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "title is required" })
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long"),
    description: z
      .string({ required_error: "description is required" })
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long"),
    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),
    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),
    startTime: z.string(),
    instructor: z
      .string({ required_error: "instructor is required" })
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long"),
    practiceSheet: z.string().url("invalid practiceSheet url").optional(),
    solutionSheet: z.string().url("invalid solutionSheet url").optional(),
    slidesUrl: z.string().url("invalid slides url").optional(),
    classNumber: z
      .string({ invalid_type_error: "Only String is required" })
      .optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
    webhook: z.string().optional(),
    sessionType: z.string().optional(),
    //enableDrmForRecording: later can add if provide multiple things.
  }),
});

//update LiveClass Schema
const updateLiveClassValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long")
      .optional(),

    description: z
      .string()
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long")
      .optional(),

    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),

    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),

    startTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "startTime must be a valid date",
      })
      .optional(),

    instructor: z
      .string()
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long")
      .optional(),

    practiceSheet: z
      .string()
      .url("practiceSheet must be a valid URL")
      .optional(),
    solutionSheet: z
      .string()
      .url("solutionSheet must be a valid URL")
      .optional(),
    slidesUrl: z.string().url("slidesUrl must be a valid URL").optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
  }),
});

export const LiveClassValidationSchema = {
  createLiveClassValidationSchema,
  updateLiveClassValidationSchema,
  createLiveClassToFlowValidationSchema,
};
