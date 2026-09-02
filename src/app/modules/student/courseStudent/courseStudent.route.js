import { Router } from "express";
import validationRequest from "../../../middleware/validationRequest.js";
import { authorizationMiddleware } from "../../../middleware/authorization.js";
import { Enums } from "../../../constant/enums.js";
import { courseStudentValidationSchema } from "./courseStudent.validation.js";
import { coursesStudentController } from "./courseStudent.controller.js";

const router = Router();

router.get(
  "/my-courses",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  coursesStudentController.getMyCourses,
);

// router.get(
//   "/get-all-students",
//   authorizationMiddleware.authorize([
//     Enums.roles.SUPERADMIN,
//     Enums.roles.ADMIN,
//   ]),
//   coursesStudentController.getAllStudents
// );

router.get(
  "/get-course-student/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCourses,
  coursesStudentController.getCourseStudents,
);

router.get(
  "/get-cycle-student/:id",
  authorizationMiddleware.authorize([
    Enums.roles.SUPERADMIN,
    Enums.roles.ADMIN,
  ]),
  authorizationMiddleware.authorizeEveryoneForCycle,
  coursesStudentController.getCycleStudents,
);

router.post(
  "/course/redeem",
  authorizationMiddleware.authorize([Enums.roles.STUDENT]),
  validationRequest(courseStudentValidationSchema.courseRedeemValidationSchema),
  coursesStudentController.redeemCourse,
);

// router.get(
//   "/get/all-student-for-cx",
//   authorizationMiddleware.authorize([
//     Enums.roles.SUPERADMIN,
//     Enums.roles.ADMIN,
//   ]),
//   coursesStudentController.getStudentInfoforCx,
// );

router.post(
  "/migrate/from/old/webapp",
  coursesStudentController.migrateFromOldApp,
);

//manuallyCourse and Cycle Access
router.post(
  "/manually-access",
  authorizationMiddleware.authorize([Enums.roles.SUPERADMIN]),
  validationRequest(
    courseStudentValidationSchema.manuallyCourseAccessValidationSchema,
  ),
  coursesStudentController.manuallyCourseAndCycleAccessController,
);

//Student info
router.get("/info", coursesStudentController.studentInfoController);

export const courseStudentRoute = router;
