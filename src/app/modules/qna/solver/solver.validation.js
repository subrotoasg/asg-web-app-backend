import { z } from "zod";

const bdPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;

const registrationValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Please provide your name.",
      })
      .min(3, "Name length must be 3 to 40 character long")
      .max(40, "Name length must be 3 to 40 character long"),

    phone: z
      .string({ required_error: "Please provide your phone" })
      .regex(bdPhoneRegex, "Please provide a valid Bangladeshi phone number"),

    email: z
      .string({ required_error: "Please provide your email" })
      .email("Please provide a valid email address"),

    address: z.string({ required_error: "Please provide your address" }),

    HSC: z.string({ required_error: "Please provide you hsc gpa" }),

    University: z.string({
      required_error: "Please provide you University name",
    }),

    UniAbbreviation: z.string({
      required_error: "Please provide short form of you University (BUET)",
    }),
  }),
});

const registrationResolveSchema = z.object({
  body: z.object({
    accept: z.boolean({
      required_error: "please provide a true or false vlaue for confirmation.",
    }),
  }),
});

export const SolverValidationSchema = {
  registrationResolveSchema,
  registrationValidationSchema,
};
