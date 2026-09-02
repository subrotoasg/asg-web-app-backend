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
export const searchableFields = ["email", "phone", "name"];
export const filterableFields = ["email", "phone", "name"];
export const sortableFields = ["name", "phone", "createdAt", "updatedAt"];

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "email",
  "phone",
  "photo",
  "status",
  "name",
  "anotherRole",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = ["id", "email", "phone", "name", "photo"];

//Course id  based pickQuery
export const pickQueryForSubjectBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
