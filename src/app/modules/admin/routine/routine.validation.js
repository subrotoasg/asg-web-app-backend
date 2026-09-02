import z from "zod";

const createCourseRoutineValidation = z.object({
  body: z.object({
    courseId: z
      .string({
        required_error: "courseId is required!",
        invalid_type_error: "courseId must be a string",
      })
      .uuid({ message: "courseId must be a uuid" }),
    title: z.string({
      required_error: "title is required!",
      invalid_type_error: "feature title must be a string",
    }),
    description: z
      .string()
      .min(2, "description can't be that short!")
      .optional(),
    url: z.string({
      required_error: "featured url required",
    }),
  }),
});

const updateCourseRoutineValidation = z.object({
  title: z.string().min(2, "title can't be empty").optional(),
  description: z.string().min(3, "description can't be that short!").optional(),
  url: z.string().min(1, "url can't be that short!").optional(),
  image: z.string().min(2, "image can't be that short!").optional(),
});

export const RoutineValidationSchema = {
  createCourseRoutineValidation,
  updateCourseRoutineValidation,
};
