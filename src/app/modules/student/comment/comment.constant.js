import { nestedSelectFields } from "../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../constant/enums.js";

export const pickQueryFields = [
  Enums.queryFields.SEARCH_TERM,
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_ORDER,
  "filterData",
];
export const searchableFields = ["comment", "student.name", "admin.name"];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAllComments = nestedSelectFields([
  "id",
  "comment",
  "createdAt",
  "updatedAt",
]);
export const getAllselectFieldsForGetAllComments = nestedSelectFields([
  "id",
  "comment",
  "createdAt",
  "updatedAt",

  // author info
  "student.id",
  "student.name",
  "student.profilePhoto",
  "admin.id",
  "admin.name",

  // class info
  "classContent.id",
  "classContent.classTitle",
  "classContent.classNo",

  // course chain classContent
  "classContent.courseSubjectChapter.id",
  "classContent.courseSubjectChapter.title",

  "classContent.courseSubjectChapter.courseSubject.id",
  "classContent.courseSubjectChapter.courseSubject.title",

  "classContent.courseSubjectChapter.courseSubject.course.id",
  "classContent.courseSubjectChapter.courseSubject.course.productFullName",

  // course chain CycleContent
  // cycle chain cycleContent
  "cycleContent.id",
  "cycleContent.classTitle",
  "cycleContent.classNo",

  "cycleContent.cycleSubjectChapter.id",
  "cycleContent.cycleSubjectChapter.title",

  "cycleContent.cycleSubjectChapter.cycleSubject.id",
  "cycleContent.cycleSubjectChapter.cycleSubject.title",

  "cycleContent.cycleSubjectChapter.cycleSubject.cycle.id",
  "cycleContent.cycleSubjectChapter.cycleSubject.cycle.title",

  "cycleContent.cycleSubjectChapter.cycleSubject.cycle.course.id",
  "cycleContent.cycleSubjectChapter.cycleSubject.cycle.course.productFullName",

  // replies (nested)
  "replies.id",
  "replies.comment",
  "replies.createdAt",
  "replies.admin.name",
  "replies.student.name",
]);

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "comment",
  //student
  "student.id",
  "student.name",
  "student.profilePhoto",
  "student.role",
  //admin
  "admin.id",
  "admin.name",
  "admin.photo",
  "admin.role",

  "createdAt",
  "updatedAt",
  "replies.id",
  "replies.comment",
  //student replay
  "replies.student.name",
  "replies.student.id",
  "replies.student.profilePhoto",
  "replies.student.role",
  //replay admin
  "replies.admin.name",
  "replies.admin.id",
  "replies.admin.photo",
  "replies.admin.role",

  "replies.createdAt",
  "replies.updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "comment",
  "updatedAt",
  "replies",
  "createdAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
