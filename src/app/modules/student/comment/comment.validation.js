import { z } from "zod";

const createCommentValidationSchema = z.object({
  body: z
    .object({
      comment: z
        .string({
          required_error: "Comment text is required",
          invalid_type_error: "Comment must be a string",
        })
        .min(1, "Comment cannot be empty"),

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
//replay Comment Schema
const replayCommentValidationSchema = z.object({
  body: z
    .object({
      comment: z
        .string({
          required_error: "Comment text is required",
          invalid_type_error: "Comment must be a string",
        })
        .min(1, "Comment cannot be empty"),

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
      parentId: z
        .string({
          invalid_type_error: "parentId must be a valid UUID",
        })
        .uuid("parentId must be a valid UUID")
        .optional(),
    })
    .refine((data) => data.classContentId || data.cycleContentId, {
      message: "Either classContentId or cycleContentId is required",
    }),
});

//update Comment Schema
const updateCommentValidationSchema = z.object({
  body: z.object({
    comment: z
      .string({
        invalid_type_error: "Comment must be a string",
      })
      .min(1, "Comment cannot be empty")
      .optional(),
  }),
});

export const CommentValidationSchema = {
  createCommentValidationSchema,
  updateCommentValidationSchema,
  replayCommentValidationSchema,
};
