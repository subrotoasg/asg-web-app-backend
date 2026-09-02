import { z } from "zod";

const signupValidationSchema = z.object({
  body: z.object({
    phone: z
      .string({
        required_error: "Please provide your phone number.",
      })
      .trim()
      .transform((value) => value.replace(/\s+/g, ""))
      .transform((value) => {
        // 017XXXXXXXX
        if (/^01[3-9]\d{8}$/.test(value)) {
          return `+88${value}`;
        }

        // 88017XXXXXXXX
        if (/^8801[3-9]\d{8}$/.test(value)) {
          return `+${value}`;
        }

        // Already +88017XXXXXXXX
        if (/^\+8801[3-9]\d{8}$/.test(value)) {
          return value;
        }

        return value;
      })
      .refine((value) => /^\+8801[3-9]\d{8}$/.test(value), {
        message: "Please provide a valid Bangladeshi phone number.",
      }),
  }),
});

const verifySignUpOTP = z.object({
  body: z.object({
    otp: z
      .string({
        required_error: "Please provide the OTP.",
      })
      .trim()
      .regex(/^\d{5}$/, {
        message: "OTP must be exactly 5 digits.",
      }),
  }),
});

//login Request OTP
const loginRequeOTP = z.object({
  body: z.object({
    phone: z
      .string({
        required_error: "Please provide your phone number.",
      })
      .trim()
      .transform((value) => value.replace(/\s+/g, ""))
      .transform((value) => {
        // 017XXXXXXXX
        if (/^01[3-9]\d{8}$/.test(value)) {
          return `+88${value}`;
        }

        // 88017XXXXXXXX
        if (/^8801[3-9]\d{8}$/.test(value)) {
          return `+${value}`;
        }

        // Already +88017XXXXXXXX
        if (/^\+8801[3-9]\d{8}$/.test(value)) {
          return value;
        }

        return value;
      })
      .refine((value) => /^\+8801[3-9]\d{8}$/.test(value), {
        message: "Please provide a valid Bangladeshi phone number.",
      }),
  }),
});

const verifyLoginOTP = z.object({
  body: z.object({
    otp: z
      .string({
        required_error: "Please provide the OTP.",
      })
      .trim()
      .regex(/^\d{5}$/, {
        message: "OTP must be exactly 5 digits.",
      }),
  }),
});
export const grandCelebrationValidationSchema = {
  signupValidationSchema,
  verifySignUpOTP,
  loginRequeOTP,
  verifyLoginOTP,
};
