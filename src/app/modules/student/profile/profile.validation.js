import { z } from "zod";

const changeProfilePhotoValidationSchema = z.object({
  body: z.object({
    photo: z.string({ required_error: "empty photo." }),
  }),
});

export const profileValidationSchema = {
  changeProfilePhotoValidationSchema,
};
