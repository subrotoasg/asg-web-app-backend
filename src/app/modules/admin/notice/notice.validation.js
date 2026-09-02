import z from "zod";

const createCourseNoticeValidation = z.object({
  body: z.object({
    courseId: z
      .string({
        required_error: "courseId is required!",
        invalid_type_error: "courseId must be a string",
      })
      .uuid({ message: "courseId must be a uuid" })
      .optional(),
    cycleId: z
      .string({
        required_error: "cycleId is required!",
        invalid_type_error: "cycleId must be a string",
      })
      .uuid({ message: "cycleId must be a uuid" })
      .optional(),
    title: z.string({
      required_error: "title is required!",
      invalid_type_error: "notice title must be a string",
    }),
    description: z
      .string()
      .min(2, "description can't be that short!")
      .optional(),
    url: z
      .string({
        required_error: "notice url required",
      })
      .optional(),
    type: z.string().min(1, "define a type").optional(),
  }),
});

const updateCourseNoticeValidation = z.object({
  title: z.string().min(2, "title can't be empty").optional(),
  description: z.string().min(3, "description can't be that short!").optional(),
  url: z.string().min(1, "url can't be that short!").optional(),
  image: z.string().min(2, "image can't be that short!").optional(),
  type: z.string().min(1, "give a type").optional(),
  startTime: z.string().min(1, "give start time").optional(),
  endTime: z.string().min(1, "give endTime").optional(),
});

export const NoticeValidationSchema = {
  createCourseNoticeValidation,
  updateCourseNoticeValidation,
};
