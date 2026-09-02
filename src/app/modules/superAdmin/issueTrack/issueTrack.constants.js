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
  "ip",
  "issueTitle",
  "issueDescription",
  "status",
];
export const filterableFields = [
  "priority.name",
  "issueTag.tag",
  "ip",
  "status",
  "solver.email",
  "admin.name",
];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "priority.name",
  "priority.level",
  "issueTag.tag",
  "adminId",
  "admin.name",
  "ip",
  "issueTitle",
  "issueDescription",
  "images",
  "status",
  "isEdited",
  "solverId",
  "solver.email",
  "solvedAt",
  "remarks",
  "createdAt",
  "updatedAt",
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
