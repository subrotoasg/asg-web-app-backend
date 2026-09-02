import express from "express";
const router = express.Router();
import { superAdminRoute } from "../modules/superAdmin/admin/admin.route.js";
import { coursesRoute } from "../modules/superAdmin/courses/courses.route.js";
import { SubjectRoute } from "../modules/superAdmin/subject/subject.route.js";
import { ChepterRoute } from "../modules/superAdmin/chepter/chepter.route.js";
import { courseSubjectRoute } from "../modules/admin/courseSubject/courseSubject.route.js";
import { CycleRoute } from "../modules/admin/cycle/cycle.router.js";
import { CycleSubjectRoute } from "../modules/admin/cycleSubject/cycleSubject.route.js";
import { CycleChapterRoute } from "../modules/admin/cycleChapter/cycleChapter.route.js";
import { CycleContentRoute } from "../modules/admin/cycleContent/cycleContent.route.js";
import { ClassRoute } from "../modules/admin/class/class.route.js";
import { authRoutes } from "../modules/authentication/auth.router.js";
import { profileRoute } from "../modules/admin/profile/profile.route.js";
import { AdminRoutes } from "../modules/admin/adminApis/admin.api.route.js";
import { CourseFeaturedRoute } from "../modules/admin/featured/featured.route.js";
import { courseSubjectChapterRoute } from "../modules/admin/courseSubjectChapter/courseSubjectChapter.route.js";
import { courseAdminRoute } from "../modules/superAdmin/courseAdmin/courseAdmin.route.js";
import { CourseRoutineRoute } from "../modules/admin/routine/routine.route.js";
import { CourseNoticeRoute } from "../modules/admin/notice/notice.route.js";
import { courseStudentRoute } from "../modules/student/courseStudent/courseStudent.route.js";
import { LiveClassRoute } from "../modules/admin/liveClass/liveClass.route.js";
import { utilitiesRoute } from "../modules/superAdmin/utilities/utilities.route.js";
import { studentProfileRoute } from "../modules/student/profile/profile.route.js";
import { CommentRoute } from "../modules/student/comment/comment.route.js";
import { ReactionRoute } from "../modules/student/reaction/reaction.route.js";
import { QuoraRoute } from "../modules/qna/quora/quora.route.js";
import { NotesRoute } from "../modules/student/notes/notes.route.js";
import { courseQuoraDailyLimitRoute } from "../modules/qna/courseQuoraDailyLimit/limit.route.js";
import { creditModelRoute } from "../modules/qna/creditModel/creditModel.route.js";
import { SolverRoute } from "../modules/qna/solver/solver.route.js";
import { checkEligibilityRoute } from "../modules/checkEligibility/checkEligibility.route.js";
import { PushMessagingRoute } from "../modules/student/firebase/messaging/pushMessaging/pushMessaging.route.js";
import { LiveClassRouteV3Api } from "../modules/admin/liveClassV3Api/liveClass.route.js";
import { AddOneServiceRoute } from "../modules/superAdmin/addOneServices/addOneServices.route.js";
import { CourseDefaultServiceRoute } from "../modules/superAdmin/courseDefaultService/courseDefaultService.route.js";
import { CourseDefaultServicesPriceRoute } from "../modules/superAdmin/courseDefaultServicesPrice/courseDefaultServicesPrice.route.js";
import { CourseAdminServiceOfferRoute } from "../modules/admin/courseAdminServiceOffer/courseAdminServiceOffer.route.js";
import { CourseAdminServiceOfferPriceRoute } from "../modules/admin/courseAdminServiceOfferingPrice/courseAdminServiceOfferingPrice.route.js";
import { CourseAdminServiceOfferingSelectionRoute } from "../modules/admin/courseAdminServiceOfferingSelection/courseAdminServiceOfferingSelection.route.js";
import { UsageAddOnesServicesRoute } from "../modules/superAdmin/usageTracking/usageTracking.route.js";
import { issueRoute } from "../modules/superAdmin/issueTrack/issueTrack.route.js";
import { googleAnylitiesRoute } from "../modules/admin/googleAnaylities/googleAnaylaytic.js";
import { grandCelebrationRoutes } from "../modules/grandCelebration/auth/auth.route.js";
import { SocketMetricsRoute } from "../modules/socketMetrics/socketMetrics.route.js";

//Decleration Path and route for any module
const moduleRoutes = [
  {
    path: "/",
    route: authRoutes,
  },
  {
    path: "/supadmn",
    route: superAdminRoute,
  },
  {
    path: "/supadmn/course-admin",
    route: courseAdminRoute,
  },
  {
    path: "/utils",
    route: utilitiesRoute,
  },
  {
    path: "/subject",
    route: SubjectRoute,
  },
  {
    path: "/chapter",
    route: ChepterRoute,
  },
  {
    path: "/course",
    route: coursesRoute,
  },
  {
    path: "/course-subject",
    route: courseSubjectRoute,
  },
  {
    path: "/course/subject/chapter",
    route: courseSubjectChapterRoute,
  },
  {
    path: "/class",
    route: ClassRoute,
  },
  {
    path: "/cycle",
    route: CycleRoute,
  },
  {
    path: "/cycle-subject",
    route: CycleSubjectRoute,
  },
  {
    path: "/cycle/subject/chapter",
    route: CycleChapterRoute,
  },
  {
    path: "/cycle/class/content",
    route: CycleContentRoute,
  },
  {
    path: "/course/featured",
    route: CourseFeaturedRoute,
  },
  {
    path: "/course/routine",
    route: CourseRoutineRoute,
  },
  {
    path: "/course/notice",
    route: CourseNoticeRoute,
  },
  {
    path: "/admin/profile",
    route: profileRoute,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/student",
    route: courseStudentRoute,
  },
  {
    path: "/live-class",
    route: LiveClassRoute,
  },
  {
    path: "/media/live-class",
    route: LiveClassRouteV3Api,
  },
  {
    path: "/student/profile",
    route: studentProfileRoute,
  },
  {
    path: "/comment",
    route: CommentRoute,
  },
  {
    path: "/quoraLimit",
    route: courseQuoraDailyLimitRoute,
  },
  {
    path: "/quora",
    route: QuoraRoute,
  },
  {
    path: "/creditModel",
    route: creditModelRoute,
  },
  {
    path: "/reaction",
    route: ReactionRoute,
  },
  {
    path: "/my-note",
    route: NotesRoute,
  },
  {
    path: "/solvers",
    route: SolverRoute,
  },
  {
    path: "/check-eligibility",
    route: checkEligibilityRoute,
  },
  {
    path: "/notification",
    route: PushMessagingRoute,
  },
  {
    path: "/add/one/services",
    route: AddOneServiceRoute,
  },
  {
    path: "/add/one/course/default/services",
    route: CourseDefaultServiceRoute,
  },
  {
    path: "/add/one/course/default/services/price",
    route: CourseDefaultServicesPriceRoute,
  },
  {
    path: "/add/one/course/admin/services/offer",
    route: CourseAdminServiceOfferRoute,
  },
  {
    path: "/add/one/course/admin/services/offer/price",
    route: CourseAdminServiceOfferPriceRoute,
  },
  {
    path: "/add/one/course/admin/services/offer/price/selection",
    route: CourseAdminServiceOfferingSelectionRoute,
  },
  {
    path: "/add/on/billing",
    route: UsageAddOnesServicesRoute,
  },
  {
    path: "/issueTrack",
    route: issueRoute,
  },
  {
    path: "/active",
    route: googleAnylitiesRoute,
  },
  {
    path: "/grand-celebration",
    route: grandCelebrationRoutes,
  },
  {
    path: "/socket-metrics",
    route: SocketMetricsRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
