import { nestedSelectFields } from "../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../constant/enums.js";

export const pickQueryFields = [
  Enums.queryFields.SEARCH_TERM,
  Enums.queryFields.FILTER,
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];

/* ad টেবিলে ঠিক যেই ফিল্ডগুলো লেখা যাবে।
   authorizationMiddleware req.body-তে superAdminId / superAdminPhone /
   superAdminEmail / userRole / userIdForLimit বসিয়ে দেয় — সেগুলো prisma-তে
   গেলে "Unknown argument" ইরর হয়, তাই payload সবসময় এই লিস্ট দিয়ে ছেঁকে নিতে হবে */
export const creativeFields = [
  "title",
  "description",
  "creativeType",
  "src",
  "thumbnail",
  "durationSec",
  "skipAfterSec",
  "clickUrl",
  "cta",
  "placement",
  "atSec",
  "status",
  "startAt",
  "endAt",
  "priority",
  "maxImpressionsPerUser",
  "minGapSeconds",
];

export const searchableFields = ["title", "description", "cta"];
export const filterableFields = ["status", "placement", "creativeType"];
export const sortableFields = [
  "createdAt",
  "updatedAt",
  "priority",
  "startAt",
  "endAt",
  "impressionCount",
  "clickCount",
];

/* একটা ad-এর যেকোনো একটা টার্গেট রো থেকে যেই নামগুলো লাগে */
export const targetSelect = {
  id: true,
  scope: true,
  mode: true,
  courseId: true,
  courseSubjectId: true,
  courseSubjectChapterId: true,
  classContentId: true,
  cycleId: true,
  cycleSubjectId: true,
  cycleSubjectChapterId: true,
  cycleContentId: true,
  liveClassId: true,
  studentId: true,
  course: { select: { id: true, productName: true, productFullName: true } },
  courseSubject: { select: { id: true, title: true } },
  courseSubjectChapter: { select: { id: true, title: true } },
  classContent: { select: { id: true, classTitle: true, classNo: true } },
  cycle: { select: { id: true, title: true } },
  cycleSubject: { select: { id: true, title: true } },
  cycleSubjectChapter: { select: { id: true, title: true } },
  cycleContent: { select: { id: true, classTitle: true, classNo: true } },
  liveClass: { select: { id: true, title: true, startTime: true } },
  student: { select: { id: true, name: true, phone: true, email: true } },
};

/* অ্যাডমিন লিস্ট/ডিটেইলের জন্য — কে বানালো সেটাসহ */
export const selectFields = {
  ...nestedSelectFields([
    "id",
    "title",
    "description",
    "creativeType",
    "src",
    "thumbnail",
    "durationSec",
    "skipAfterSec",
    "clickUrl",
    "cta",
    "placement",
    "atSec",
    "status",
    "startAt",
    "endAt",
    "priority",
    "maxImpressionsPerUser",
    "minGapSeconds",
    "impressionCount",
    "completeCount",
    "skipCount",
    "clickCount",
    "createdAt",
    "updatedAt",
    "createdBySuperAdmin.id",
    "createdBySuperAdmin.email",
    "createdBySuperAdmin.phone",
    "createdBySuperAdmin.photo",
    "createdByAdmin.id",
    "createdByAdmin.name",
    "createdByAdmin.email",
    "createdByAdmin.photo",
    "updatedBySuperAdmin.id",
    "updatedBySuperAdmin.email",
    "updatedByAdmin.id",
    "updatedByAdmin.name",
  ]),
  targets: { select: targetSelect },
};

/* create/update-এর পর ক্লায়েন্টকে যা ফেরত যায় */
export const sendResponseFields = [
  "id",
  "title",
  "description",
  "creativeType",
  "src",
  "thumbnail",
  "durationSec",
  "skipAfterSec",
  "clickUrl",
  "cta",
  "placement",
  "atSec",
  "status",
  "startAt",
  "endAt",
  "priority",
  "createdAt",
  "updatedAt",
];

/* সার্ভ করার সময় স্টুডেন্টকে যতটুকু দেওয়া হয় — এর বেশি না */
export const serveSelectFields = {
  id: true,
  title: true,
  creativeType: true,
  src: true,
  thumbnail: true,
  durationSec: true,
  skipAfterSec: true,
  clickUrl: true,
  cta: true,
  placement: true,
  atSec: true,
  priority: true,
  maxImpressionsPerUser: true,
  minGapSeconds: true,
};

export const AdScopes = {
  GLOBAL: "GLOBAL",
  COURSE: "COURSE",
  COURSE_SUBJECT: "COURSE_SUBJECT",
  COURSE_SUBJECT_CHAPTER: "COURSE_SUBJECT_CHAPTER",
  CLASS_CONTENT: "CLASS_CONTENT",
  CYCLE: "CYCLE",
  CYCLE_SUBJECT: "CYCLE_SUBJECT",
  CYCLE_SUBJECT_CHAPTER: "CYCLE_SUBJECT_CHAPTER",
  CYCLE_CONTENT: "CYCLE_CONTENT",
  LIVE_CLASS: "LIVE_CLASS",
  STUDENT: "STUDENT",
  STUDENT_COURSE: "STUDENT_COURSE",
};

/* স্কোপ যত নির্দিষ্ট, সংখ্যা তত বেশি — দুইটা ad একসাথে ম্যাচ করলে
   বেশি নির্দিষ্টটাই জেতে */
export const SCOPE_SPECIFICITY = {
  [AdScopes.GLOBAL]: 0,
  [AdScopes.COURSE]: 10,
  [AdScopes.CYCLE]: 15,
  [AdScopes.COURSE_SUBJECT]: 20,
  [AdScopes.CYCLE_SUBJECT]: 25,
  [AdScopes.COURSE_SUBJECT_CHAPTER]: 30,
  [AdScopes.CYCLE_SUBJECT_CHAPTER]: 35,
  [AdScopes.STUDENT_COURSE]: 40,
  [AdScopes.CLASS_CONTENT]: 50,
  [AdScopes.CYCLE_CONTENT]: 50,
  [AdScopes.LIVE_CLASS]: 50,
  [AdScopes.STUDENT]: 60,
};

/* scope → adTarget-এর কোন কলামে আইডিটা বসবে */
export const SCOPE_COLUMN = {
  [AdScopes.COURSE]: "courseId",
  [AdScopes.COURSE_SUBJECT]: "courseSubjectId",
  [AdScopes.COURSE_SUBJECT_CHAPTER]: "courseSubjectChapterId",
  [AdScopes.CLASS_CONTENT]: "classContentId",
  [AdScopes.CYCLE]: "cycleId",
  [AdScopes.CYCLE_SUBJECT]: "cycleSubjectId",
  [AdScopes.CYCLE_SUBJECT_CHAPTER]: "cycleSubjectChapterId",
  [AdScopes.CYCLE_CONTENT]: "cycleContentId",
  [AdScopes.LIVE_CLASS]: "liveClassId",
  [AdScopes.STUDENT]: "studentId",
};

/* STUDENT_COURSE-এ দুইটা কলামই লাগে */
export const SCOPE_COLUMNS_COMPOSITE = {
  [AdScopes.STUDENT_COURSE]: ["studentId", "courseId"],
};

/* ফ্রন্টএন্ড কোন কনটেন্ট চালাচ্ছে — সেটার টাইপ */
export const SERVE_CONTEXTS = [
  AdScopes.CLASS_CONTENT,
  AdScopes.CYCLE_CONTENT,
  AdScopes.LIVE_CLASS,
];

export const AD_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ARCHIVED: "ARCHIVED",
};

export const AD_EVENT_TYPES = ["IMPRESSION", "COMPLETE", "SKIP", "CLICK"];

/* সার্ভ রেসপন্সে সর্বোচ্চ কয়টা ad যাবে */
export const MAX_ADS_PER_BREAK = 1;
export const MAX_ADS_PER_RESPONSE = 6;
