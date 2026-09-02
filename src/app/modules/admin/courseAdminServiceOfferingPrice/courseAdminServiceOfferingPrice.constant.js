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
  "offering.service.name",
  "offering.courseAdmin.admin.name",
  "offering.courseAdmin.admin.email",
  "offering.courseAdmin.course.productName",
  "offering.courseAdmin.course.productFullName",
  "offering.courseAdmin.course.Category",
  "offering.courseAdmin.course.SubCategory",
];
export const filterableFields = [];
export const sortableFields = ["createdAt"];

//nested Select fields
export const selectFieldsForGetAll = nestedSelectFields([
  "id",
  "type",
  "amount",
  "currency",
  "minQty",
  "maxQty",
  "note",
  "createdAt",
  "updatedAt",
]);
//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "type",
  "amount",
  "currency",
  "minQty",
  "maxQty",
  "note",
  "offering.service.name",
  "offering.courseAdmin.admin.name",
  "offering.courseAdmin.admin.email",
  "offering.courseAdmin.course.productName",
  "offering.courseAdmin.course.productFullName",
  "offering.courseAdmin.course.Category",
  "offering.courseAdmin.course.SubCategory",
  "createdAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "type",
  "amount",
  "currency",
  "minQty",
  " maxQty",
  "note",
  "createdAt",
  "updatedAt",
];

export const pickQueryForCourseBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
