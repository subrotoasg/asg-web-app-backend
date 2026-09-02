import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import {
  filterableFields,
  getAllselectFieldsForGetAllComments,
  searchableFields,
  selectFields,
  selectFieldsForGetAllComments,
  sendResponseFields,
  sortableFields,
} from "./comment.constant.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import config from "../../../config/index.js";
import { replayCommandSentToNotification } from "./comment.utlis.js";

//Get all Comment Services
const getAllCommentfromDb = async (query = {}, user = {}, hostName) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  let accessibleCourseIds = [];
  if (user?.adminId) {
    const accessibleCourses = await prisma.courseAdmin.findMany({
      where: { adminId: user.adminId, isDeleted: false },
      select: { courseId: true },
    });
    accessibleCourseIds = accessibleCourses?.map((c) => c.courseId);
  }

  // Host name
  let classContentRelation = null;
  let cycleContentRelation = null;

  if (
    hostName === config.frb_host_name ||
    hostName === config.frb_local_host_name
  ) {
    // FRB Hostname - classContent
    const frbConditions = [
      { Category: { contains: "Academic" } },
      { productName: { contains: "FRB" } },
      { cycleAvailable: false },
    ];

    if (accessibleCourseIds.length > 0) {
      frbConditions.push({ id: { in: accessibleCourseIds } });
    }

    classContentRelation = {
      courseSubjectChapter: {
        courseSubject: {
          course: {
            AND: frbConditions,
          },
        },
      },
    };
  } else if (
    hostName === config.academic_host_name ||
    hostName === config.academic_local_host_name
  ) {
    // Academic HostName - cycleContent
    const academicConditions = [{ cycleAvailable: true }];

    if (accessibleCourseIds.length > 0) {
      academicConditions.push({ id: { in: accessibleCourseIds } });
    }

    cycleContentRelation = {
      cycleSubjectChapter: {
        cycleSubject: {
          cycle: {
            course: {
              AND: academicConditions,
            },
          },
        },
      },
    };
  } else {
    // Admission Hostname - classContent
    const admissionConditions = [
      { Category: { contains: "Admission" } },
      { NOT: { Category: { contains: "Academic" } } },
      { cycleAvailable: false },
    ];

    if (accessibleCourseIds.length > 0) {
      admissionConditions.push({ id: { in: accessibleCourseIds } });
    }

    classContentRelation = {
      courseSubjectChapter: {
        courseSubject: {
          course: {
            AND: admissionConditions,
          },
        },
      },
    };
  }

  // Making Or Condition
  const contentConditions = [];

  if (classContentRelation) {
    contentConditions.push({
      classContent: classContentRelation,
    });
  }

  if (cycleContentRelation) {
    contentConditions.push({
      cycleContent: cycleContentRelation,
    });
  }

  // If No condition Matched
  if (contentConditions.length === 0) {
    return {
      data: [],
      meta: {
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        repliedComments: 0,
        pendingComments: 0,
        todayComments: 0,
        filteredTotalCount: 0,
      },
    };
  }

  // base queary
  const baseWhere = {
    AND: [
      {
        parentId: null,
        isDeleted: false,
        OR: contentConditions,
      },
      where && Object?.keys(where).length > 0 ? where : {},
    ]?.filter(Boolean),
  };

  // query.filterData: "all" | "pending" | "replied"
  const filterData = query?.filterData || "all";

  const listWhere = (() => {
    const finalWhere = { ...baseWhere };

    if (filterData === "pending") {
      finalWhere.AND = [
        ...(finalWhere.AND || []),
        {
          replies: {
            none: {
              isDeleted: false,
              adminId: { not: null },
            },
          },
        },
      ];
    } else if (filterData === "replied") {
      finalWhere.AND = [
        ...(finalWhere.AND || []),
        {
          replies: {
            some: {
              isDeleted: false,
              adminId: { not: null },
            },
          },
        },
      ];
    }

    return finalWhere;
  })();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // total count
  const totalCountWhere = {
    parentId: null,
    isDeleted: false,
    OR: contentConditions,
  };

  // Replies
  const repliedCountWhere = {
    AND: [
      {
        parentId: null,
        isDeleted: false,
        OR: contentConditions,
      },
      where && Object.keys(where).length > 0 ? where : {},
      {
        replies: {
          some: { isDeleted: false, adminId: { not: null } },
        },
      },
    ]?.filter(Boolean),
  };

  // Today Count
  const todayCountWhere = {
    AND: [
      {
        parentId: null,
        isDeleted: false,
        OR: contentConditions,
      },
      {
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    ],
  };

  const [
    totalCount,
    comments,
    filteredTotalCount,
    repliedComments,
    todayComments,
  ] = await prisma.$transaction([
    // total count
    prisma.classComment.count({
      where: totalCountWhere,
    }),

    // Comments Data
    prisma.classComment.findMany({
      where: listWhere,
      orderBy,
      skip,
      take,
      select: getAllselectFieldsForGetAllComments,
    }),

    // Filtered Count
    prisma.classComment.count({
      where: listWhere,
    }),

    // Replay Comment Count
    prisma.classComment.count({
      where: repliedCountWhere,
    }),

    // Today Comment List
    prisma.classComment.count({
      where: todayCountWhere,
    }),
  ]);

  const pendingComments = totalCount - repliedComments;

  const totalPages = Math.ceil(filteredTotalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: comments,
    meta: {
      totalCount,
      totalPages,
      currentPage,
      repliedComments,
      pendingComments,
      todayComments,
      filteredTotalCount,
    },
  };
};

//Get single Comment Services
const getSingleCommentfromDb = async (classContentId) => {
  async function getReplies(commentId) {
    const replies = await prisma.classComment.findMany({
      where: { parentId: commentId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      select: selectFields,
    });

    return Promise.all(
      replies?.map(async (r) => ({
        ...r,
        replies: await getReplies(r.id),
      })),
    );
  }
  const parentComments = await prisma.classComment.findMany({
    where: {
      // classContentId: classContentId,
      OR: [
        { classContentId: classContentId },
        { cycleContentId: classContentId },
      ],
      parentId: null,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    select: selectFields,
  });

  // Add nested replies dynamically
  const result = await Promise.all(
    parentComments?.map(async (c) => ({
      ...c,
      replies: await getReplies(c.id),
    })),
  );

  return result;
};

//Create Comment Services
const createCommentIntoDb = async (payload) => {
  const { comment, classContentId, cycleContentId, studentId, adminId } =
    payload || {};

  const createdData = transformUpdatedFields(
    {
      comment,
      classContentId,
      cycleContentId,
      studentId,
      adminId,
    },
    [],
  );
  const result = await prisma.classComment.create({
    data: createdData,
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Reply to Comment Services
const replyToCommentIntoDb = async (payload) => {
  const {
    comment,
    classContentId,
    cycleContentId,
    studentId,
    adminId,
    parentId,
  } = payload || {};
  const replayData = transformUpdatedFields(
    {
      comment,
      classContentId,
      cycleContentId,
      studentId,
      adminId,
      parentId,
    },
    [],
  );
  const result = await prisma.classComment.create({
    data: replayData,
  });
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);

  //replay notification
  try {
    const res = await replayCommandSentToNotification(replayData);
  } catch (error) {
    console.log("Error = ", error.message);
  }
  return response;
};

//Update Comment Services
const updateCommentIntoDb = async (CommentId, payload) => {
  const { comment } = payload;
  const result = await prisma.classComment.update({
    where: { id: CommentId },
    data: {
      comment: comment,
    },
  });
  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

//Delete Comment Services
const deleteCommentFromDb = async (CommentId) => {
  await prisma.classComment.update({
    where: { id: CommentId },
    data: {
      isDeleted: true,
    },
  });
  return {};
};
export const CommentServices = {
  getAllCommentfromDb,
  getSingleCommentfromDb,
  replyToCommentIntoDb,
  createCommentIntoDb,
  updateCommentIntoDb,
  deleteCommentFromDb,
};
