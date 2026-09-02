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
  "courseAdmin.admin.name",
  "courseAdmin.admin.email",
  "courseAdmin.admin.phone",
  "courseAdmin.course.productName",
  "courseAdmin.course.productFullName",
  "courseAdmin.course.Category",
  "courseAdmin.course.SubCategory",
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
  "service.id",
  "service.name",
  "service.description",
  "service.createdAt",
  "status",
  "offeredAt",
  "decidedAt",
  "expiresAt",
  "note",
  "prices.id",
  "prices.type",
  "prices.amount",
  "prices.currency",
  "prices.minQty",
  "prices.maxQty",
  "prices.isDefault",
  "prices.note",
  "selection",
  "courseAdmin.course.productName",
  "courseAdmin.course.productFullName",
  "courseAdmin.course.Category",
  "courseAdmin.course.SubCategory",
  "courseAdmin.admin.name",
  "courseAdmin.admin.email",
  "courseAdmin.admin.phone",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "status",
  "offeredAt",
  "decidedAt",
  "expiresAt",
  "note",
  "createdAt",
  "updatedAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
