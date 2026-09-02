import { z } from "zod";

const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

const updateStudentValidationSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email({
        message: "Invalid email format. Please enter a valid email address.",
      })
      .optional(),
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number")
      .optional(),
  }),
});

const studentBanUnbanValidationSchema = z.object({
  body: z.object({
    remarks: z
      .string({ required_error: "Please provide remarks" })
      .min(10, "Remarks must be at least 10 characters long")
      .max(500, "Remarks cannot exceed 500 characters"),
  }),
});

const validateInitPurchase = z.object({
  body: z.object({
    productId: z.string({ required_error: "product id is required" }),
    Cupon: z.string({ required_error: "Cupon can be applied" }).optional(),
    // affiliateProductIds: z.array({
    //   required_error: "affiliate product id array is required",
    // }),
  }),
});

const validatePurchase = z.object({
  body: z.object({
    productId: z.string({ required_error: "product id is required" }),
    Platform: z.string({ required_error: "type of product is needed" }),
    cus_name: z.string({
      required_error: "customer name as cus_name is required",
    }),
    cus_email: z.string({
      required_error: "customer email as cus_email  is required",
    }),
    Institution: z.string({
      required_error: "customer Institution is required",
    }),
    HSC: z.string({
      required_error: "customer HSC is required",
    }),
    cus_phone: z.string({
      required_error: "customer phone as cus_phone is required",
    }),
    uid: z.string({
      required_error: "customre uid is required",
    }),
  }),
});

const addStreamingServiceValidationSchema = z.object({
  body: z.object({
    productName: z.string({ required_error: "product name is required" }),
  }),
});

const addStorageServiceValidationSchema = z.object({
  body: z.object({
    productName: z.string({ required_error: "product name is required" }),
  }),
});

const transactionNotifyValidationSchema = z.object({
  body: z.object({
    tranxId: z.string({ required_error: "tranxId is required" }),
  }),
});

const removeStudentAccessValidationSchema = z.object({
  body: z.object({
    courseOrCycleId: z.string({
      required_error: "course Id or cycle Id needed",
    }),
    studentId: z.string({
      required_error: "studentId required",
    }),
  }),
});

const interactionBannedUnbannedSchema = z.object({
  body: z.object({
    studentId: z
      .string({
        required_error: "Student ID is required",
      })
      .uuid("Invalid Student ID"),

    messageId: z
      .string({
        required_error: "Message ID is required",
      })
      .uuid("Invalid Message ID"),

    type: z.enum(
      ["FULL", "COMMENT", "REPLY", "CHAT", "LIVE_CLASS", "MEDIA_COMMENT"],
      {
        required_error: "Restriction type is required",
      },
    ),

    reason: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(100, "Reason cannot exceed 500 characters"),
    room_name: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(50, "Reason cannot exceed 500 characters"),

    banned_by: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(50, "Reason cannot exceed 500 characters"),
    banned_by_name: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(50, "Reason cannot exceed 500 characters"),

    duration: z
      .number({
        required_error: "Duration is required",
        invalid_type_error: "Duration must be a number",
      })
      .int("Duration must be an integer")
      .min(1, "Duration must be at least 1 day")
      .max(365, "Duration cannot exceed 365 days")
      .optional(),
  }),
});

const checkMediaCredentials = z.object({
  body: z.object({
    hash: z.string({
      required_error: "Credentials Value is required",
    }),
    app: z.string({
      required_error: "App Name is required",
    }),
  }),
});

export const StudentValidationSchema = {
  validatePurchase,
  validateInitPurchase,
  updateStudentValidationSchema,
  studentBanUnbanValidationSchema,
  addStreamingServiceValidationSchema,
  addStorageServiceValidationSchema,
  transactionNotifyValidationSchema,
  removeStudentAccessValidationSchema,
  interactionBannedUnbannedSchema,
  checkMediaCredentials,
};
