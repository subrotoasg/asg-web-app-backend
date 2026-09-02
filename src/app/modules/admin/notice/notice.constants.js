import { nestedSelectFields } from "../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../constant/enums.js";

export const pickQueryFields = [
  Enums.queryFields.SEARCH_TERM,
  Enums.queryFields.FILTER,
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
  Enums.queryFields.TIME,
];
export const searchableFields = ["title", "description"];
export const filterableFields = ["type"];
export const sortableFields = ["createdAt", "updatedAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "description",
  "url",
  "image",
  "type",
  "startTime",
  "endTime",
  //courseddd
  "course.id",
  "course.productName",
  "course.ProductImage",
  "course.markAsArchieve",
  "course.archieveCourseId",
  "course.facebookGroup",
  "cycle.id",
  "cycle.title",
  "cycle.cycleImage",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "courseId",
  "cycleId",
  "title",
  "desc",
  "url",
  "image",
  "type",
  "startTime",
  "endTime",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForNotice = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
