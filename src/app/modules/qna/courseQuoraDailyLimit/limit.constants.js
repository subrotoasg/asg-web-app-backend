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
export const searchableFields = ["course.productName"];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "dailyLimit",
  "lastLimit",
  "createdAt",
  "course.id",
  "course.productName",
  "course.productFullName",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "productName",
  "productFullName",
  "ProductImage",
  "createdAt",
];
