import { z } from "zod";

const createCourseAdminServiceOfferValidationSchema = z.object({
  body: z
  .object({
    
  })
});

//update CourseAdminServiceOffer Schema
const updateCourseAdminServiceOfferValidationSchema = z.object({
  body: z
  .object({})
});

export const CourseAdminServiceOfferValidationSchema = {
  createCourseAdminServiceOfferValidationSchema,
  updateCourseAdminServiceOfferValidationSchema,
};
