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
  "title",
  "courseSubject.course.productName",
  "courseSubject.subject.title",
  "chapter.chapterName",
];
export const filterableFields = [
  "courseSubject.course.productName",
  "chapter.title",
];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "createdAt",
  "title",
  "courseSubjectChapterImage",
  "serial",
  //course Subject fields
  "courseSubject.id",
  "courseSubject.title",
  //course
  "courseSubject.course.id",
  "courseSubject.course.title",
  "courseSubject.course.courseImage",
  //subject
  "courseSubject.subject.id",
  "courseSubject.subject.title",
  "courseSubject.subject.subjectImage",
  "courseSubject.course.courseId",
  "courseSubject.course.productId",
  "courseSubject.course.productName",
  "courseSubject.course.productFullName",
  "courseSubject.course.Parent",
  "courseSubject.course.ProductImage",
  "courseSubject.course.Platinum",
  "courseSubject.course.Category",
  "courseSubject.course.SubCategory",
  "courseSubject.course.markAsArchieve",
  "courseSubject.course.archieveCourseId",
  "courseSubject.course.currency_amount",
  "courseSubject.course.Permalink",
  "courseSubject.course.facebookGroup",
  "courseSubject.course.createdAt",
  // chapter
  "chapter.id",
  "chapter.chapterName",
  "chapter.chapterImage",
  "chapter.chapterNo",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "createdAt",
  "courseSubjectChapterImage",
];

export const pickQueryForCourseSubjectBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
