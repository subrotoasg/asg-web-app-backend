import { nestedSelectFields } from "../../../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../../../constant/enums.js";

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
  "course.productFullName",
  "course.Category",
  "cycle.title",
  "cycle.course.productName",
  "cycle.course.productFullName",
  "cycle.course.Category",
];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "createdAt",
  "title",
  "body",
  "type",
  "image",
  "deepLink",
  "course.productName",
  "course.productFullName",
  "course.Category",
  "cycle.title",
  "cycle.course.productName",
  "cycle.course.productFullName",
  "cycle.course.Category",
  "sendCount",
  "failedCount",
  "invalidCount",
]);

//Response Send Create and Update Fields
export const studentResponseFields = nestedSelectFields([
  "id",
  "createdAt",
  "title",
  "body",
  "image",
  "deepLink",
  "type",
  "notificationUserStatuses.isViewed",
  "notificationUserStatuses.isClicked",
]);

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
