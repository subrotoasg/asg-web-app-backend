import { z } from "zod";

const pushMessigingRegisterSchema = z.object({
  body: z
    .object({
      studentId: z
        .string({
          required_error: "StudentId is required",
          invalid_type_error: "Student Id must be a UUID",
        })
        .optional(),
      adminId: z
        .string({
          required_error: "StudentId is required",
          invalid_type_error: "Student Id must be a UUID",
        })
        .optional(),
      platform: z.enum(["WEB", "ANDROID", "IOS"]),
      token: z.string().min(10),
    })
    .refine((data) => data.studentId || data.adminId, {
      message: "Either student Id or admin Id is required",
    }),
});

const pushMessigingBroadcastCourseSchema = z.object({
  body: z
    .object({
      courseId: z
        .string({
          invalid_type_error: "classContentId must be a valid UUID",
        })
        .uuid("classContentId must be a valid UUID")
        .optional(),
      cycleId: z
        .string({
          invalid_type_error: "cycleContentId must be a valid UUID",
        })
        .uuid("cycleContentId must be a valid UUID")
        .optional(),
      title: z
        .string({
          required_error: "Title text is required",
          invalid_type_error: "Title must be a string",
        })
        .min(1, "Title cannot be empty"),
      body: z.string().min(1, "Notification body content cannot be empty"),
      data: z.record(z.any()).optional(),
      eventKey: z.string({
        required_error: "Event key is required",
        invalid_type_error: "Event key must be a string",
      }),
    })
    .refine((data) => data.courseId || data.cycleId, {
      message: "Either class Content Id or cycle Content Id is required",
    }),
});

const pushMessigingUserSendSchema = z.object({
  body: z
    .object({
      studentId: z.string().uuid().optional(),
      adminId: z.string().uuid().optional(),
      title: z
        .string({
          required_error: "Title text is required",
          invalid_type_error: "Title must be a string",
        })
        .min(1, "Title cannot be empty"),
      body: z.string().min(1, "Notification body content cannot be empty"),
      data: z.record(z.any()).optional(),
      eventKey: z.string({
        required_error: "Event key is required",
        invalid_type_error: "Event key must be a string",
      }),
    })
    .refine((data) => data.studentId || data.adminId, {
      message: "Either student Id or admin Id is required",
    }),
});

const pushMessigingBroadcastAllUsersSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Title text is required",
        invalid_type_error: "Title must be a string",
      })
      .min(1, "Title cannot be empty"),
    body: z.string().min(1, "Notification body content cannot be empty"),
    type: z.string({
      required_error: "Type is required",
      invalid_type_error: "Type must be a string",
    }),
    data: z.record(z.any()).optional(),
    eventKey: z.string({
      required_error: "Event key is required",
      invalid_type_error: "Event key must be a string",
    }),
  }),
});

const studentNotificationUpdateSchema = z.object({
  body: z.object({
    notificationIds: z
      .array(
        z.string().uuid({
          message: "Each notificationId must be a valid UUID",
        }),
      )
      .min(1, "At least one notificationId is required"),

    action: z.enum(["view", "click"], {
      required_error: "Action is required",
      invalid_type_error: "Action must be either 'view' or 'click'",
    }),
  }),
});

//single user notification
const singleUserNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title is required"),
    body: z.string().min(5, "Body is required"),
    data: z
      .object({
        studentId: z.string().optional(),
        adminId: z.string().optional(),
        senderStudentId: z.string().optional(),
        senderAdminId: z.string().optional(),
        senderSuperAdminId: z.string().optional(),
        deepLink: z.string().optional(),
        icon: z.string().optional(),
        badge: z.string().optional(),
        image: z.string().optional(),
        type: z.string().optional(),
      })
      .refine(
        (data) => {
          const hasSender =
            data.senderStudentId ||
            data.senderAdminId ||
            data.senderSuperAdminId;
          return !!hasSender;
        },
        {
          message:
            "At least one sender ID (senderStudentId, senderAdminId, or senderSuperAdminId) must be provided",
        },
      ),
  }),
});

export const PushMessagingValidationSchema = {
  pushMessigingRegisterSchema,
  pushMessigingBroadcastCourseSchema,
  pushMessigingUserSendSchema,
  pushMessigingBroadcastAllUsersSchema,
  studentNotificationUpdateSchema,
  singleUserNotificationSchema,
};
