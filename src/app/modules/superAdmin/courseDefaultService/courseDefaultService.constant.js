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
  "service.name",
  "course.productName",
  "course.Category",
  "service.description",
];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAll = nestedSelectFields([
  "id",
  "createdAt",
  "updatedAt",
]);
//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "course.courseId",
  "course.productId",
  "course.productName",
  "course.productFullName",
  "course.isCourseFree",
  "course.affiliateProductIds",
  "course.ProductImage",
  "course.Parent",
  "course.Platinum",
  "course.Category",
  "course.SubCategory",
  "course.currency_amount",
  "course.Permalink",
  "course.facebookGroup",
  "course.libraryId",
  "course.markAsArchieve",
  "course.archieveCourseId",
  "course.superAdminId",
  "course.cycleAvailable",
  "service.id",
  "service.name",
  "service.description",
  "service.code",
  "service.createdAt",
  "service.updatedAt",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = ["id", "createdAt", "updatedAt"];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
