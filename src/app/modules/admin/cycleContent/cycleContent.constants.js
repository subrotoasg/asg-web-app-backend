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
  "classTitle",
  "description",
  "cycleSubjectChapter.title",
  "cycleSubjectChapter.chapter.chapterName",
  "cycleSubjectChapter.cycleSubject.subject.title",
  "cycleSubjectChapter.cycleSubject.cycle.title",
  "cycleSubjectChapter.cycleSubject.cycle.course.productName",
];
export const filterableFields = [
  "classTitle",
  "cycleSubjectChapter.cycleSubject.subject.title",
  "cycleSubjectChapter.cycleSubject.cycle.title",
  "cycleSubjectChapter.cycleSubject.cycle.course.productName",
];
export const sortableFields = ["classNo", "createdAt", "updatedAt"];

//nested Select fields
export const selectFields = nestedSelectFields([
  //cycle content
  "id",
  "classTitle",
  "classNo",
  "hostingType",
  "libraryId",
  "zoneSecurityKey",
  "videoUrl",
  "secondaryUrl",
  "description",
  "thumbneil",
  "instructor",
  "lectureSheet",
  "practiceSheet",
  "solutionSheet",
  "views",
  "createdAt",
  "videoId",
  "markedBook",
  //cycle subject chapter
  "cycleSubjectChapter.id",
  "cycleSubjectChapter.cycleSubjectChapterImage",
  "cycleSubjectChapter.title",
  //chapter
  "cycleSubjectChapter.chapter.id",
  "cycleSubjectChapter.chapter.chapterName",
  "cycleSubjectChapter.chapter.chapterNo",
  "cycleSubjectChapter.chapter.chapterImage",
  //cycle subject
  "cycleSubjectChapter.cycleSubject.id",
  "cycleSubjectChapter.cycleSubject.title",
  "cycleSubjectChapter.cycleSubject.cycleSubjectImage",
  //subject
  "cycleSubjectChapter.cycleSubject.subject.id",
  "cycleSubjectChapter.cycleSubject.subject.title",
  "cycleSubjectChapter.cycleSubject.subject.subjectImage",
  //cycle
  "cycleSubjectChapter.cycleSubject.cycle.id",
  "cycleSubjectChapter.cycleSubject.cycle.productId",
  "cycleSubjectChapter.cycleSubject.cycle.title",
  "cycleSubjectChapter.cycleSubject.cycle.cycleImage",
  "cycleSubjectChapter.cycleSubject.cycle.markAsArchieve",
  "cycleSubjectChapter.cycleSubject.cycle.archieveCycleId",
  "cycleSubjectChapter.cycleSubject.cycle.facebookGroup",
  //course
  "cycleSubjectChapter.cycleSubject.cycle.course.id",
  "cycleSubjectChapter.cycleSubject.cycle.course.productName",
  "cycleSubjectChapter.cycleSubject.cycle.course.ProductImage",
  "cycleSubjectChapter.cycleSubject.cycle.course.productFullName",
  "cycleSubjectChapter.cycleSubject.cycle.course.facebookGroup",
  "cycleSubjectChapter.cycleSubject.cycle.course.createdAt",
  "cycleSubjectChapter.cycleSubject.cycle.course.zoneSecurityKey",
]);

export const selectFieldsForDownload = nestedSelectFields([
  //cycle content
  "id",
  "classTitle",
  "classNo",
  "hostingType",
  "libraryId",
  "zoneSecurityKey",
  "videoUrl",
  "secondaryUrl",
  "description",
  "thumbneil",
  "instructor",
  "lectureSheet",
  "practiceSheet",
  "solutionSheet",
  "views",
  "createdAt",
  "videoId",
  "markedBook",
  //cycle subject chapter
  "cycleSubjectChapter.id",
  "cycleSubjectChapter.cycleSubjectChapterImage",
  "cycleSubjectChapter.title",
  //chapter
  "cycleSubjectChapter.chapter.id",
  "cycleSubjectChapter.chapter.chapterName",
  "cycleSubjectChapter.chapter.chapterNo",
  "cycleSubjectChapter.chapter.chapterImage",
  //cycle subject
  "cycleSubjectChapter.cycleSubject.id",
  "cycleSubjectChapter.cycleSubject.title",
  "cycleSubjectChapter.cycleSubject.cycleSubjectImage",
  //subject
  "cycleSubjectChapter.cycleSubject.subject.id",
  "cycleSubjectChapter.cycleSubject.subject.title",
  "cycleSubjectChapter.cycleSubject.subject.subjectImage",
  //cycle
  "cycleSubjectChapter.cycleSubject.cycle.id",
  "cycleSubjectChapter.cycleSubject.cycle.productId",
  "cycleSubjectChapter.cycleSubject.cycle.title",
  "cycleSubjectChapter.cycleSubject.cycle.cycleImage",
  "cycleSubjectChapter.cycleSubject.cycle.markAsArchieve",
  "cycleSubjectChapter.cycleSubject.cycle.archieveCycleId",
  "cycleSubjectChapter.cycleSubject.cycle.facebookGroup",
  //course
  "cycleSubjectChapter.cycleSubject.cycle.course.id",
  "cycleSubjectChapter.cycleSubject.cycle.course.productName",
  "cycleSubjectChapter.cycleSubject.cycle.course.ProductImage",
  "cycleSubjectChapter.cycleSubject.cycle.course.productFullName",
  "cycleSubjectChapter.cycleSubject.cycle.course.facebookGroup",
  "cycleSubjectChapter.cycleSubject.cycle.course.createdAt",
  "cycleSubjectChapter.cycleSubject.cycle.course.zoneSecurityKey",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "id",
  "classTitle",
  "classNo",
  "libraryId",
  "videoUrl",
  "secondaryUrl",
  "description",
  "instructor",
  "thumbneil",
  "lectureSheet",
  "instructor",
  "practiceSheet",
  "solutionSheet",
  "views",
  "createdAt",
];

//Cycle Chapter id  based pickQuery
export const pickQueryForCycleChapterBasedId = [
  Enums.queryFields.SORT_BY,
  Enums.queryFields.SORT_ORDER,
];
