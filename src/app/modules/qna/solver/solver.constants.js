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
  "name",
  "phone",
  "email",
  "University",
  "UniAbbreviation",
];

export const filterableFields = [];

export const sortableFields = ["createdAt"];

// //nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "rank",
  "email",
  "phone",
  "name",
  "photo",
  "address",
  "HSC",
  "University",
  "UniAbbreviation",
  "UniversityId",
  "lifeTimeCredit",
  "availableCredit",
  "totalSolved",
  "createdAt",
]);

export const sendResponseFields = ["id"];
