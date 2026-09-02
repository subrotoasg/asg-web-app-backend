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
export const sortableFields = [
  "createdAt",
  "updatedAt",
  "startTime",
  "endTime",
];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "serial",
  "description",
  "url",
  "image",
  "coupne",
  "type",
  "startTime",
  "endTime",
  "productId",
  "affiliateProductIds",
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
  "serial",
  "desc",
  "url",
  "type",
  "startTime",
  "endTime",
  "image",
  "coupne",
  "createdAt",
];

//Course id  based pickQuery
export const pickQueryForFeatured = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
