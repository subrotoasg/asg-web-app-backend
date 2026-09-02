import { z } from "zod";

const createClassWholeValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({ required_error: "course ID is required" })
      .uuid("Invalid UUID format for ID"),
    subjectId: z
      .string({ required_error: "subject ID is required" })
      .uuid("Invalid UUID format for ID"),
    chapterId: z
      .string({ required_error: "chapter ID is required" })
      .uuid("Invalid UUID format for ID"),
    classTitle: z.string().min(1, "Class title is required"),
    classNo: z.string({
      required_error: "Class No is required!",
    }),
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

const createClassValidationSchema = z.object({
  body: z.object({
    courseSubjectChapterId: z
      .string({ required_error: "course Subject Chapter ID is required" })
      .uuid("Invalid UUID format for ID"),
    classTitle: z.string().min(1, "Class title is required"),
    classNo: z.string({
      required_error: "Class No is required!",
    }),
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

//update Class Schema
const updateClassValidationSchema = z.object({
  body: z.object({
    classTitle: z.string().min(1, "Class title is required").optional(),
    classNo: z
      .string({
        required_error: "Class No is required!",
      })
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

const contentToCourseInfoSchema = z.object({
  body: z.object({
    contentType: z.string({
      required_error: "Content Type Must Declear Either class Or cycle",
    }),
    contentId: z
      .string({
        required_error: "Content ID is required",
      })
      .uuid({
        message: "Content ID must be a valid UUID",
      }),
  }),
});

export const ClassValidationSchema = {
  createClassValidationSchema,
  createClassWholeValidationSchema,
  updateClassValidationSchema,
  contentToCourseInfoSchema,
};
