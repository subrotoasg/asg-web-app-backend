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
  "course.productName",
  "course.productFullName",
];

export const searchableFieldsForGetAllStudents = [
  "name",
  "phone",
  "email",
  "address",
];

export const searchableFieldsForGetCourseStudents = [
  "student.name",
  "student.phone",
  "student.email",
];

export const searchableFieldsForGetCycleStudents = [
  "student.name",
  "student.phone",
  "student.email",
];

export const filterableFields = [
  "course.productName",
  "course.productFullName",
  "course.Category",
  "course.SubCategory",
];

export const filterableFieldsForGetAllStudents = [
  "student.name",
  "student.phone",
  "student.email",
];

export const filterableFieldsForGetAllStudentForCx = [
  "course.course.productId",
  "course.course.productName",
  "course.course.productFullName",
];

export const filterableFieldsForGetCourseStudents = [
  "name",
  "phone",
  "email",
  "address",
];

export const filterableFieldsForGetCycleStudents = [
  "name",
  "phone",
  "email",
  "address",
];

export const sortableFields = ["createdAt"];

export const sortableFieldsForCycleStudents = ["createdAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  "studentId",
  "courseId",
  "accessCode",
  "course.productId",
  "course.productName",
  "course.productFullName",
  "course.ProductImage",
  "course.Parent",
  "course.Platinum",
  "course.Category",
  "course.hasApp",
  "course.SubCategory",
  "course.markAsArchieve",
  "course.archieveCourseId",
  "course.currency_amount",
  "course.Permalink",
  "course.facebookGroup",
  "course.cycleAvailable",
  "student.name",
  "createdAt",
]);

export const selectFieldsForBannedStudents = nestedSelectFields([
  "id",
  "name",
  "phone",
  "email",
  "address",
  "remarks",
  "status",
]);

export const selectFieldsForCourseStudents = nestedSelectFields([
  "course.productName",
  "course.productFullName",
  "course.ProductImage",
  "course.facebookGroup",
  "course.hasApp",
  "student.name",
  "student.phone",
  "student.email",
  "createdAt",
]);

export const selectFieldsForCycleStudents = nestedSelectFields([
  "cycle.title",
  "cycle.cycleFullName",
  "cycle.cycleImage",
  "cycle.facebookGroup",
  // "course.hasApp",
  "student.name",
  "student.phone",
  "student.email",
  "createdAt",
]);

export const selectFieldsForGetAllStudents = nestedSelectFields([
  "id",
  "name",
  "phone",
  "email",
  "address",
  "profilePhoto",
  "status",
  "createdAt",
  "course.course.id",
  "course.course.productName",
  "course.course.productFullName",
  "course.course.ProductImage",
  "course.course.Category",
  "course.course.hasApp",
  "course.course.SubCategory",
  "course.course.currency_amount",
  "course.course.facebookGroup",
]);

export const selectFieldsForGetAllStudentsForCx = nestedSelectFields([
  "id",
  "name",
  "phone",
  "email",
  "uid",
  "address",
  "profilePhoto",
  "status",
  "createdAt",
  "course.courseId",
  "course.accessCode",
  "course.course.productId",
  "course.course.productName",
  "course.course.productFullName",
  "course.course.ProductImage",
  "course.course.hasApp",
  "course.course.facebookGroup",
  "cycle.cycleId",
  "cycle.accessCode",
  "cycle.cycle.productId",
  "cycle.cycle.title",
  "cycle.cycle.Permalink",
  "cycle.cycle.facebookGroup",
  "cycle.cycle.cycleImage",
  "cycle.cycle.course.productName",
  "cycle.cycle.course.productFullName",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [];
