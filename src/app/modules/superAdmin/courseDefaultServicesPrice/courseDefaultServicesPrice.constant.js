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
  "courseDefaultService.service.name",
  "courseDefaultService.service.description",
  "courseDefaultService.course.productName",
  "courseDefaultService.course.productFullName",
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
  "id",
  "type",
  "amount",
  "minQty",
  "maxQty",
  "note",
  "isDefault",
  "currency",
  "createdAt",
  "updatedAt",
  "isDefault",
  "isActive",
  "courseDefaultService.course.courseId",
  "courseDefaultService.course.productId",
  "courseDefaultService.course.productName",
  "courseDefaultService.course.productFullName",
  "courseDefaultService.course.isCourseFree",
  "courseDefaultService.course.affiliateProductIds",
  "courseDefaultService.course.ProductImage",
  "courseDefaultService.course.Parent",
  "courseDefaultService.course.Platinum",
  "courseDefaultService.course.Category",
  "courseDefaultService.course.SubCategory",
  "courseDefaultService.course.currency_amount",
  "courseDefaultService.course.Permalink",
  "courseDefaultService.course.facebookGroup",
  "courseDefaultService.course.libraryId",
  "courseDefaultService.course.markAsArchieve",
  "courseDefaultService.course.archieveCourseId",
  "courseDefaultService.course.superAdminId",
  "courseDefaultService.course.cycleAvailable",
  "courseDefaultService.service.id",
  "courseDefaultService.service.name",
  "courseDefaultService.service.description",
  "courseDefaultService.service.code",
  "courseDefaultService.service.createdAt",
  "courseDefaultService.service.updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "type",
  "amount",
  "minQty",
  "maxQty",
  "note",
  "isDefault",
  "isActive",
  "currency",
  "createdAt",
  "updatedAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
