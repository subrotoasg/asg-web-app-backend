import { z } from "zod";

const PricingTypeEnum = z.enum([
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

const convertToNumber = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return undefined;
    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  }
  if (typeof val === "number") return val;
  return undefined;
};

const stringToBoolean = (val) => {
  if (typeof val === "string") {
    const lowered = val.trim().toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  if (typeof val === "boolean") return val;
  return undefined;
};

const createCourseDefaultServicesPriceValidationSchema = z.object({
  body: z
    .object({
      courseDefaultServiceId: z
        .string({ required_error: "Course is required" })
        .uuid("Invalid courseId format. It must be a valid UUID."),

      type: PricingTypeEnum,

      amount: z.preprocess(
        (val) => {
          if (val === null || val === undefined) return undefined;
          if (typeof val === "string" && val.trim() !== "") return Number(val);
          if (typeof val === "number") return val;
          return undefined;
        },
        z
          .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number",
          })
          .positive("Amount must be greater than 0"),
      ),

      currency: z
        .string({ invalid_type_error: "Currency must be a string" })
        .trim()
        .min(1, "Currency cannot be empty")
        .optional(),

      minQty: z.preprocess(
        convertToNumber,
        z
          .number({ invalid_type_error: "minQty must be a number" })
          .int("minQty must be an integer")
          .min(1, "minQty must be at least 1")
          .optional(),
      ),

      maxQty: z.preprocess(
        convertToNumber,
        z
          .number({ invalid_type_error: "maxQty must be a number" })
          .int("maxQty must be an integer")
          .min(1, "maxQty must be at least 1")
          .optional(),
      ),

      isDefault: z.preprocess(stringToBoolean, z.boolean().optional()),
      isActive: z.preprocess(stringToBoolean, z.boolean().optional()),
      note: z
        .string({ invalid_type_error: "Note must be a string" })
        .trim()
        .optional()
        .nullable(),
    })
    .superRefine((data, ctx) => {
      const hasMin = typeof data.minQty === "number";
      const hasMax = typeof data.maxQty === "number";
      const isPerType = data.type === "PER_STUDENT";

      if (isPerType) {
        if (!hasMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["minQty"],
            message: `minQty is required for ${data.type} pricing`,
          });
        }
        if (!hasMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["maxQty"],
            message: `maxQty is required for ${data.type} pricing`,
          });
        }
      } else if (hasMin !== hasMax) {
        if (hasMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["maxQty"],
            message: "maxQty is required when minQty is provided",
          });
        }
        if (hasMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["minQty"],
            message: "minQty is required when maxQty is provided",
          });
        }
      }

      // ✅ Only validate order when both exist
      if (hasMin && hasMax && data.minQty > data.maxQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minQty"],
          message: "minQty cannot be greater than maxQty",
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxQty"],
          message: "maxQty must be greater than or equal to minQty",
        });
      }

      if (data.isDefault) {
        data.isActive = true;
      }
    }),
});

// ---------------- UPDATE SCHEMA ----------------
const updateCourseDefaultServicesPriceValidationSchema = z.object({
  body: z
    .object({
      courseDefaultServiceId: z
        .string()
        .uuid("Invalid courseId format. It must be a valid UUID.")
        .optional(),
      type: PricingTypeEnum.optional(),
      amount: z.preprocess(
        (val) => {
          if (val === null || val === undefined) return undefined;
          if (typeof val === "string" && val.trim() !== "") return Number(val);
          if (typeof val === "number") return val;
          return undefined;
        },
        z
          .number({ invalid_type_error: "Amount must be a number" })
          .positive("Amount must be greater than 0")
          .optional(),
      ),
      currency: z
        .string({ invalid_type_error: "Currency must be a string" })
        .trim()
        .min(1, "Currency cannot be empty")
        .optional(),
      minQty: z.preprocess(
        convertToNumber,
        z
          .number({ invalid_type_error: "minQty must be a number" })
          .int("minQty must be an integer")
          .min(1, "minQty must be at least 1")
          .optional(),
      ),
      maxQty: z.preprocess(
        convertToNumber,
        z
          .number({ invalid_type_error: "maxQty must be a number" })
          .int("maxQty must be an integer")
          .min(1, "maxQty must be at least 1")
          .optional(),
      ),
      isDefault: z.preprocess(stringToBoolean, z.boolean().optional()),
      isActive: z.preprocess(stringToBoolean, z.boolean().optional()),
      note: z
        .string({ invalid_type_error: "Note must be a string" })
        .trim()
        .optional()
        .nullable(),
    })
    .superRefine((data, ctx) => {
      const hasMin = typeof data.minQty === "number";
      const hasMax = typeof data.maxQty === "number";
      const isPerType = data.type === "PER_STUDENT";

      if (isPerType) {
        if (!hasMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["minQty"],
            message: `minQty is required for ${data.type} pricing`,
          });
        }
        if (!hasMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["maxQty"],
            message: `maxQty is required for ${data.type} pricing`,
          });
        }
      } else if (hasMin !== hasMax) {
        if (hasMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["maxQty"],
            message: "maxQty is required when minQty is provided",
          });
        }
        if (hasMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["minQty"],
            message: "minQty is required when maxQty is provided",
          });
        }
      }

      // Only validate order when both exist
      if (hasMin && hasMax && data.minQty > data.maxQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minQty"],
          message: "minQty cannot be greater than maxQty",
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxQty"],
          message: "maxQty must be greater than or equal to minQty",
        });
      }

      if (data.isDefault) {
        data.isActive = true;
      }
    }),
});

export const CourseDefaultServicesPriceValidationSchema = {
  createCourseDefaultServicesPriceValidationSchema,
  updateCourseDefaultServicesPriceValidationSchema,
};
