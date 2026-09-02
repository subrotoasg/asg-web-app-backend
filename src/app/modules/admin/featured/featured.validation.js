import z from "zod";
const uuidArray = z.array(z.string().uuid("Invalid UUID"));

const createCourseFeatureValidation = z.object({
  body: z
    .object({
      //  //new added v1 start
      // courseId: z
      //   .string({
      //     required_error: "courseId is required!",
      //     invalid_type_error: "courseId must be a string",
      //   })
      //   .uuid({ message: "courseId must be a uuid" })
      //   .optional(),
      // cycleId: z
      //   .string({
      //     required_error: "cycleId is required!",
      //     invalid_type_error: "cycleId must be a string",
      //   })
      //   .uuid({ message: "cycleId must be a uuid" })
      //   .optional(),
      // //new added v1 end

      //new added v2
      course: uuidArray.optional(),
      cycle: uuidArray.optional(),
      //new added v2 end

      type: z.string().min(1, "define a type").optional(),
      title: z.string({
        required_error: "title is required!",
        invalid_type_error: "feature title must be a string",
      }),
      description: z
        .string()
        .min(2, "description can't be that short!")
        .optional(),
      url: z
        .string({
          required_error: "featured url required",
        })
        .optional(),
      productId: z
        .string({
          required_error: "productId is required for purchase type featured",
        })
        .optional(),
    }) //new added
    .superRefine((data, ctx) => {
      const courseLength = data.course?.length ?? 0;
      const cycleLength = data.cycle?.length ?? 0;

      if (courseLength === 0 && cycleLength === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["course"],
          message: "Either course or cycle must contain at least one ID",
        });

        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cycle"],
          message: "Either course or cycle must contain at least one ID",
        });
      }
    }),
});

const updateCourseFeatureValidation = z.object({
  title: z.string().min(2, "title can't be empty").optional(),
  description: z.string().min(3, "description can't be that short!").optional(),
  url: z.string().min(1, "url can't be that short!").optional(),
  image: z.string().min(2, "image can't be that short!").optional(),
  coupne: z.string().min(1, "coupne can't be that short!").optional(),
  type: z.string().min(1, "give a type").optional(),
  startTime: z.string().min(1, "give start time").optional(),
  endTime: z.string().min(1, "give endTime").optional(),
  serial: z
    .number()
    .int("Serial must be an integer")
    .positive("Serial must be greater than 0")
    .optional(),
});

export const featuredValidationSchema = {
  createCourseFeatureValidation,
  updateCourseFeatureValidation,
};
