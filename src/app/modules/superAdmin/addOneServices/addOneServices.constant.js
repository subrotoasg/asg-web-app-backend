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
// export const searchableFields = ["name", "description"];
export const searchableFields = [
  "name",
  "email",
  "phone",
  "course.name",
  "service.name",
  "description",
];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAllComments = nestedSelectFields([
  "id",
  "name",
  "description",
  "code",
  "createdAt",
  "updatedAt",
]);
//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "name",
  "description",
  "code",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "name",
  "description",
  "code",
  "createdAt",
  "updatedAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
