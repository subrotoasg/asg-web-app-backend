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
export const searchableFields = [
  "classTitle",
  "classNo",
  "description",
  "instructor",
  "courseSubjectChapter.title",
  "courseSubjectChapter.chapter.chapterName",
  "courseSubjectChapter.courseSubject.title",
  "courseSubjectChapter.courseSubject.subject.title",
  "courseSubjectChapter.courseSubject.course.productName",
  "courseSubjectChapter.courseSubject.course.facebookGroup",
];
export const filterableFields = [
  "courseSubjectChapter.courseSubject.subject.title",
  "courseSubjectChapter.chapter.chapterName",
];
export const sortableFields = ["createdAt", "classTitle", "classNo"];

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "classTitle",
  "classNo",
  "hostingType",
  "libraryId",
  "zoneSecurityKey",
  "videoUrl",
  "secondaryUrl",
  "description",
  "thumbneil",
  "instructor",
  "lectureSheet",
  "practiceSheet",
  "solutionSheet",
  "views",
  "videoId",
  "markedBook",
  // "uniqueViews",
  "createdAt",
  "courseSubjectChapter.id",
  "courseSubjectChapter.title",
  "courseSubjectChapter.courseSubjectChapterImage",
  //Chapter Info
  "courseSubjectChapter.chapter.id",
  "courseSubjectChapter.chapter.chapterName",
  "courseSubjectChapter.chapter.chapterImage",
  "courseSubjectChapter.courseSubject.id",
  "courseSubjectChapter.courseSubject.title",
  "courseSubjectChapter.courseSubject.courseSubjectImage",
  //subject
  "courseSubjectChapter.courseSubject.subject.id",
  "courseSubjectChapter.courseSubject.subject.title",
  "courseSubjectChapter.courseSubject.subject.subjectImage",
  //course
  "courseSubjectChapter.courseSubject.course.id",
  "courseSubjectChapter.courseSubject.course.courseId",
  "courseSubjectChapter.courseSubject.course.productId",
  "courseSubjectChapter.courseSubject.course.productName",
  "courseSubjectChapter.courseSubject.course.productFullName",
  "courseSubjectChapter.courseSubject.course.Parent",
  "courseSubjectChapter.courseSubject.course.ProductImage",
  "courseSubjectChapter.courseSubject.course.Platinum",
  "courseSubjectChapter.courseSubject.course.Category",
  "courseSubjectChapter.courseSubject.course.SubCategory",
  "courseSubjectChapter.courseSubject.course.markAsArchieve",
  "courseSubjectChapter.courseSubject.course.archieveCourseId",
  "courseSubjectChapter.courseSubject.course.currency_amount",
  "courseSubjectChapter.courseSubject.course.Permalink",
  "courseSubjectChapter.courseSubject.course.facebookGroup",
  "courseSubjectChapter.courseSubject.course.createdAt",
  "courseSubjectChapter.courseSubject.course.zoneSecurityKey",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "classTitle",
  "classNo",
  "libraryId",
  "videoUrl",
  "secondaryUrl",
  "description",
  "instructor",
  "thumbneil",
  "lectureSheet",
  "instructor",
  "practiceSheet",
  "solutionSheet",
  "views",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForCourseSubjectChapterBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
