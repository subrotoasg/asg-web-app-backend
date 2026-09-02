import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  selectFieldsForDownload,
  sendResponseFields,
  sortableFields,
} from "./notes.constant.js";
import {
  classNoToNumber,
  NO_NOTE_HTML,
  sortSubjectsByChapter,
} from "./notes.helpers.js";

//Get all Notes Services
const getAllNotesfromDb = async (query) => {
  console.log(query);
};

//Get single Notes Services
const getSingleNotesfromDb = async (payload = {}) => {
  const { studentId, id } = payload || {};
  const notes = await prisma.classNote.findFirst({
    where: {
      AND: [
        { OR: [{ classContentId: id }, { cycleContentId: id }] },
        {
          studentId,
        },
      ],
    },
    select: selectFields,
  });
  return notes;
};

//Create Notes Services
const createNotesIntoDb = async (payload = {}) => {
  const { classContentId, cycleContentId, studentId, note } = payload;
  const where = {};
  const createData = {
    classContentId: classContentId || null,
    cycleContentId: cycleContentId || null,
    studentId: studentId || null,
    note,
  };

  if (classContentId)
    where.classContentId_studentId = { classContentId, studentId };
  else where.cycleContentId_studentId = { cycleContentId, studentId };

  const result = await prisma.classNote.upsert({
    where,
    update: {
      note,
    },
    create: createData,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Update Notes Services
const updateNotesIntoDb = async (noteId, payload = {}) => {
  console.log(noteId, payload);
};

//Delete Notes Services
const deleteNotesFromDb = async (noteId) => {
  console.log(noteId);
};

//download notes
const downloadNotesIntoDb = async (subjectId, type, payload = {}) => {
  const { studentId } = payload;
  const normalizedType = String(type || "COURSE").toUpperCase();

  if (!studentId || !subjectId) return { subject: null, chapters: [] };

  // ---------------- COURSE ----------------
  if (normalizedType === "COURSE") {
    const subject = await prisma.courseSubject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        title: true,
        subject: {
          select: {
            title: true,
          },
        },
        courseSubjectChapter: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                chapterName: true,
              },
            },
            classContent: {
              where: { isDeleted: false },
              select: {
                classNo: true,
                classTitle: true,
                classNote: {
                  where: { studentId, isDeleted: false },
                  select: {
                    id: true,
                    note: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!subject) return { subject: null, chapters: [] };
    const sortedCourseSubjectChapter = sortSubjectsByChapter(
      subject?.courseSubjectChapter,
    );
    const chapters = (
      sortedCourseSubjectChapter ||
      subject?.courseSubjectChapter ||
      []
    )?.map((ch) => {
      const classes = (ch?.classContent || [])
        ?.map((cc) => {
          const noteRow = cc?.classNote?.[0];
          return {
            classNo: cc?.classNo || "",
            classTitle: cc?.classTitle || "",
            noteText: noteRow?.note || NO_NOTE_HTML,
            hasNote: Boolean(noteRow?.note),
          };
        })
        ?.sort(
          (a, b) => classNoToNumber(a?.classNo) - classNoToNumber(b?.classNo),
        );

      return {
        chapter: {
          id: ch?.id,
          title:
            ch?.title ||
            ch?.chapter?.chapterName ||
            `অধ্যায়ঃ __________________________`,
        },
        classes,
      };
    });
    return {
      subject: {
        id: subject?.id,
        title:
          subject?.title ||
          subject?.subject?.title ||
          "বিষয়ঃ __________________________",
        type: "COURSE",
      },
      chapters,
    };
  }
  // ---------------- CYCLE ----------------
  if (normalizedType === "CYCLE") {
    const subject = await prisma.cycleSubject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        title: true,
        subject: {
          select: {
            title: true,
          },
        },
        cycleSubjectChapter: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            chapter: {
              select: {
                chapterName: true,
              },
            },
            cycleContent: {
              where: { isDeleted: false },
              select: {
                classNo: true,
                classTitle: true,
                classNote: {
                  where: { studentId, isDeleted: false },
                  select: {
                    id: true,
                    note: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!subject) return { subject: null, chapters: [] };
    const sortedCycleSubjectChapter = sortSubjectsByChapter(
      subject?.cycleSubjectChapter,
    );
    const chapters = (
      sortedCycleSubjectChapter ||
      subject?.cycleSubjectChapter ||
      []
    )?.map((ch) => {
      const classes = (ch?.cycleContent || [])
        ?.map((cc) => {
          const noteRow = cc?.classNote?.[0];
          return {
            classNo: cc?.classNo || "",
            classTitle: cc?.classTitle || "",
            noteText: noteRow?.note || NO_NOTE_HTML,
            hasNote: Boolean(noteRow?.note),
          };
        })
        ?.sort(
          (a, b) => classNoToNumber(a.classNo) - classNoToNumber(b.classNo),
        );
      return {
        chapter: {
          id: ch?.id,
          title:
            ch?.title ||
            ch?.chapter?.chapterName ||
            `অধ্যায়ঃ __________________________`,
        },
        classes,
      };
    });

    return {
      subject: {
        id: subject?.id,
        title:
          subject?.title ||
          subject?.subject.title ||
          "বিষয়ঃ __________________________ ",
        type: "CYCLE",
      },
      chapters,
    };
  }

  return { subject: null, chapters: [] };
};
export const NotesServices = {
  getAllNotesfromDb,
  getSingleNotesfromDb,
  createNotesIntoDb,
  updateNotesIntoDb,
  deleteNotesFromDb,
  downloadNotesIntoDb,
};
