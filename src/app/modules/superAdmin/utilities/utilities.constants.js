import { nestedSelectFields } from "../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../constant/enums.js";

export const pickQueryFieldsForUtilities = [
  Enums.queryFields.SEARCH_TERM,
  Enums.queryFields.FILTER,
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
  Enums.queryFields.TIME,
];

export const searchableFields = ["title", "description", "type"];
export const filterableFieldsForUtilities = ["title", "description", "type"];
export const sortableFieldsForUtilities = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "description",
  "type",
  "createdAt",
  "updatedAt",
]);

export const pickQueryFieldsForActiveChat = [
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_ORDER,
];

//nested Select fields for active chat
export const selectFieldsForActiceChats = nestedSelectFields([
  "id",
  "classContentId",
  "cycleContentId",
  "student.id",
  "student.name",
  "student.role",
  "student.profilePhoto",
  "student.studentRestrictions",
  "admin.id",
  "admin.name",
  "admin.role",
  "admin.photo",
  "superAdmin.id",
  "superAdmin.role",
  "superAdmin.photo",
  "message",
  "messageCreatedAt",
]);
