import { z } from "zod";

const createQuoraValidationSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: "Some type of description is nescessary." })
      .min(3, "question description is too short"),
    courseId: z
      .string({ required_error: "please select related courese" })
      .uuid("Invalid UUID format for ID"),
    subject: z.string({
      required_error: "subject name is required",
    }),
    topic: z.string().optional(),
  }),
});

const answerToQuoraValidationSchema = z.object({
  body: z.object({}),
});

const commentOnAnswerValidationSchema = z.object({
  body: z.object({
    comments: z
      .string({
        required_error: "please ask properly",
      })
      .min(5, "too short comment"),
  }),
});

export const QuoraValidationSchema = {
  createQuoraValidationSchema,
  answerToQuoraValidationSchema,
  commentOnAnswerValidationSchema,
};
