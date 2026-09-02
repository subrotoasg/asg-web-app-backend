import { z } from "zod";

const createAdminValidationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(/^(\+?88)?01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
    name: z
      .string()
      .min(3, "Name must be atleas 3 characters long!")
      .max(100, "Name must be 100 characters long")
      .regex(
        /^[A-Za-z\s'-]+$/,
        "Name can only contain letters, spaces, hyphens, and apostrophes"
      ),
  }),
});

const assignAdminToCourseValidationSchema = z.object({
  body: z.object({
    newAdminId: z
      .string({ required_error: "admin required" })
      .uuid("Invalid adminId format, must be a valid UUID."),
    courseId: z
      .string({ required_error: "course required" })
      .uuid("Invalid courseId format, must be a valid UUID."),
  }),
});

const unAssignAdminFromCourseValidationSchema = z.object({
  body: z.object({
    adminId: z
      .string({ required_error: "admin id required" })
      .uuid("Invalid adminId format, must be a valid UUID."),
    courseId: z
      .string({ required_error: "course required" })
      .uuid("Invalid courseId format, must be a valid UUID."),
  }),
});

const deactiveAdmin = z.object({
  body: z.object({
    adminId: z
      .string({ required_error: "admin id required" })
      .uuid("Invalid adminId format, must be a valid UUID."),
  }),
});

export const superAdminValidationSchema = {
  deactiveAdmin,
  createAdminValidationSchema,
  assignAdminToCourseValidationSchema,
  unAssignAdminFromCourseValidationSchema,
};
