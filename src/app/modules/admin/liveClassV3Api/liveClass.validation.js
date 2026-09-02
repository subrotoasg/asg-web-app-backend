import { z } from "zod";

const uuid = z.string().uuid({ message: "Invalid UUID" });
// const isoDate = z.string().datetime({
//   offset: true,
//   message: "Must be ISO 8601 with timezone (e.g. 2025-08-15T14:00:00Z)",
// });

//Create Live Class Validation
const createLiveClassValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "title is required" })
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long"),
    description: z
      .string({ required_error: "description is required" })
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long"),
    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),
    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),
    mediaServer: z.enum(["malaysia", "europe"], {
      error: "Please select a valid media server.",
    }),
    instructor: z
      .string({ required_error: "instructor is required" })
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long"),
    mediaServer: z.string(),
    practiceSheet: z.string().url("invalid practiceSheet url").optional(),
    solutionSheet: z.string().url("invalid solutionSheet url").optional(),
    slidesUrl: z.string().url("invalid slides url").optional(),
    classNumber: z
      .string({ invalid_type_error: "Only String is required" })
      .optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
    cdnUrl: z.string().optional(),
    bunnyApiKey: z.string().optional(),
  }),
});

//Create Free Class Validation Schema
const createfreeClassValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "title is required" })
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long"),
    description: z
      .string({ required_error: "description is required" })
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long"),
    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),
    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),
    startTime: z.string(),
    instructor: z
      .string({ required_error: "instructor is required" })
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long"),
    practiceSheet: z.string().url("invalid practiceSheet url").optional(),
    solutionSheet: z.string().url("invalid solutionSheet url").optional(),
    slidesUrl: z.string().url("invalid slides url").optional(),
    classNumber: z
      .string({ invalid_type_error: "Only String is required" })
      .optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
    cdnUrl: z.string().optional(),
    bunnyApiKey: z.string().optional(),
    customHlsUrl: z
      .string({ required_error: "Custom HLS URL Required" })
      .min(2, "Valid HLS Link is Required"),
    publicEmbed: z.boolean().optional().default(true),
  }),
});

//Create Live Class Validation version 4
const createLiveClassValidationSchemaVersion4 = z.object({
  body: z
    .object({
      title: z
        .string({ required_error: "title is required" })
        .min(3, "title must be at least 3 chars")
        .max(120, "title too long"),
      description: z
        .string({ required_error: "description is required" })
        .min(5, "description must be at least 5 chars")
        .max(2000, "description too long"),
      courseSubjectChapterId: z
        .string()
        .uuid("Invalid courseSubjectChapterId")
        .optional(),
      cycleSubjectChapterId: z
        .string()
        .uuid("Invalid cycleSubjectChapterId")
        .optional(),
      startTime: z.string(),
      instructor: z
        .string({ required_error: "instructor is required" })
        .min(2, "instructor must be at least 2 chars")
        .max(80, "instructor too long"),
      practiceSheet: z.string().url("invalid practiceSheet url").optional(),
      solutionSheet: z.string().url("invalid solutionSheet url").optional(),
      slidesUrl: z.string().url("invalid slides url").optional(),
      classNumber: z
        .string({ invalid_type_error: "Only String is required" })
        .optional(),
      secondaryUrl: z.string().optional(),
      libraryId: z.string().optional(),
      cdnUrl: z.string().optional(),
      bunnyApiKey: z.string().optional(),
      customHlsUrl: z
        .string()
        .min(2, "Valid HLS Link is Required")
        .optional()
        .nullable()
        .or(z.literal("")),
      publicEmbed: z
        .boolean({
          invalid_type_error: "Public Embed must be true or false",
        })
        .optional(),
      ingestType: z
        .string({
          invalid_type_error: "Ingest Type must be a string",
        })
        .min(1, "Ingest Type is Required")
        .optional(),
      //new added
      quality: z.enum(["medium", "high"]).nullable().optional(),

      preset: z
        .enum(["veryfast", "superfast", "ultrafast"])
        .nullable()
        .optional(),

      abr: z.boolean().nullable().optional(),

      streamingEngine: z.enum(["mediaserver", "antmedia"]).optional(),

      latencyMode: z.enum(["hls", "realtime"]).optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.streamingEngine === "antmedia" &&
        data.latencyMode === "realtime"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["latencyMode"],
          message:
            "Realtime latency is supported only with the mediaserver engine.",
        });
      }
    }),
});

const createLiveClassToFlowValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: "title is required" })
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long"),
    description: z
      .string({ required_error: "description is required" })
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long"),
    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),
    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),
    startTime: z.string(),
    instructor: z
      .string({ required_error: "instructor is required" })
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long"),
    practiceSheet: z.string().url("invalid practiceSheet url").optional(),
    solutionSheet: z.string().url("invalid solutionSheet url").optional(),
    slidesUrl: z.string().url("invalid slides url").optional(),
    classNumber: z
      .string({ invalid_type_error: "Only String is required" })
      .optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
    webhook: z.string().optional(),
    sessionType: z.string().optional(),
    //enableDrmForRecording: later can add if provide multiple things.
  }),
});

//update LiveClass Schema
const updateLiveClassValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, "title must be at least 3 chars")
      .max(120, "title too long")
      .optional(),

    description: z
      .string()
      .min(5, "description must be at least 5 chars")
      .max(2000, "description too long")
      .optional(),

    courseSubjectChapterId: z
      .string()
      .uuid("Invalid courseSubjectChapterId")
      .optional(),

    cycleSubjectChapterId: z
      .string()
      .uuid("Invalid cycleSubjectChapterId")
      .optional(),

    startTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "startTime must be a valid date",
      })
      .optional(),

    instructor: z
      .string()
      .min(2, "instructor must be at least 2 chars")
      .max(80, "instructor too long")
      .optional(),

    practiceSheet: z
      .string()
      .url("practiceSheet must be a valid URL")
      .optional(),
    solutionSheet: z
      .string()
      .url("solutionSheet must be a valid URL")
      .optional(),
    slidesUrl: z.string().url("slidesUrl must be a valid URL").optional(),
    secondaryUrl: z.string().optional(),
    libraryId: z.string().optional(),
  }),
});

export const LiveClassValidationSchema = {
  createLiveClassValidationSchema,
  updateLiveClassValidationSchema,
  createLiveClassToFlowValidationSchema,
  createfreeClassValidationSchema,
  createLiveClassValidationSchemaVersion4,
};
