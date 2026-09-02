import { z } from "zod";

const createNotesValidationSchema = z.object({
  body: z
    .object({
      note: z
        .string({
          required_error: "Note text is required",
          invalid_type_error: "Note must be a string",
        })
        .min(1, "Note cannot be empty"),

      classContentId: z
        .string({
          invalid_type_error: "classContentId must be a valid UUID",
        })
        .uuid("classContentId must be a valid UUID")
        .optional(),

      cycleContentId: z
        .string({
          invalid_type_error: "cycleContentId must be a valid UUID",
        })
        .uuid("cycleContentId must be a valid UUID")
        .optional(),
    })
    .refine((data) => data.classContentId || data.cycleContentId, {
      message: "Either classContentId or cycleContentId is required",
    }),
});

//update Notes Schema
const updateNotesValidationSchema = z.object({
  body: z.object({
    note: z
      .string({
        invalid_type_error: "Note must be a string",
      })
      .min(1, "Note cannot be empty")
      .optional(),
  }),
});

export const NotesValidationSchema = {
  createNotesValidationSchema,
  updateNotesValidationSchema,
};
