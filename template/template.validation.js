import { z } from "zod";

const createTemplateValidationSchema = z.object({
  body: z.object({}),
});

//update Template Schema
const updateTemplateValidationSchema = z.object({
  body: z.object({}),
});

export const TemplateValidationSchema = {
  createTemplateValidationSchema,
  updateTemplateValidationSchema,
};
