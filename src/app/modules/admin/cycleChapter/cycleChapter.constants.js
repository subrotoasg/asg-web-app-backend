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
  "chapter.chapterName",
  "cycleSubject.title",
  "cycleSubject.subject.title",
  "cycleSubject.cycle.title",
  "cycleSubject.cycle.course.productName",
];
export const filterableFields = [
  "cycleSubject.subject.title",
  "cycleSubject.subject.course.productName",
  "cycleSubject.cycle.productId",
  "cycleSubject.cycle.title",
  "cycleSubject.cycle.course.productName",
];

export const sortableFields = ["createdAt", "updatedAt"];

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "cycleSubjectChapterImage",
  "title",
  "createdAt",
  "serial",
  //chapter
  "chapter.id",
  "chapter.chapterImage",
  "chapter.chapterName",
  "chapter.chapterNo",

  // cycle subject Info
  "cycleSubject.id",
  "cycleSubject.cycleSubjectImage",
  "cycleSubject.subject.id",
  "cycleSubject.subject.title",
  "cycleSubject.subject.subjectImage",

  //cycle Info
  "cycleSubject.cycle.id",
  "cycleSubject.cycle.title",
  "cycleSubject.cycle.cycleImage",
  "cycleSubject.cycle.productId",
  "cycleSubject.cycle.facebookGroup",

  //course info
  "cycleSubject.cycle.course.id",
  "cycleSubject.cycle.course.title",
  "cycleSubject.cycle.course.courseImage",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "title",
  "cycleSubjectChapterImage",
  "createdAt",
  "updatedAt",
];

//Course id  based pickQuery
export const pickQueryForChapterBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
