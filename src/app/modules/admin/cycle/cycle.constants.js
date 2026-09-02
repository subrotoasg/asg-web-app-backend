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
export const searchableFields = ["title", "course.productName"];
export const filterableFields = ["title"];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "cycleFullName",
  "isCycleFree",
  "affiliateProductIds",
  "cycleImage",
  "productId",
  "archieveCycleId",
  "markAsArchieve",
  "facebookGroup",
  "libraryId",
  "Permalink",
  "currency_amount",
  "course.id",
  "course.courseId",
  "course.productId",
  "course.productName",
  "course.productFullName",
  "course.isCourseFree",
  "course.affiliateProductIds",
  "course.Parent",
  "course.ProductImage",
  "course.Platinum",
  "course.Category",
  "course.SubCategory",
  "course.currency_amount",
  "course.Permalink",
  "course.facebookGroup",
  "course.libraryId",
  "course.createdAt",
  "createdAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "courseId",
  "productId",
  "title",
  "cycleImage",
  "createdAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
