import { z } from "zod";

const createCourseAdminServiceOfferingSelectionValidationSchema = z.object({
  body: z.object({
    offeringId: z.string().uuid("offeringId must be a valid UUID"),
    selectedPriceId: z.string().uuid("selectedPriceId must be a valid UUID"),
  }),
});

//update CourseAdminServiceOfferingSelection Schema
const updateCourseAdminServiceOfferingSelectionValidationSchema = z.object({
  body: z.object({}),
});

export const CourseAdminServiceOfferingSelectionValidationSchema = {
  createCourseAdminServiceOfferingSelectionValidationSchema,
  updateCourseAdminServiceOfferingSelectionValidationSchema,
};
