import { StatusCodes } from "http-status-codes";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { pickCreateAndUpdateResponse } from "../../../../helper/CreateAndUpdateResponseModify.js";
import { prisma } from "../../../../../constants/index.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { ReactionType } from "./reaction.constant.js";

//Get all Reaction Services
const getAllReactionfromDb = async (query) => {
  console.log(query);
};

//my reaction in content
const getMyreactionFromDb = async (payload) => {
  const { studentId, adminId, id } = payload || {};
  const orConditions = [{ studentId }];
  if (adminId) {
    orConditions.push({ adminId });
  }
  const myReactions = await prisma.classLike.findFirst({
    where: {
      studentId,
      OR: [
        {
          classContentId: id,
        },
        {
          cycleContentId: id,
        },
      ],
      // OR: orConditions,
    },
    include: {
      student: { select: { id: true, name: true } },
      admin: { select: { id: true, name: true } },
    },
  });
  return myReactions;
};

//Get single Reaction Services
const getSingleReactionfromDb = async (contentId) => {
  const reactions = await prisma.classLike.findMany({
    where: {
      OR: [{ classContentId: contentId }, { cycleContentId: contentId }],
    },
    include: {
      student: { select: { id: true, name: true } },
      admin: { select: { id: true, name: true } },
    },
  });

  const reactionUsers = Object.fromEntries(
    ReactionType?.map((type) => [type, { count: 0, users: [] }]),
  );

  // Collect all users
  const allUsers = [];

  for (const reaction of reactions) {
    const name = reaction.student?.name || reaction.admin?.name;
    if (!name) continue;

    const type = reaction.type;
    if (reactionUsers[type]) {
      reactionUsers[type].count += 1;
      reactionUsers[type].users.push(name);
    }

    allUsers.push(name);
  }
  const uniqueAllUsers = [...new Set(allUsers)];

  return {
    reactionUsers,
    totalReactions: reactions.length,
    reactionAllUsers: uniqueAllUsers,
  };
};

//Create Reaction Services
const createReactionIntoDb = async (payload) => {
  const { studentId, adminId, classContentId, cycleContentId, reactionType } =
    payload || {};

  const where = {};
  const createData = {
    classContentId: classContentId || null,
    cycleContentId: cycleContentId || null,
    studentId: studentId || null,
    adminId: adminId || null,
    type: reactionType,
  };

  if (studentId) {
    if (classContentId)
      where.classContentId_studentId = { classContentId, studentId };
    else where.cycleContentId_studentId = { cycleContentId, studentId };
  } else {
    if (classContentId)
      where.classContentId_adminId = { classContentId, adminId };
    else where.cycleContentId_adminId = { cycleContentId, adminId };
  }

  const upsertReaction = await prisma.classLike.upsert({
    where,
    update: {
      type: reactionType,
    },
    create: createData,
  });

  return upsertReaction;
};

//Update Reaction Services
const updateReactionIntoDb = async (reactionId, payload) => {
  console.log(reactionId, payload);
};

//Delete Reaction Services
const deleteReactionFromDb = async (reactionId) => {
  console.log(reactionId);
};

export const ReactionServices = {
  getAllReactionfromDb,
  getMyreactionFromDb,
  getSingleReactionfromDb,
  createReactionIntoDb,
  updateReactionIntoDb,
  deleteReactionFromDb,
};
