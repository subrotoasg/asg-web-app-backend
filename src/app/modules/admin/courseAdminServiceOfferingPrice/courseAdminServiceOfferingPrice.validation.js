import { z } from "zod";

const priceTypeEnum = z.enum([
  "FIXED",
  "ONE_TIME",
  "MONTHLY",
  "YEARLY",
  "PER_STUDENT",
  "PER_CLASS",
  "PER_COURSE",
  "PER_MB",
  "PER_GB",
  "PER_TB",
  "BANDWIDTH",
  "PER_HOUR",
  "PER_MINUTE",
  "PER_API_CALL",
  "PER_USER",
  "CUSTOM",
]);

export const createCourseAdminOfferPriseValidationSchema = z.object({
  body: z
    .object({
      offeringId: z
        .string()
        .uuid({ message: "Invalid offeringId. Must be a valid UUID." }),

      type: priceTypeEnum,

      amount: z
        .number({
          required_error: "Amount is required",
          invalid_type_error: "Amount must be a number",
        })
        .int("Amount must be an integer")
        .positive("Amount must be greater than 0"),

      currency: z
        .string()
        .length(3, "Currency must be a 3-letter ISO code")
        .default("BDT"),

      minQty: z
        .number()
        .int("minQty must be an integer")
        .positive("minQty must be greater than 0")
        .nullable()
        .optional(),

      maxQty: z
        .number()
        .int("maxQty must be an integer")
        .positive("maxQty must be greater than 0")
        .nullable()
        .optional(),

      note: z.string().max(255).optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.minQty != null &&
        data.maxQty != null &&
        data.minQty > data.maxQty
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQty cannot be greater than maxQty",
          path: ["minQty"],
        });
      }

      // Require quantity for PER_STUDENT / PER_CLASS
      if (
        (data.type === "PER_STUDENT" || data.type === "PER_CLASS") &&
        (data.minQty == null || data.maxQty == null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "minQty and maxQty are required for PER_STUDENT and PER_CLASS pricing",
          path: ["minQty"],
        });
      }
    }),
});

//update CourseAdminOfferPrise Schema
export const updateCourseAdminOfferPriseValidationSchema = z.object({
  body: z
    .object({
      offeringId: z.string().uuid().optional(),

      type: priceTypeEnum.optional(),

      amount: z
        .number()
        .int("Amount must be an integer")
        .positive("Amount must be greater than 0")
        .optional(),

      currency: z.string().length(3).optional(),

      minQty: z
        .number()
        .int("minQty must be an integer")
        .positive("minQty must be greater than 0")
        .nullable()
        .optional(),

      maxQty: z
        .number()
        .int("maxQty must be an integer")
        .positive("maxQty must be greater than 0")
        .nullable()
        .optional(),

      note: z.string().max(255).optional(),
    })
    .superRefine((data, ctx) => {
      // minQty <= maxQty
      if (
        data.minQty != null &&
        data.maxQty != null &&
        data.minQty > data.maxQty
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minQty cannot be greater than maxQty",
          path: ["minQty"],
        });
      }

      // If quantity based type
      if (
        data.type &&
        (data.type === "PER_STUDENT" || data.type === "PER_CLASS")
      ) {
        if (data.minQty == null || data.maxQty == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "minQty and maxQty are required for PER_STUDENT and PER_CLASS",
            path: ["minQty"],
          });
        }
      }
    }),
});

export const CourseAdminOfferPriseValidationSchema = {
  createCourseAdminOfferPriseValidationSchema,
  updateCourseAdminOfferPriseValidationSchema,
};
