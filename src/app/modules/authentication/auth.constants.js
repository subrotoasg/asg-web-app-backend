import { nestedSelectFields } from "../../../helper/nestedSelectFields.js";
import { Enums } from "../../constant/enums.js";

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
export const selectFieldsForAdmin = nestedSelectFields([
  "email",
  "name",
  "phone",
  "photo",
  "role",
  "status",
  "createdAt",
  "updatedAt",
]);
export const selectFieldsForSuperAdmin = nestedSelectFields([
  "email",
  "phone",
  "photo",
  "role",
  "createdAt",
  "updatedAt",
]);

export const selectFieldsForStudent = nestedSelectFields([
  "email",
  "name",
  "phone",
  "profilePhoto",
  "uid",
  "batch",
  // "role",
  "status",
  // "address",
  // "dob",
  "gender",
  "bloodGroup",
  "group",
  "religion",
  // "emergencyContact",

  "fatherName",
  // "fatherNid",
  "fatherProfession",
  "fatherProfessionType",
  "fatherIncome",
  "motherName",
  // "motherNid",
  "motherProfession",
  "motherProfessionType",
  "motherIncome",
  // "guardianMobile",

  "previousSchool",
  "disability",
  "notes",

  "jscRoll",
  "jscReg",
  "jscBoard",
  "jscGpa",
  "jscYear",
  "jscExam",
  "sscRoll",
  "sscReg",
  "sscBoard",
  "sscGpa",
  "sscYear",
  "sscExam",
  "hscRoll",
  "hscReg",
  "hscBoard",
  "hscGpa",
  "hscYear",
  "hscExam",

  "collegeName",
  "collegeAddress",
  "collegeSession",
  "universityChance",
  "universityName",
  "universitySubject",
  "universitySession",
  "universityPosition",
  "universityRollNo",

  "presentDivision",
  "presentDistrict",
  "presentUpazila",
  "presentUnion",
  "presentPostOffice",
  "presentVillage",
  "presentHouse",

  "permanentDivision",
  "permanentDistrict",
  "permanentUpazila",
  "permanentUnion",
  "permanentPostOffice",
  "permanentVillage",
  "permanentHouse",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [];
