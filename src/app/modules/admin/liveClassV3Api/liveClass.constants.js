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

export const sortableFields = ["createdAt", "updatedAt"];

//select course for cycles
export const selectFieldsForCycleLive = nestedSelectFields([
  "id",
  "courseId",
  "productId",
  "productName",
  "productFullName",
  "ProductImage",
  "Parent",
  "Platinum",
  "Category",
  "SubCategory",
  "currency_amount",
  "Permalink",
  "facebookGroup",
  "markAsArchieve",
  "archieveCourseId",
  "superAdminId",
  "cycleAvailable",
  "cycle.id",
  "createdAt",
]);

//Handle Nested Select fields
export const selectFields = nestedSelectFields([
  "id",
  "title",
  "description",
  "instructor",
  "startTime",
  "endTime",
  "videoId",
  "secondaryUrl",
  "libraryId",
  "url",
  "stream",
  "status",
  "thumbnailPath",
  "thumbnail256x144Path",
  "courseSubjectChapter.id",
  "courseSubjectChapter.title",
  "courseSubjectChapter.chapter.id",
  "courseSubjectChapter.chapter.chapterName",
  "courseSubjectChapter.chapter.chapterNo",
  "courseSubjectChapter.courseSubject.course.id",
  "courseSubjectChapter.courseSubject.course.title",
  "courseSubjectChapter.courseSubject.course.productName",
  "courseSubjectChapter.courseSubject.course.productFullName",
  "courseSubjectChapter.courseSubject.course.courseAdmin",
  "courseSubjectChapter.courseSubject.course.Permalink",
  "courseSubjectChapter.courseSubject.course.facebookGroup",
  "courseSubjectChapter.courseSubject.id",
  "courseSubjectChapter.courseSubject.title",
  "courseSubjectChapter.courseSubject.subject.id",
  "courseSubjectChapter.courseSubject.subject.title",
  "cycleSubjectChapter.id",
  "cycleSubjectChapter.title",
  "cycleSubjectChapter.chapter.id",
  "cycleSubjectChapter.chapter.chapterName",
  "cycleSubjectChapter.chapter.chapterNo",
  "cycleSubjectChapter.cycleSubject.id",
  "cycleSubjectChapter.cycleSubject.cycle.id",
  "cycleSubjectChapter.cycleSubject.cycle.title",
  "cycleSubjectChapter.cycleSubject.cycle.cycleImage",
  "cycleSubjectChapter.cycleSubject.cycle.Permalink",
  "cycleSubjectChapter.cycleSubject.cycle.course.id",
  "cycleSubjectChapter.cycleSubject.cycle.course.title",
  "cycleSubjectChapter.cycleSubject.cycle.course.productName",
  "cycleSubjectChapter.cycleSubject.cycle.course.productFullName",
  "cycleSubjectChapter.cycleSubject.cycle.course.Permalink",
  "cycleSubjectChapter.cycleSubject.cycle.course.facebookGroup",
  "cycleSubjectChapter.cycleSubject.subject.id",
  "cycleSubjectChapter.cycleSubject.subject.title",
  "thumbnail",
  "createdAt",
  "updatedAt",
  //v2
  "customHlsUrl",
  "publicEmbed",
  "ingestType",
  "rtmp_url",
  "rtmp_streamKey",
  "isPredefined",
  "teacherButton",
]);

export const uploadSelecFields = nestedSelectFields([
  "id",
  "title",
  "description",
  "endTime",
  "status",
  "thumbnail",
  "vimeo",
  "createdAt",
  "updatedAt",
]);

//Response Send Create and Update Fields
export const sendResponseFields = [
  "createdAt",
  "updatedAt",
  "id",
  "title",
  "description",
  "instructor",
  "startTime",
  "thumbnail",
  "status",
  "slidesUrl",
  "practiceSheet",
  "solutionSheet",
  "lectureSheet",
  "secondaryUrl",
  "libraryId",
  //v2
  "customHlsUrl",
  "publicEmbed",
  "ingestType",
  "rtmp_url",
  "rtmp_streamKey",
  "isPredefined",
  "teacherButton",
];

// Bunny Status webhooks status
export const bunnyVideoStatusMap = {
  0: "queued",
  1: "processing",
  2: "encoding",
  3: "recorded",
  4: "playable",
  5: "failed",
  6: "uploadStarted",
  7: "uploadFinished",
  8: "uploadFailed",
  9: "captionsGenerated",
  10: "metaGenerated",
};

export const mediaServers = {
  europe: "https://media.aparsclassroom.com",
  malaysia: "https://media.asgshop.my",
};
