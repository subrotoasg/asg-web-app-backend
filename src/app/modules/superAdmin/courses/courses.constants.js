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
  "productName",
  "productFullName",
  "Category",
  "SubCategory",
];
export const filterableFields = [
  "productName",
  "productFullName",
  "Category",
  "SubCategory",
];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "courseId",
  "productId",
  "productName",
  "productFullName",
  "isCourseFree",
  "affiliateProductIds",
  "ProductImage",
  "Parent",
  "Platinum",
  "Category",
  "hasApp",
  "SubCategory",
  "currency_amount",
  "Permalink",
  "facebookGroup",
  "libraryId",
  "markAsArchieve",
  "archieveCourseId",
  "contentOwner",
  "superAdminId",
  "cycleAvailable",
  "pullzoneId",
  "createdAt",
]);

export const selectFieldsForSingleCourse = nestedSelectFields([
  "id",
  "courseId",
  "productId",
  "productName",
  "productFullName",
  "isCourseFree",
  "affiliateProductIds",
  "ProductImage",
  "Parent",
  "Platinum",
  "Category",
  "hasApp",
  "SubCategory",
  "currency_amount",
  "Permalink",
  "facebookGroup",
  "libraryId",
  "markAsArchieve",
  "archieveCourseId",
  "superAdminId",
  "cycleAvailable",
  "pullzoneId",
  "createdAt",
  "student.student",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "productName",
  "productFullName",
  "ProductImage",
  "createdAt",
];
