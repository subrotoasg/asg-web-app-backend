import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { extractMediaLinks } from "../../../../helper/extractMediaLinks.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { removeFiles } from "../../../../shared/fileRemove.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import {
  filterableFields,
  searchableFields,
  searchableFieldsForAnswer,
  selectFields,
  selectFieldsForAnswer,
  selectFieldsForAnswerComment,
  sendResponseFields,
  sortableFields,
} from "./quora.constants.js";
import { addOcrJob } from "../../../queueNworker/queues/ocrQueue.js";
import { Enums } from "../../../constant/enums.js";
import jwt from "jsonwebtoken";
import config from "../../../config/index.js";
import { addGenerateAnswerCommentJob } from "../../../queueNworker/queues/aiAnswerCommentQueue.js";
import { verifyUserTokenWithSignature } from "../../authentication/auth.utlis.js";

//Create Class Services
const postNewQuora = async (quoraImages, payload) => {
  const { content, studentId, courseId, subject, topic } = payload;

  const checkCourse = await prisma.course.findUnique({
    where: {
      id: courseId,
    },
  });

  if (!checkCourse) {
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Invalid Course Id");
  }

  const result = await prisma.$transaction(async (tx) => {
    const data = {
      content,
      studentId,
      courseId,
      subject,
      topic,
    };

    //todo: before creating check if he/she has any unsolved q and also check for courseQuoraDaily limit for that particular course.

    const checkForUnsolved = await tx.quora.findFirst({
      where: {
        AND: [
          { studentId: studentId },
          {
            OR: [
              {
                status: Enums.quoraStatus.UNSOLVED,
              },
              {
                status: Enums.quoraStatus.PENDING,
              },
            ],
          },
        ],
      },
    });

    if (checkForUnsolved) {
      throw new AppErrors(
        StatusCodes.NOT_ACCEPTABLE,
        "বর্তমানে তোমার একটি অমীমাংসিত প্রশ্ন রয়েছে, ঐ প্রশ্নের যথাযথ সমাধানটি mark as solve সিলেক্ট করে এগিয়ে জাও।",
      );
    }

    //check for reset daily limit
    const checkForRemaining = await tx.courseQuoraDailyLimit.findFirst({
      where: {
        courseId: courseId,
      },
    });

    const updatedAt = new Date(checkForRemaining?.updatedAt);
    const localUpdatedAt = new Date(updatedAt.getTime() + 6 * 60 * 60 * 1000);

    const now = new Date();
    const localNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const isSameDay =
      localUpdatedAt.getFullYear() === localNow.getFullYear() &&
      localUpdatedAt.getMonth() === localNow.getMonth() &&
      localUpdatedAt.getDate() === localNow.getDate();

    if (isSameDay) {
      if (!checkForRemaining || checkForRemaining?.dailyLimit <= 0) {
        throw new AppErrors(
          StatusCodes.NOT_ACCEPTABLE,
          "নির্বাচিত কোর্সের জন্য দৈনিক প্রশ্ন করার সীমা পূর্ণ হয়েছে। অনুগ্রহ করে আপনার কোর্স শিক্ষকের সাথে যোগাযোগ করুন অতিরিক্ত সীমা পেতে,অথবা আগামীকাল পর্যন্ত অপেক্ষা করুন।",
        );
      }
    } else {
      const resetLimit = await tx.courseQuoraDailyLimit.update({
        where: {
          id: checkForRemaining?.id,
        },
        data: {
          dailyLimit:
            Number(checkForRemaining?.lastLimit) +
            Number(checkForRemaining?.dailyLimit),
        },
      });
    }

    const updateCourseDailyLimit = await tx.courseQuoraDailyLimit.update({
      where: { id: checkForRemaining?.id },
      data: {
        dailyLimit: { decrement: 1 },
      },
    });

    const quora = await tx.quora.create({
      data,
    });

    let fileInsertCount = 0;
    if (quoraImages && quoraImages?.length > 0) {
      const quoraImageData = quoraImages?.map((el, idx) => {
        return {
          quoraId: quora?.id,
          imageUrl: el,
          order: idx,
        };
      });

      const quoraImagePost = await tx.quoraImage.createMany({
        data: quoraImageData,
      });

      fileInsertCount = quoraImagePost.count;
    }
    await addOcrJob(quora?.id);
    return {
      ...quora,
      fileInsertCount: fileInsertCount,
    };
  });

  const response = pickCreateAndUpdateResponse(result, sendResponseFields);
  return response;
};

const forcePostQuora = async (quoraId, payload) => {
  const { studentId } = payload;
  const updateStatus = await prisma.quora.update({
    where: {
      id: quoraId,
      status: Enums.quoraStatus.DUPLICATE,
      studentId: studentId,
    },
    data: {
      status: Enums.quoraStatus.UNSOLVED,
    },
  });

  if (!updateStatus)
    throw new AppErrors(StatusCodes.BAD_REQUEST, "Quora not found to update");

  return true;
};

const postAnswer = async (quoraId, answerFile, payload) => {
  const { solverId, studentId, content } = payload;

  const { imageUrl, docUrl, audioUrl } = extractMediaLinks(answerFile);

  const getQuora = await prisma.quora.findFirst({
    where: {
      id: quoraId,
      status: Enums.quoraStatus.UNSOLVED,
    },
  });

  if (!getQuora) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "This quora is already solved.",
    );
  }

  if (solverId) {
    const getCount = await prisma.answer.count({
      where: {
        quoraId: quoraId,
        solverId: solverId,
      },
    });

    if (getCount >= 3) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "you already answered twice to this quora.",
      );
    }
  }

  if (studentId) {
    const getCount = await prisma.answer.count({
      where: {
        quoraId: quoraId,
        studentId: studentId,
      },
    });

    if (getCount >= 3) {
      throw new AppErrors(
        StatusCodes.BAD_REQUEST,
        "you already answered twice, go and study!",
      );
    }
  }

  const data = {
    quoraId: quoraId,
    ...(solverId && { solverId: solverId }),
    ...(studentId && { studentId: studentId }),
    content: content,
    answerFile: imageUrl || docUrl,
    ...(audioUrl && { audioFile: audioUrl }),
  };

  const response = await prisma.answer.create({
    data: data,
  });

  return true;
};

const markAsSolved = async (answerId, payload) => {
  const { studentId } = payload;

  const checkAnswer = await prisma.answer.findUnique({
    where: {
      id: answerId,
    },
  });

  if (!checkAnswer)
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "answer trying to mark as solve not found.",
    );

  //todo mark as solve

  const checkQuora = await prisma.quora.findFirst({
    where: {
      id: checkAnswer?.quoraId,
      studentId: studentId,
      status: Enums.quoraStatus.UNSOLVED,
    },
  });

  if (checkQuora) {
    const getLatestCreditModel = await prisma.creditModel.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    if (checkAnswer?.solverId && !checkAnswer?.isAi) {
      const distributeCredits = await prisma.$transaction(async (tx) => {
        const updateQuora = await tx.quora.update({
          where: {
            id: checkQuora?.id,
          },
          data: {
            status: Enums.quoraStatus.SOLVED,
            asgshop: getLatestCreditModel?.asgshop,
            solver: getLatestCreditModel?.solver,
          },
        });

        const getSolver = await tx.solver.findUnique({
          where: {
            id: checkAnswer?.solverId,
          },
        });

        const newRank =
          getSolver?.totalSolved + 1 >= Enums.rankCredit.TUTOR &&
          getSolver?.totalSolved + 1 < Enums.rankCredit.EDUCATOR
            ? Enums.solverRank.TUTOR
            : getSolver?.totalSolved + 1 >= Enums.rankCredit.EDUCATOR &&
                getSolver?.totalSolved + 1 < Enums.rankCredit.SCHOLAR
              ? Enums.solverRank.EDUCATOR
              : getSolver?.totalSolved + 1 >= Enums.rankCredit.SCHOLAR &&
                  getSolver?.totalSolved + 1 < Enums.rankCredit.MENTOR
                ? Enums.solverRank.SCHOLAR
                : getSolver?.totalSolved + 1 >= Enums.rankCredit.MENTOR &&
                    getSolver?.totalSolved + 1 < Enums.rankCredit.SAGE
                  ? Enums.solverRank.MENTOR
                  : getSolver?.totalSolved + 1 >= Enums.rankCredit.SAGE
                    ? Enums.rankCredit.SAGE
                    : getSolver?.rank;

        const updateSolver = await tx.solver.update({
          where: {
            id: getSolver?.id,
          },
          data: {
            rank: newRank,
            lifeTimeCredit: {
              increment: getLatestCreditModel?.solver,
            },
            availableCredit: {
              increment: getLatestCreditModel?.solver,
            },
            totalSolved: {
              increment: 1,
            },
          },
        });

        const markAnswer = await tx.answer.update({
          where: {
            id: checkAnswer?.id,
          },
          data: {
            isAccepted: true,
          },
        });

        return true;
      });
    } else {
      const distributeCredits = await prisma.$transaction(async (tx) => {
        const updateQuora = await tx.quora.update({
          where: {
            id: checkQuora?.id,
          },
          data: {
            status: Enums.quoraStatus.SOLVED,
            asgshop: getLatestCreditModel?.perQuoraCredit,
          },
        });

        const markAnswer = await tx.answer.update({
          where: {
            id: checkAnswer?.id,
          },
          data: {
            isAccepted: true,
          },
        });
        return true;
      });
    }
    return true;
  } else {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "the quora is already solved or not found.",
    );
  }
};

const getQuoras = async (token = "", query = {}, payload) => {
  let decoded;
  if (token) {
    decoded = verifyUserTokenWithSignature(token);
    // decoded = jwt.verify(token, config.jwt_access_secret_key, {
    //   algorithms: ["HS256"],
    // });
    // if (!decoded) {
    //   throw new AppErrors(StatusCodes.UNAUTHORIZED, "Invalid token");
    // }
  }

  const { quoraType, ...rest } = query;

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const result = await prisma.quora.findMany({
    where: {
      AND: [
        quoraType === Enums.quoraFilter.PERSONAL //quoras only can be done by students so decoded apply to students
          ? decoded && decoded?.id
            ? {
                studentId: decoded?.id,
                ...where,
              }
            : { id: { in: [] } }
          : {
              NOT: [
                { status: Enums.quoraStatus.PENDING },
                { status: Enums.quoraStatus.DUPLICATE },
              ],
              ...where,
            },
      ],
    },
    skip,
    take,
    orderBy,
    select: { ...selectFields, _count: { select: { answer: true } } },
  });

  const totalCount = await prisma.quora.count({
    where: {
      AND: [
        quoraType === Enums.quoraFilter.PERSONAL //quoras only can be done by students so decoded apply to students
          ? decoded && decoded?.id
            ? {
                studentId: decoded?.id,
                ...where,
              }
            : { id: { in: [] } }
          : {
              NOT: [
                { status: Enums.quoraStatus.PENDING },
                { status: Enums.quoraStatus.DUPLICATE },
              ],
              ...where,
            },
      ],
    },
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / take);

  //calculate Current Page
  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: result,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
  };
};

const getQuoraDetails = async (quoraId, query = {}, payload) => {
  const { studentId, solverId } = payload;

  const getTheQuora = await prisma.quora.findUnique({
    where: {
      id: quoraId,
    },
    select: { ...selectFields, studentId: true },
  });

  const getSimilarQuoras = await prisma.answer.findFirst({
    where: {
      quoraId: quoraId,
      isAi: false,
      solverId: null,
      studentId: null,
      content: null,
    },
    select: {
      similarQuoras: true,
    },
  });

  let similarQuoras = [];

  if (getSimilarQuoras) {
    for (const q of getSimilarQuoras?.similarQuoras) {
      const getQuora = await prisma.quora.findFirst({
        where: {
          id: q,
        },
        select: selectFields,
      });

      const getAnswers = await prisma.answer.findFirst({
        where: {
          quoraId: q,
        },
        select: selectFieldsForAnswer,
      });

      similarQuoras.push({ quora: getQuora, answer: getAnswers });
    }
  }

  const getAiAnswer = await prisma.answer.findFirst({
    where: {
      quoraId: quoraId,
      isAi: true,
    },
    select: selectFieldsForAnswer,
  });

  const { skip, take, orderBy, where } = buildQueryOptions(
    query,
    searchableFieldsForAnswer,
  );

  const getSolversAnswers = await prisma.answer.findMany({
    where: {
      quoraId: quoraId,
      solverId: {
        not: null,
      },
      isAi: false,
    },
    skip,
    take,
    orderBy: [
      { isAccepted: "desc" },
      { upvotes: "desc" },
      { createdAt: "desc" },
      { downvotes: "asc" },
    ],
    select: selectFieldsForAnswer,
  });

  let getSolversAnswersWithOwnerShip = getSolversAnswers;

  if (solverId) {
    getSolversAnswersWithOwnerShip = getSolversAnswers.map((el) => {
      if (el?.solverId === solverId) return { ...el, own: true };
    });
  }

  const totalCount = await prisma.answer.count({
    where: {
      quoraId: quoraId,
      isAi: false,
    },
  });

  const totalPages = Math.ceil(totalCount / take);

  const currentPage = Math.ceil(skip / take) + 1;

  return {
    data: {
      quora: getTheQuora,
      similrQuoras: solverId ? null : similarQuoras,
      aiAnswer: solverId ? null : getAiAnswer,
      answers: getSolversAnswersWithOwnerShip,
      isOwner: getTheQuora?.studentId === studentId,
    },
    meta: {
      totalCount,
      totalPages,
      currentPage,
      hasMore: skip + take < totalCount,
    },
  };
};

const getSimilarSolvedQuoras = async (qid) => {
  const similarityThreshold = 0.75;
  const limit = 3;

  const similarQuoras = await prisma.$queryRaw`
  WITH target AS (
    SELECT embedding 
    FROM "questionEmbeddings" 
    WHERE "quoraId" = ${qid}::uuid
    LIMIT 1
  )
  SELECT 
    q.id,
    q.content,
    q.status,
    qe."quoraId",
    qe.embedding <=> (SELECT embedding FROM target) as distance,
    1 - (qe.embedding <=> (SELECT embedding FROM target)) as similarity,
    a.id as answer_id

  FROM "questionEmbeddings" qe
  JOIN quoras q ON q.id = qe."quoraId"::uuid
  JOIN answers a ON a."quoraId" = q.id
  WHERE qe."quoraId" != ${qid}::uuid
    AND q.status = 'SOLVED'
    AND qe.embedding IS NOT NULL
    AND a."isAccepted" = true
    AND a."isDeleted" = false
    AND (a."similarQuoras" IS NULL OR array_length(a."similarQuoras", 1) IS NULL OR array_length(a."similarQuoras", 1) = 0)
    AND 1 - (qe.embedding <=> (SELECT embedding FROM target)) > ${similarityThreshold}
  ORDER BY qe.embedding <=> (SELECT embedding FROM target)
  LIMIT ${limit}
`;

  return similarQuoras;
};

const giveUpvotes = async (answerId, payload) => {
  const { studentId, adminId, superAdminId, solverId } = payload;

  const userId = studentId || adminId || superAdminId || solverId;

  const checkUpvote = await prisma.vote.findFirst({
    where: {
      answerId: answerId,
      voterId: userId,
    },
  });

  if (!checkUpvote) {
    const giveUpvote = await prisma.vote.create({
      data: {
        answerId: answerId,
        voterId: userId,
      },
    });

    const countUpvote = await prisma.answer.update({
      where: {
        id: answerId,
      },
      data: {
        upvotes: {
          incrment: 1,
        },
      },
    });
  } else {
    if (!checkUpvote?.isUpvote) {
      const updateVote = await prisma.vote.update({
        where: {
          answerId: answerId,
          voterId: userId,
        },
        data: {
          isUpvote: true,
        },
      });

      const changeVote = await prisma.answer.update({
        where: {
          id: answerId,
        },
        data: {
          downvotes: {
            decrement: 1,
          },
          upvotes: {
            increment: 1,
          },
        },
      });
    }
  }

  return true;
};

const giveDownvotes = async (answerId, payload) => {
  const { studentId, adminId, superAdminId, solverId } = payload;

  const userId = studentId || adminId || superAdminId || solverId;

  const checkDownvote = await prisma.vote.findFirst({
    where: {
      answerId: answerId,
      voterId: userId,
    },
  });

  if (!checkDownvote) {
    const giveDownvote = await prisma.vote.create({
      data: {
        answerId: answerId,
        voterId: userId,
        isUpvote: false,
      },
    });

    const countDownvote = await prisma.answer.update({
      where: {
        id: answerId,
      },
      data: {
        downvotes: {
          incrment: 1,
        },
      },
    });
  } else {
    if (checkDownvote?.isUpvote) {
      const updateVote = await prisma.vote.update({
        where: {
          answerId: answerId,
          voterId: userId,
        },
        data: {
          isUpvote: false,
        },
      });

      const changeVote = await prisma.answer.update({
        where: {
          id: answerId,
        },
        data: {
          downvotes: {
            increment: 1,
          },
          upvotes: {
            decrement: 1,
          },
        },
      });
    }
  }

  return true;
};

const commentOnAnswer = async (answerId, uploadFiles, payload) => {
  const { studentId, solverId, comments } = payload;
  const { imageUrl, audioUrl } = extractMediaLinks(uploadFiles);

  const checkAnswer = await prisma.answer.findUnique({
    where: {
      id: answerId,
    },
  });

  const checkQuora = await prisma.quora.findUnique({
    where: {
      id: checkAnswer?.quoraId,
    },
  });

  if (studentId && checkQuora?.studentId !== studentId)
    throw new AppErrors(StatusCodes.FORBIDDEN, "read only");

  if (solverId && checkAnswer?.solverId !== solverId)
    throw new AppErrors(StatusCodes.FORBIDDEN, "read only");

  if (checkQuora?.status === Enums.quoraStatus.SOLVED) return true;

  if (checkAnswer && checkAnswer?.isAi) {
    //todo check for answer comments limit both student and solver/ai end

    const checkCommentLimit = await prisma.answerComment.count({
      where: {
        answerId: answerId,
        studentId: studentId,
      },
    });

    if (
      checkCommentLimit &&
      checkCommentLimit >= Number(config.answer_comment_limit)
    ) {
      throw new AppErrors(
        StatusCodes.LOCKED,
        "conversation under this answer has reached its limit.",
      );
    }

    const doComment = await prisma.answerComment.create({
      data: {
        answerId: answerId,
        studentId: studentId,
        comments: comments,
      },
    });

    await addGenerateAnswerCommentJob(answerId);
  } else {
    if (studentId) {
      const checkCommentLimit = await prisma.answerComment.count({
        where: {
          answerId: answerId,
          studentId: studentId,
        },
      });

      if (
        checkCommentLimit &&
        checkCommentLimit >= Number(config.answer_comment_limit)
      ) {
        throw new AppErrors(
          StatusCodes.LOCKED,
          "conversation under this answer has reached its limit.",
        );
      }

      const doComment = await prisma.answerComment.create({
        data: {
          answerId: answerId,
          studentId: studentId,
          comments: comments,
        },
      });
    } else if (solverId) {
      const checkCommentLimit = await prisma.answerComment.count({
        where: {
          answerId: answerId,
          solverId: solverId,
        },
      });

      if (
        checkCommentLimit &&
        checkCommentLimit >= Number(config.answer_comment_limit)
      ) {
        throw new AppErrors(
          StatusCodes.LOCKED,
          "conversation under this answer has reached its limit.",
        );
      }

      const data = {
        answerId: answerId,
        solverId: solverId,
        comments: comments,
        commentFile: imageUrl,
        audioFile: audioUrl,
      };

      const doComment = await prisma.answerComment.create({
        data: data,
      });
    }
  }
  return true;
};

const getAnswerComments = async (answerId, payload) => {
  const { studentId, solverId } = payload;
  const checkAnswer = await prisma.answer.findUnique({
    where: {
      id: answerId,
    },
  });

  if (!checkAnswer)
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Answer not found for detailed comment!",
    );

  const getAllAnswerComments = await prisma.answerComment.findMany({
    where: {
      answerId: answerId,
    },
    select: selectFieldsForAnswerComment,
    orderBy: { createdAt: "asc" },
  });

  return getAllAnswerComments;
};

export const QuoraServices = {
  getSimilarSolvedQuoras,
  getQuoraDetails,
  postNewQuora,
  forcePostQuora,
  postAnswer,
  markAsSolved,
  giveUpvotes,
  giveDownvotes,
  getQuoras,
  commentOnAnswer,
  getAnswerComments,
};
