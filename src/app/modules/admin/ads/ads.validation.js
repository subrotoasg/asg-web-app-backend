import { z } from "zod";
import { AdScopes } from "./ads.constants.js";

const uuid = (label) =>
  z
    .string({ invalid_type_error: `${label} must be a string` })
    .uuid(`${label} must be a valid UUID`);

const uuidArray = (label) => z.array(uuid(label));

const isoDate = (label) =>
  z
    .string({ invalid_type_error: `${label} must be an ISO date string` })
    .datetime({ offset: true, message: `${label} must be a valid ISO date` })
    .or(z.date());

/* ---- টার্গেট ---- *
 * ফ্রন্টএন্ড প্রতিটা স্কোপের জন্য একটা আইডি অ্যারে পাঠায়, তাই একসাথে
 * অনেকগুলো ক্লাস বা সাবজেক্ট সিলেক্ট করা যায়।
 */
const targetsShape = z
  .object({
    global: z.boolean().optional(),
    courseIds: uuidArray("courseId").optional(),
    courseSubjectIds: uuidArray("courseSubjectId").optional(),
    courseSubjectChapterIds: uuidArray("courseSubjectChapterId").optional(),
    classContentIds: uuidArray("classContentId").optional(),
    cycleIds: uuidArray("cycleId").optional(),
    cycleSubjectIds: uuidArray("cycleSubjectId").optional(),
    cycleSubjectChapterIds: uuidArray("cycleSubjectChapterId").optional(),
    cycleContentIds: uuidArray("cycleContentId").optional(),
    liveClassIds: uuidArray("liveClassId").optional(),
    studentIds: uuidArray("studentId").optional(),
    studentCourses: z
      .array(
        z.object({
          studentId: uuid("studentId"),
          courseId: uuid("courseId"),
        }),
      )
      .optional(),
    /* যেগুলো বাদ দিতে চাও — যেমন "পুরো কোর্স, কিন্তু এই চ্যাপ্টারটা ছাড়া" */
    exclude: z
      .object({
        courseIds: uuidArray("courseId").optional(),
        courseSubjectIds: uuidArray("courseSubjectId").optional(),
        courseSubjectChapterIds: uuidArray("courseSubjectChapterId").optional(),
        classContentIds: uuidArray("classContentId").optional(),
        cycleIds: uuidArray("cycleId").optional(),
        cycleSubjectIds: uuidArray("cycleSubjectId").optional(),
        cycleSubjectChapterIds: uuidArray("cycleSubjectChapterId").optional(),
        cycleContentIds: uuidArray("cycleContentId").optional(),
        liveClassIds: uuidArray("liveClassId").optional(),
        studentIds: uuidArray("studentId").optional(),
      })
      .optional(),
  })
  .strict();

const countIncludeTargets = (t = {}) =>
  (t.global ? 1 : 0) +
  (t.courseIds?.length ?? 0) +
  (t.courseSubjectIds?.length ?? 0) +
  (t.courseSubjectChapterIds?.length ?? 0) +
  (t.classContentIds?.length ?? 0) +
  (t.cycleIds?.length ?? 0) +
  (t.cycleSubjectIds?.length ?? 0) +
  (t.cycleSubjectChapterIds?.length ?? 0) +
  (t.cycleContentIds?.length ?? 0) +
  (t.liveClassIds?.length ?? 0) +
  (t.studentIds?.length ?? 0) +
  (t.studentCourses?.length ?? 0);

const creativeShape = {
  title: z
    .string({ required_error: "title is required!" })
    .trim()
    .min(2, "title can't be that short")
    .max(200, "title is too long"),
  description: z.string().trim().max(2000).optional(),
  creativeType: z.enum(["VIDEO", "IMAGE"]).optional(),
  src: z
    .string({ required_error: "src (creative url) is required!" })
    .trim()
    .url("src must be a valid URL"),
  thumbnail: z.string().trim().url("thumbnail must be a valid URL").optional(),
  durationSec: z.coerce
    .number()
    .int("durationSec must be a whole number")
    .min(1, "durationSec must be at least 1")
    .max(600, "durationSec can't exceed 600"),
  skipAfterSec: z.coerce
    .number()
    .int()
    .min(0)
    .max(600)
    .nullish(),
  clickUrl: z.string().trim().url("clickUrl must be a valid URL").optional(),
  cta: z.string().trim().max(80, "cta is too long").optional(),
  placement: z.enum(["PRE_ROLL", "MID_ROLL", "POST_ROLL", "OVERLAY"]).optional(),
  atSec: z.coerce.number().int().min(0).max(86_400).optional(),
  status: z
    .enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ARCHIVED"])
    .optional(),
  startAt: isoDate("startAt").nullish(),
  endAt: isoDate("endAt").nullish(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  maxImpressionsPerUser: z.coerce.number().int().min(1).max(1000).nullish(),
  minGapSeconds: z.coerce.number().int().min(0).max(604_800).nullish(),
};

/* ক্রিয়েটিভের নিয়মগুলো — create আর update দুই জায়গাতেই লাগে */
const refineCreative = (data, ctx) => {
  if (data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endAt"],
      message: "endAt must be after startAt",
    });
  }

  if (
    data.skipAfterSec != null &&
    data.durationSec != null &&
    data.skipAfterSec >= data.durationSec
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["skipAfterSec"],
      message: "skipAfterSec must be smaller than durationSec",
    });
  }

  if (data.placement === "MID_ROLL" && (data.atSec == null || data.atSec <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["atSec"],
      message: "MID_ROLL needs atSec greater than 0",
    });
  }

  if (data.cta && !data.clickUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["clickUrl"],
      message: "clickUrl is required when a cta is set",
    });
  }
};

const createAdValidation = z.object({
  body: z
    .object({
      ...creativeShape,
      targets: targetsShape,
    })
    .superRefine((data, ctx) => {
      refineCreative(data, ctx);

      if (countIncludeTargets(data.targets) === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targets"],
          message:
            "At least one target is required — pick global, or one or more courses / subjects / chapters / contents / cycles / live classes / students",
        });
      }
    }),
});

const updateAdValidation = z.object({
  body: z
    .object({
      ...creativeShape,
      title: creativeShape.title.optional(),
      src: creativeShape.src.optional(),
      durationSec: creativeShape.durationSec.optional(),
      targets: targetsShape.optional(),
    })
    .superRefine(refineCreative),
});

const updateStatusValidation = z.object({
  body: z.object({
    status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ARCHIVED"], {
      required_error: "status is required!",
    }),
  }),
});

/* স্টুডেন্ট প্লেয়ার থেকে — কোন কনটেন্টের জন্য ad চাই */
const serveAdsValidation = z.object({
  body: z.object({}).optional(),
});

const trackEventValidation = z.object({
  body: z.object({
    adId: uuid("adId"),
    type: z.enum(["IMPRESSION", "COMPLETE", "SKIP", "CLICK"], {
      required_error: "type is required!",
    }),
    contextScope: z
      .enum([
        AdScopes.CLASS_CONTENT,
        AdScopes.CYCLE_CONTENT,
        AdScopes.LIVE_CLASS,
      ])
      .optional(),
    contextId: uuid("contextId").optional(),
    positionSec: z.coerce.number().int().min(0).max(86_400).optional(),
  }),
});

export const adsValidationSchema = {
  createAdValidation,
  updateAdValidation,
  updateStatusValidation,
  serveAdsValidation,
  trackEventValidation,
};
