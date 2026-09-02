import { z } from "zod";

const createcourseQuoraDailyLimitValidationSchema = z.object({
  body: z.object({
    dailyLimit: z
      .number()
      .int({ message: "dailyLimit must be an integer" })
      .min(0, { message: "dailyLimit cannot be negative" }),
    courseId: z
      .string({ required_error: "please select related courese" })
      .uuid("Invalid UUID format for ID"),
  }),
});

const updateCourseQuoraDailyLimitValidationSchema = z.object({
  body: z.object({
    dailyLimit: z
      .number()
      .int({ message: "dailyLimit must be an integer" })
      .min(0, { message: "dailyLimit cannot be negative" }),
  }),
});

export const courseQuoraDailyLimitValidationSchema = {
  createcourseQuoraDailyLimitValidationSchema,
  updateCourseQuoraDailyLimitValidationSchema,
};
