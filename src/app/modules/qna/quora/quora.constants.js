import { nestedSelectFields } from "../../../../helper/nestedSelectFields.js";
import { Enums } from "../../../constant/enums.js";

export const pickQueryFields = [
  Enums.queryFields.SEARCH_TERM,
  Enums.queryFields.FILTER,
  Enums.queryFields.PAGE,
  Enums.queryFields.LIMIT,
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
  Enums.queryFields.QUORA,
];
export const searchableFields = ["content", "OCRcontent"];

export const searchableFieldsForAnswer = ["content"];

export const filterableFields = ["status", "course.productName"];

export const sortableFields = ["createdAt"];

// //nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "content",
  "OCRcontent",
  "student.name",
  "student.profilePhoto",
  "status",
  "quoraImage",
]);

export const selectFieldsForAnswer = nestedSelectFields([
  "id",
  "quoraId",
  "solverId",
  "solver.name",
  "solver.totalSolved",
  "solver.UniAbbreviation",
  "content",
  "isAi",
  "answerFile",
  "isAccepted",
  "upvotes",
  "downvotes",
]);

export const selectFieldsForAnswerComment = nestedSelectFields([
  "id",
  "student.id",
  "student.name",
  "solver.id",
  "solver.name",
  "comments",
  "commentFile",
  "audioFile",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = ["id", "content", "status"];

// export const enableFrequencyValue = []
