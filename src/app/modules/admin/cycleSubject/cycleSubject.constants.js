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
  "cycle.title",
  "subject.title",
  "cycle.course.productName",
];
export const filterableFields = [
  "cycle.title",
  "subject.title",
  "cycle.course.productName",
];
export const sortableFields = ["createdAt", "updatedAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  //cycle subject
  "id",
  "title",
  "cycleSubjectImage",
  "serial",
  "createdAt",
  //cycle
  "cycle.id",
  "cycle.title",
  "cycle.cycleImage",
  "cycle.facebookGroup",
  //subject
  "subject.id",
  "subject.title",
  "subject.subjectImage",
  //course
  "cycle.course.id",
  "cycle.course.productName",
  "cycle.course.ProductImage",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "cycleSubjectImage",
  "title",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForSubjectBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
