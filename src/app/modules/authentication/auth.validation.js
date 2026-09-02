import { z } from "zod";

const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

const signupValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Please provide your name.",
      })
      .min(3, "Name length must be 3 to 40 character long")
      .max(40, "Name length must be 3 to 40 character long"),
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number")
      .optional(),

    email: z
      .string({ required_error: "Please provide your email" })
      .email("Please provide a valid email address"),

    password: z
      .string({ required_error: "Please provide a strong password" })
      .min(8, "Password must be 8 charactes or more long")
      .max(30, "Password can't be more than 30 charactes long"),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    emailOrPhone: z.string({
      required_error: "email or phone number required!",
    }),
  }),
});

const loginV2ValidationSchema = z.object({
  body: z.object({
    emailOrPhone: z.string({
      required_error: "email or phone number required!",
    }),
  }),
});

const verifyValidationSchema = z.object({
  body: z.object({
    passOrOtp: z.string({
      required_error: "invalid credential!",
    }),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    newPassword: z
      .string()
      .min(8, "Minimum 8 characters required.")
      .max(30, "Maximum 30 characters are allowed"),
  }),
});

const forgottenPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().email({
      message: "Invalid email format. Please enter a valid email address.",
    }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().email({
      message: "Invalid email format. Please enter a valid email address.",
    }),
    resetToken: z.string({
      required_error: "resetToken is required",
    }),
    newPassword: z
      .string()
      .min(8, "Minimum 8 characters required.")
      .max(30, "Maximum 30 characters are allowed"),
  }),
});

const credentialVerificationSchema = z.object({
  body: z.object({
    email: z.string().email({
      message: "Invalid email format. Please enter a valid email address.",
    }),
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number"),
    idToken: z.string({ required_error: "Please provide google idToken" }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

const verifyCredentialVerificationSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number"),
    otp: z
      .string({ required_error: "Please provide the OTP" })
      .regex(/^\d{5}$/, "OTP must be exactly 5 digits"),
    idToken: z.string({ required_error: "Please provide google idToken" }),
  }),
});

const verifyCredentialAndSignup = z.object({
  body: z.object({
    otp: z
      .string({ required_error: "Please provide the OTP" })
      .regex(/^\d{5}$/, "OTP must be exactly 5 digits"),
    uid: z.string({
      required_error: "Please provide the firebase uid",
    }),
    name: z
      .string({
        required_error: "Please provide your name",
      })
      .trim()
      // .min(3, "Name must be at least 3 characters long")
      .max(40, "Name must not exceed 40 characters")
      .optional(),
    // .regex(
    //   /^[a-zA-ZÀ-ÿ0-9\s.'-]+$/,
    //   "Name can only contain letters, spaces, dots, apostrophes, and hyphens",
    // ),
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number"),
    email: z
      .string({ required_error: "Please provide your email" })
      .email("Please provide a valid email address"),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
    profilePhoto: z.string().optional(),
    googleId: z.string().optional(),
    appleId: z.string().optional(),
    idToken: z.string({ required_error: "Please provide google idToken" }),
  }),
});

const signupV2ValidationSchema = z.object({
  body: z.object({
    uid: z.string({
      required_error: "Please provide firebase userId",
    }),
    name: z
      .string({
        required_error: "Please provide your name",
      })
      .trim()
      .min(3, "Name must be at least 3 characters long")
      .max(40, "Name must not exceed 40 characters"),
    // .regex(
    //   /^[a-zA-ZÀ-ÿ0-9\s.'-]+$/,
    //   "Name can only contain letters, spaces, dots, apostrophes, and hyphens",
    // ),
    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number"),
    email: z
      .string({ required_error: "Please provide your email" })
      .email("Please provide a valid email address"),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
    profilePhoto: z.string().optional(),
    googleId: z.string().optional(),
    appleId: z.string().optional(),
    idToken: z.string({ required_error: "Please provide google idToken" }),
  }),
});

const oAuthLoginVerifySchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: "please provide google idToken" }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

const VerifyLoginV2ValidationSchema = z.object({
  body: z.object({
    emailOrPhone: z
      .string({ required_error: "emailOrPhone is required" })
      .optional(),
    otp: z
      .string({ required_error: "Please provide the OTP" })
      .regex(/^\d{5}$/, "OTP must be exactly 5 digits"),
  }),
});

const syncStudentoAuthValidationSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: "Please provide google idToken" }),
    uid: z.string({ required_error: "Please provide oAuth uid from firebase" }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
    accessToken: z.string({ required_error: "Please provide access token" }),
  }),
});

const checkSocialLoginValidationSchema = z.object({
  body: z.object({
    idToken: z.string({
      required_error: "Please provide google idToken",
    }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

const existingAccountSocialLoginValidationSchema = z.object({
  body: z.object({
    idToken: z.string({
      required_error: "Please provide google idToken",
    }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

const unlinkSocialValidationSchema = z.object({
  body: z.object({
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

const linkSocialValidationSchema = z.object({
  body: z.object({
    idToken: z.string({
      required_error: "Please give provider idToken",
    }),
    uid: z.string({ required_error: "Please provide oAuth uid from firebase" }),
    provider: z.enum(["GOOGLE", "APPLE"], {
      required_error: "Please give ProviderName",
      invalid_type_error:
        "Invalid ProviderName, only GOOGLE or APPLE is Allowed",
    }),
  }),
});

export const authValidationSchema = {
  loginValidationSchema,
  loginV2ValidationSchema,
  VerifyLoginV2ValidationSchema,
  oAuthLoginVerifySchema,
  changePasswordValidationSchema,
  verifyValidationSchema,
  signupValidationSchema,
  forgottenPasswordValidationSchema,
  resetPasswordValidationSchema,
  credentialVerificationSchema,
  verifyCredentialVerificationSchema,
  verifyCredentialAndSignup,
  signupV2ValidationSchema,
  syncStudentoAuthValidationSchema,
  checkSocialLoginValidationSchema,
  existingAccountSocialLoginValidationSchema,
  unlinkSocialValidationSchema,
  linkSocialValidationSchema,
};
