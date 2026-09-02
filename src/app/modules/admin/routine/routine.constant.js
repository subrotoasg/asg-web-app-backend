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
export const searchableFields = ["title"];
export const filterableFields = [];
export const sortableFields = ["createdAt", "updatedAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "description",
  "url",
  "image",
  //courseddd
  "course.id",
  "course.productName",
  "course.ProductImage",
  "course.markAsArchieve",
  "course.archieveCourseId",
  "course.facebookGroup",
  "createdAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "courseId",
  "title",
  "desc",
  "url",
  "image",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForRoutine = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
