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
]);
//nested Select fields
export const selectFields = nestedSelectFields(["id"]);

//Response Send Create and Update Fields
export const sendResponseFields = ["id", "updatedAt", "createdAt"];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];

export const ReactionType = [
  "LIKE",
  "LOVE",
  "CARE",
  "HAHA",
  "WOW",
  "SAD",
  "ANGRY",
];
