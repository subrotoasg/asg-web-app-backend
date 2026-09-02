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
export const searchableFields = [];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAllComments = nestedSelectFields([
  "id",
  "createdAt",
  "updatedAt",
  "note",
]);

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "createdAt",
  "updatedAt",
  "note",
]);

//Response Send Create and Update Fields
export const sendResponseFields = ["id", "updatedAt", "note", "createdAt"];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];

export const selectFieldsForDownload = nestedSelectFields([
  "id",
  "createdAt",
  "updatedAt",
  "note",
  "classContent.classTitle",
  "classContent.classNo",
  "cycleContent.classTitle",
  "cycleContent.classNo",
  "classContent.courseSubjectChapter.id",
  "classContent.courseSubjectChapter.title",
  "classContent.courseSubjectChapter.courseSubject.id",
  "classContent.courseSubjectChapter.courseSubject.title",
  "cycleContent.cycleSubjectChapter.id",
  "cycleContent.cycleSubjectChapter.title",
  "cycleContent.cycleSubjectChapter.cycleSubject.id",
  "cycleContent.cycleSubjectChapter.cycleSubject.title",
]);
