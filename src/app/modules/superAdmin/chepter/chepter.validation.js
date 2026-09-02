import { z } from "zod";

// UUID validation schema with custom error message
const uuidSchema = z
  .string()
  .uuid("Invalid UUID format, please provide a valid UUID")
  .min(1, "UUID is required");

// Create Chapter Schema
const createChapterValidationSchema = z.object({
  body: z.object({
    chapterName: z.string().min(1, "Chapter name is required"),
    chapterNo: z.string().optional(),
    subjectId: uuidSchema, // Custom error message for UUID
    chapterImage: z.string().optional(), // Optional field
  }),
});

// Update Chapter Schema (Allows Partial Update)
const updateChapterValidationSchema = z.object({
  body: z.object({
    chapterName: z.string().min(1).optional(),
    chapterNo: z.string().optional(),
    subjectId: uuidSchema.optional(), // Custom error message for UUID
    chapterImage: z.string().optional(),
  }),
});

export const ChepterValidationSchema = {
  createChapterValidationSchema,
  updateChapterValidationSchema,
};
