import { z } from "zod";

const createNewIssueTagValidationSchema = z.object({
  body: z.object({
    tag: z.string({ required_error: "Tag name must be given" }),
  }),
});

const updateIssueTagsValidationSchema = z.object({
  body: z.object({
    tag: z.string({
      required_error: "Updated Tag name must be given",
    }),
  }),
});

const updateIssuePriorityValidationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Priority title can't be empty").optional(),
    level: z
      .number()
      .int("Priority level must be an integer")
      .positive("Priority level must be greater than 0")
      .optional(),
  }),
});

const createNewIssuePriorityValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Priority title must be given" })
      .trim()
      .min(1, "Priority title cannot be empty"),
    level: z
      .number({ required_error: "Priority level must be given" })
      .int("Priority level must be an integer")
      .positive("Priority level must be greater than 0"),
  }),
});

const createNewIssueValidationSchema = z.object({
  body: z.object({
    priorityId: z
      .string({ required_error: "Priority is required" })
      .uuid("Priority id must be a valid ID"),

    issueTagId: z
      .string({ required_error: "Issue tag is required" })
      .uuid("Issue tag id must be a valid ID"),

    adminId: z.string().uuid("Admin id must be a valid UUID").optional(),

    issueTitle: z
      .string()
      .trim()
      .min(1, "Issue title cannot be empty")
      .max(255, "Issue title is too long"),

    issueDescription: z
      .string()
      .trim()
      .min(1, "Issue description cannot be empty")
      .optional(),
  }),
});

const issueStatusEnum = z.enum(["PENDING", "ONGOING", "REJECTED", "SOLVED"]);

const updateIssueValidationSchema = z.object({
  body: z.object({
    status: issueStatusEnum.optional().default("PENDING"),
    remarks: z.string().min(1, "Remarks cannot be empty").optional(),
  }),
});

const updateIssueByAdminValidationSchema = z.object({
  body: z.object({
    priorityId: z.string().uuid("Priority id must be a valid ID").optional(),
    issueTagId: z.string().uuid("Issue tag id must be a valid ID").optional(),
    issueTitle: z
      .string()
      .trim()
      .min(1, "Issue title cannot be empty")
      .max(255, "Issue title is too long")
      .optional(),
    issueDescription: z
      .string()
      .trim()
      .min(1, "Issue description cannot be empty")
      .optional(),
  }),
});

export const issueTrackValidationSchema = {
  updateIssueValidationSchema,
  updateIssueByAdminValidationSchema,
  createNewIssueValidationSchema,
  createNewIssueTagValidationSchema,
  updateIssueTagsValidationSchema,
  updateIssuePriorityValidationSchema,
  createNewIssuePriorityValidationSchema,
};
