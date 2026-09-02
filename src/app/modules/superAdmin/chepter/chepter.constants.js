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
export const searchableFields = ["chapterName", "chapterNo", "subject.title"];
export const filterableFields = ["subject.id"];
export const sortableFields = [
  "createdAt",
  "chapterNo",
  "updatedAt",
  "chapterName",
];

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "chapterName",
  "chapterNo",
  "chapterImage",
  "createdAt",
  //subject Info
  "subject.id",
  "subject.title",
  "subject.subjectImage",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "subjectId",
  "chapterName",
  "chapterNo",
  "chapterImage",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForSubjectBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
