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
export const searchableFields = [];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAll = nestedSelectFields([
  "id",
  "offering.status",
  "offering.note",
  "offering.expiresAt",
  "offering.offeredAt",
  "selectedPrice.type",
  "selectedPrice.amount",
  "selectedPrice.currency",
  "selectedPrice.minQty",
  "selectedPrice.maxQty",
  "selectedPrice.note",
  "createdAt",
  "updatedAt",
]);
//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "offering.status",
  "offering.note",
  "offering.expiresAt",
  "offering.offeredAt",
  "selectedPrice.id",
  "selectedPrice.type",
  "selectedPrice.amount",
  "selectedPrice.currency",
  "selectedPrice.minQty",
  "selectedPrice.maxQty",
  "selectedPrice.note",
  "selectedPrice.offering.courseAdmin.admin.name",
  "selectedPrice.offering.courseAdmin.admin.email",
  "selectedPrice.offering.courseAdmin.admin.phone",
  "selectedPrice.offering.courseAdmin.course.productName",
  "selectedPrice.offering.courseAdmin.course.productFullName",
  "selectedPrice.offering.courseAdmin.course.Category",
  "selectedPrice.offering.courseAdmin.course.SubCategory",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "offering.status",
  "offering.note",
  "offering.expiresAt",
  "offering.offeredAt",
  "selectedPrice.type",
  "selectedPrice.amount",
  "selectedPrice.currency",
  "selectedPrice.minQty",
  "selectedPrice.maxQty",
  "selectedPrice.note",
  "createdAt",
  "updatedAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
