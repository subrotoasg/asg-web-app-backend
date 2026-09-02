import { z } from "zod";

const createCycleWholeValidationSchema = z.object({
  body: z.object({
    cycleId: z
      .string({ required_error: "course ID is required" })
      .uuid("Invalid UUID format for ID"),
    cycleSubjectId: z
      .string({ required_error: "subject ID is required" })
      .uuid("Invalid UUID format for ID"),
    chapterId: z
      .string({ required_error: "chapter ID is required" })
      .uuid("Invalid UUID format for ID"),
    classTitle: z.string().min(1, "Class title is required"),
    classNo: z.string({
      required_error: "Class No is required!",
    }),
    videoUrl: z.string().min(3, "video url can't be empty!").optional(),
    secondaryUrl: z.string().optional(),
    description: z
      .string()
      .min(3, "video description can't be empty!")
      .optional(),
    thumbneil: z.string().min(3, "thumbneil can't be empty!").optional(),
    hostingType: z.string().optional(),
    lectureSheet: z
      .string()
      .min(3, "lecture Sheet url can't be empty!")
      .optional(),
    practiceSheet: z
      .string()
      .min(3, "practice sheet url can't be empty!")
      .optional(),
    solutionSheet: z
      .string()
      .min(3, "Solution sheet url can't be empty!")
      .optional(),
    markedBook: z.string().min(3, "Marked Book url can't be empty!").optional(),
  }),
});

const createCycleContentValidationSchema = z.object({
  body: z.object({
    cycleSubjectChapterId: z
      .string({
        required_error: "cycleSubjectChapterId is required",
        invalid_type_error: "cycleSubjectChapterId must be a string",
      })
      .uuid({ message: "cycleSubjectChapterId must be a valid UUID" }),

    classTitle: z
      .string({
        required_error: "classTitle is required",
        invalid_type_error: "classTitle must be a string",
      })
      .min(1, { message: "classTitle cannot be empty" }),

    classNo: z
      .string({
        required_error: "classNo is required",
        invalid_type_error: "classNo must be a string",
      })
      .min(1, { message: "classNo cannot be empty" }),

    libraryId: z.string().optional(),
    videoUrl: z.string().min(3, "video url can't be empty!").optional(),
    secondaryUrl: z.string().optional(),
    description: z.string().optional(),
    instructor: z.string().optional(),
    thumbneil: z.string().optional(),
    hostingType: z.string().optional(),
    lectureSheet: z.string().optional(),
    practiceSheet: z.string().optional(),
    solutionSheet: z.string().optional(),
    markedBook: z.string().optional(),
  }),
});

//update CycleContent Schema
const updateCycleContentValidationSchema = z.object({
  body: z.object({
    classTitle: z
      .string({
        required_error: "classTitle is required",
        invalid_type_error: "classTitle must be a string",
      })
      .min(1, { message: "classTitle cannot be empty" })
      .optional(),

    classNo: z
      .string({
        required_error: "classNo is required",
        invalid_type_error: "classNo must be a string",
      })
      .min(1, { message: "classNo cannot be empty" })
      .optional(),
    libraryId: z.string().optional(),
    videoUrl: z.string().optional(),
    secondaryUrl: z.string().optional(),
    description: z.string().optional(),
    instructor: z.string().optional(),
    thumbneil: z.string().optional(),
    lectureSheet: z.string().optional(),
    practiceSheet: z.string().optional(),
    solutionSheet: z.string().optional(),
    markedBook: z.string().optional(),
  }),
});

export const CycleContentValidationSchema = {
  createCycleContentValidationSchema,
  createCycleWholeValidationSchema,
  updateCycleContentValidationSchema,
};
