import { z } from "zod";

const createCourseDefaultServiceValidationSchema = z.object({
  body: z.object({
    courseId:z
      .string({ required_error: "Course Required" })
      .uuid("Invalid courseId format, must be a valid UUID."),
      serviceId:z
      .string({ required_error: "Addon Service Id is required" })
      .uuid("Invalid addon service id format, must be a valid UUID."),
  }),
});

//update CourseDefaultService Schema
const updateCourseDefaultServiceValidationSchema = z.object({
  body: z.object({
      isActive:z.boolean({
        required_error: "Only Boolean Value applicable"
      }).optional()
  }),
});

export const CourseDefaultServiceValidationSchema = {
  createCourseDefaultServiceValidationSchema,
  updateCourseDefaultServiceValidationSchema,
};
