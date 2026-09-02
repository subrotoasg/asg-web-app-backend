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
  "course.productName",
  "subject.title",
];
export const filterableFields = ["course.productName", "subject.title"];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "createdAt",
  "title",
  "courseSubjectImage",
  "serial",
  //course fields
  "course.id",
  "course.courseId",
  "course.productId",
  "course.productName",
  "course.productFullName",
  "course.Parent",
  "course.ProductImage",
  "course.Platinum",
  "course.Category",
  "course.SubCategory",
  "course.currency_amount",
  "course.markAsArchieve",
  "course.archieveCourseId",
  "course.Permalink",
  "course.createdAt",
  "course.facebookGroup",
  //subject fields
  "subject.id",
  "subject.title",
  "subject.subjectImage",
  "subject.createdAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "title",
  "courseSubjectImage",
  "createdAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
