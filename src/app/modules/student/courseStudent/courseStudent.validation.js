import { z } from "zod";

const courseRedeemValidationSchema = z.object({
  body: z.object({
    accessCode: z
      .string({ required_error: "access code needed to redeem course." })
      .trim(),
  }),
});

const uuidArray = z.array(z.string().uuid("Invalid UUID"));

export const manuallyCourseAccessValidationSchema = z.object({
  body: z
    .object({
      id: z.string().uuid("id must be a valid UUID"),

      course: uuidArray.optional(),

      cycle: uuidArray.optional(),
    })
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

export const courseStudentValidationSchema = {
  courseRedeemValidationSchema,
  manuallyCourseAccessValidationSchema,
};
