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
  "course.productName",
  "admin.name",
  "admin.phone",
  "admin.email",
];
export const filterableFields = [
  "course.productName",
  "admin.name",
  "admin.phone",
  "admin.email",
];
export const sortableFields = [
  "course.productName",
  "admin.name",
  "createdAt",
  "updatedAt",
];

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "course.id",
  "course.productName",
  "course.productFullName",
  "course.ProductImage",
  "course.Category",
  "course.SubCategory",
  "course.createdAt",
  "admin.id",
  "admin.name",
  "admin.phone",
  "admin.email",
  "admin.photo",
  "admin.status",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [];

//Course id  based pickQuery
export const pickQueryForSubjectBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
