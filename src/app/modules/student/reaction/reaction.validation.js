import { z } from "zod";

const ReactionTypeObj = {
  LIKE: "LIKE",
  LOVE: "LOVE",
  CARE: "CARE",
  HAHA: "HAHA",
  WOW: "WOW",
  SAD: "SAD",
  ANGRY: "ANGRY",
};

export const createReactionValidationSchema = z.object({
  body: z
    .object({
      reactionType: z.enum(Object.values(ReactionTypeObj), {
        required_error: "Reaction type is required",
        invalid_type_error: "Invalid reaction type",
      }),

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
      path: ["classContentId"],
    }),
});

//update Reaction Schema
const updateReactionValidationSchema = z.object({
  body: z
    .object({
      reactionType: z.enum(Object.values(ReactionTypeObj), {
        required_error: "Reaction type is required",
        invalid_type_error: "Invalid reaction type",
      }),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const ReactionValidationSchema = {
  createReactionValidationSchema,
  updateReactionValidationSchema,
};
