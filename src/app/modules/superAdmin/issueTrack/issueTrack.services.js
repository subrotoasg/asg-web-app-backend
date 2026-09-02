import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import { buildQueryOptions } from "../../../../helper/buildQueryOptions.js";
import { Enums } from "../../../constant/enums.js";
import {
  filterableFields,
  searchableFields,
  selectFields,
  sortableFields,
} from "./issueTrack.constants.js";
import { transformUpdatedFields } from "../../../../helper/updatedFieldsTransform.js";
import { PushMessagingServices } from "../../student/firebase/messaging/pushMessaging/pushMessaging.services.js";

const addNewIssueTag = async (payload) => {
  const { tag, superAdminId } = payload;
  const data = {
    tag,
    superAdminId,
  };

  const createTag = await prisma.issueTag.create({
    data: data,
  });

  return createTag;
};

const updateIssueTags = async (issueTagId, payload) => {
  const { superAdminId, tag } = payload;
  const getTag = await prisma.issueTag.findFirst({
    where: {
      id: issueTagId,
    },
  });

  if (!getTag)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Tag not found for update");

  const data = transformUpdatedFields(
    { tag: tag, superAdminId: superAdminId },
    [],
  );

  const updateTag = await prisma.issueTag.update({
    where: {
      id: issueTagId,
    },
    data: data,
  });
  return updateTag;
};

const getIssueTags = async () => {
  const getAllTags = await prisma.issueTag.findMany({
    select: {
      id: true,
      tag: true,
      createdAt: true,
    },
  });
  return getAllTags;
};

const addNewIssuePriority = async (payload) => {
  const { name, level } = payload;
  const data = {
    name: name,
    level: level,
  };
  const createIssuePriority = await prisma.IssuePriority.create({
    data: data,
  });
  return createIssuePriority;
};

const updateIssuePriority = async (priorityId, payload) => {
  const { name, level } = payload;

  const data = transformUpdatedFields({ name, level }, []);

  const getPriority = await prisma.IssuePriority.findFirst({
    where: {
      id: priorityId,
    },
  });

  if (!getPriority) {
    throw new AppErrors(
      StatusCodes.NOT_FOUND,
      "Issue priority not found to update",
    );
  }

  const updatePriority = await prisma.IssuePriority.update({
    where: {
      id: priorityId,
    },
    data: data,
  });

  return updatePriority;
};

const getIssuePriorities = async () => {
  const getPriorities = await prisma.IssuePriority.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      createdAt: true,
    },
    orderBy: {
      level: "asc",
    },
  });
  return getPriorities;
};

const postNewIssue = async (payload, issueImages) => {
  const { priorityId, issueTagId, adminId, ip, issueTitle, issueDescription } =
    payload;

  const issueData = {
    priorityId,
    issueTagId,
    adminId,
    ip,
    issueTitle,
    issueDescription,
    images:
      issueImages && Array.isArray(issueImages) && issueImages?.length > 0
        ? issueImages
        : [],
  };

  const createNewIssue = await prisma.IssueTrack.create({
    data: issueData,
  });

  return true;
};

const getAllIssues = async (payload = {}, processedQuery = {}, query = {}) => {
  const { skip, take, orderBy, where } = buildQueryOptions(
    processedQuery,
    searchableFields,
    sortableFields,
    filterableFields,
  );

  const { adminId, superAdminId } = payload;

  const { dateFrom, dateTo } = query;

  const isPendingFilter = query?.filter === Enums.issueStatus.PENDING;

  const issueOrderBy = isPendingFilter
    ? [
        {
          priority: {
            level: "desc",
          },
        },
        {
          createdAt: "desc",
        },
      ]
    : [
        {
          createdAt: "desc",
        },
      ];

  const result = await prisma.IssueTrack.findMany({
    where: {
      ...where,
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo
                ? {
                    lt: new Date(
                      new Date(`${dateTo}T00:00:00.000Z`).getTime() +
                        24 * 60 * 60 * 1000,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    },
    orderBy: issueOrderBy,
    skip,
    take,
    select: selectFields,
  });

  const modifiedResult = result.map((issue) => ({
    ...issue,
    own: issue?.adminId === adminId,
    isSolver: issue?.solverId === superAdminId,
  }));

  //total count of issues
  const totalCount = await prisma.IssueTrack.count({
    where: {
      ...where,
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo
                ? {
                    lt: new Date(
                      new Date(`${dateTo}T00:00:00.000Z`).getTime() +
                        24 * 60 * 60 * 1000,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    },
  });

  const totalPages = Math.ceil(totalCount / take);
  const currentPage = Math.ceil(skip / take) + 1;

  //want to get all status count of issues
  const statusCounts = await prisma.IssueTrack.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const formattedStatusCounts = {
    PENDING: 0,
    ONGOING: 0,
    REJECTED: 0,
    SOLVED: 0,
  };

  statusCounts.forEach((item) => {
    formattedStatusCounts[item.status] = item._count._all;
  });

  return {
    data: modifiedResult,
    meta: {
      totalCount,
      totalPages,
      currentPage,
    },
    stats: { statusCounts: formattedStatusCounts },
  };
};

const getIssueStats = async () => {
  const [
    statusCounts,
    totalIssues,
    totalSolved,
    adminGrouped,
    solverGrouped,
    totalAdminCreatedIssues,
  ] = await Promise.all([
    prisma.issueTrack.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),

    prisma.issueTrack.count(),

    prisma.issueTrack.count({
      where: {
        status: "SOLVED",
      },
    }),

    prisma.issueTrack.groupBy({
      by: ["adminId"],
      where: {
        adminId: { not: null },
      },
      _count: {
        adminId: true,
      },
      orderBy: {
        _count: {
          adminId: "desc",
        },
      },
      take: 5,
    }),

    prisma.issueTrack.groupBy({
      by: ["solverId"],
      where: {
        solverId: { not: null },
        status: "SOLVED",
      },
      _count: {
        solverId: true,
      },
      orderBy: {
        _count: {
          solverId: "desc",
        },
      },
      take: 5,
    }),

    prisma.issueTrack.count({
      where: {
        adminId: { not: null },
      },
    }),
  ]);

  const formattedStatusCounts = {
    PENDING: 0,
    ONGOING: 0,
    REJECTED: 0,
    SOLVED: 0,
  };

  statusCounts.forEach((item) => {
    formattedStatusCounts[item.status] = item._count.status;
  });

  const adminIds = adminGrouped.map((item) => item.adminId).filter(Boolean);
  const solverIds = solverGrouped.map((item) => item.solverId).filter(Boolean);

  const [admins, solvers] = await Promise.all([
    prisma.admin.findMany({
      where: {
        id: { in: adminIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),

    prisma.superAdmin.findMany({
      where: {
        id: { in: solverIds },
      },
      select: {
        id: true,
        // name: true,
        email: true,
      },
    }),
  ]);

  const adminMap = new Map(admins.map((admin) => [admin.id, admin]));
  const solverMap = new Map(solvers.map((solver) => [solver.id, solver]));

  const topAdmins = adminGrouped.map((item) => {
    const admin = adminMap.get(item.adminId);

    return {
      adminId: item.adminId,
      // name: admin?.name || null,
      email: admin?.email || null,
      createdCount: item._count.adminId,
      contributionPercentage:
        totalAdminCreatedIssues > 0
          ? Number(
              ((item._count.adminId / totalAdminCreatedIssues) * 100).toFixed(
                2,
              ),
            )
          : 0,
    };
  });

  const topSolvers = solverGrouped.map((item) => {
    const solver = solverMap.get(item.solverId);

    return {
      solverId: item.solverId,
      name: solver?.name || null,
      email: solver?.email || null,
      solvedCount: item._count.solverId,
      contributionPercentage:
        totalSolved > 0
          ? Number(((item._count.solverId / totalSolved) * 100).toFixed(2))
          : 0,
    };
  });

  return {
    stats: {
      total: totalIssues,
      solved: totalSolved,
      status: formattedStatusCounts,
      solveRate:
        totalIssues > 0
          ? Number(((totalSolved / totalIssues) * 100).toFixed(2))
          : 0,
    },
    topAdmins,
    topSolvers,
  };
};

const updateIssueContent = async (issueId, payload = {}, images) => {
  const { priorityId, issueTagId, issueTitle, issueDescription, adminId } =
    payload;

  const getIssue = await prisma.IssueTrack.findFirst({
    where: {
      id: issueId,
    },
  });

  if (!getIssue)
    throw new AppErrors(StatusCodes.NOT_FOUND, "Issue not found to update");

  if (
    getIssue?.status !== Enums.issueStatus.PENDING &&
    getIssue?.status === Enums.issueStatus.ONGOING
  )
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "প্রদত্ত সমস্যাটি ইতোমধ্যে খতিয়ে দেখা হচ্ছে",
    );

  if (getIssue?.status === Enums.issueStatus.SOLVED) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "প্রদত্ত সমস্যাটি ইতোমধ্যে সমাধান করা হয়েছে",
    );
  }

  if (getIssue?.status === Enums.issueStatus.REJECTED) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "প্রদত্ত সমস্যাটি বাতিল করা হয়েছে",
    );
  }

  if (adminId !== getIssue?.adminId) {
    throw new AppErrors(
      StatusCodes.BAD_REQUEST,
      "আপনি শুধুমাত্র আপনার নিজের পোস্ট করা সমস্যা এডিট করতে পারবেন",
    );
  }

  let imageData = [];

  if (images && Array.isArray(images) && images.length > 0) {
    for (const i of images) imageData.push(i);
    for (const i of getIssue?.images) imageData.push(i);
  }

  const data = {
    priorityId,
    issueTagId,
    issueTitle,
    issueDescription,
    isEdited: true,
  };

  if (imageData?.length > getIssue?.images?.length) {
    data.images = imageData;
  }

  const updateData = transformUpdatedFields(data, []);

  const updateIssue = await prisma.IssueTrack.update({
    where: {
      id: issueId,
      status: Enums.issueStatus.PENDING,
    },
    data: updateData,
  });

  return updateIssue;
};

const updateIssue = async (issueId, payload) => {
  const getIssue = await prisma.IssueTrack.findFirst({
    where: {
      id: issueId,
    },
  });

  const { superAdminId, superAdminEmail, status, remarks } = payload;

  if (!getIssue) {
    throw new AppErrors(StatusCodes.NOT_FOUND, "Issue not found to update");
  }

  if (status === Enums.issueStatus.ONGOING) {
    if (getIssue?.status === Enums.issueStatus.PENDING) {
      const updateIssue = await prisma.IssueTrack.update({
        where: {
          id: issueId,
        },
        data: {
          status: status,
          remarks: remarks,
          solverId: superAdminId,
        },
      });

      //try to send notification
      try {
        const data = {
          adminId: getIssue?.adminId,
          title: `"${getIssue?.issueTitle?.length > 20 ? getIssue?.issueTitle.slice(0, 20) + "..." : getIssue?.issueTitle}" এই ইস্যুটির স্ট্যাটাস আপডেট করা হয়েছে।`,
          body: `${superAdminEmail} ইস্যুটি নিয়ে কাজ করছেন`,
        };
        //await PushMessagingServices.sendPushMessaginIntoDb(data);
      } catch (error) {
        console.log(error, "error sending notification");
      }
    }
  } else if (
    status === Enums.issueStatus.SOLVED ||
    status === Enums.issueStatus.REJECTED
  ) {
    if (
      getIssue?.status === Enums.issueStatus.ONGOING ||
      getIssue?.status === Enums.issueStatus.PENDING
    ) {
      if (
        getIssue?.solverId !== superAdminId &&
        getIssue?.status === Enums.issueStatus.ONGOING
      ) {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "এই সমস্যাটি ইতোমধ্যে ভিন্ন একজনের আওতাধীন",
        );
      }

      const updateIssue = await prisma.IssueTrack.update({
        where: {
          id: issueId,
        },
        data: {
          status: status,
          remarks: remarks,
          solverId: superAdminId,
          solvedAt: new Date(),
        },
      });

      //try to send notification
      try {
        const data = {
          adminId: getIssue?.adminId,
          title: `"${getIssue?.issueTitle?.length > 20 ? getIssue?.issueTitle.slice(0, 20) + "..." : getIssue?.issueTitle}" এই ইস্যুটির স্ট্যাটাস আপডেট করা হয়েছে।`,
          body: `${status === Enums.issueStatus.SOLVED ? superAdminEmail + "ইস্যুটি সমাধান করেছেন" : superAdminEmail + "ইস্যুটি বাতিল করেছেন"}`,
        };
        //await PushMessagingServices.sendPushMessaginIntoDb(data);
      } catch (error) {
        console.log(error, "error sending notification");
      }
    }
  } else if (status === Enums.issueStatus.REJECTED) {
    if (
      getIssue?.status === Enums.issueStatus.ONGOING ||
      getIssue?.status === Enums.issueStatus.PENDING
    ) {
      if (
        getIssue?.solverId !== superAdminId &&
        getIssue?.status === Enums.issueStatus.ONGOING
      ) {
        throw new AppErrors(
          StatusCodes.BAD_REQUEST,
          "এই সমস্যাটি ইতোমধ্যে ভিন্ন একজনের আওতাধীন",
        );
      }

      const updateIssue = await prisma.IssueTrack.update({
        where: {
          id: issueId,
        },
        data: {
          status: status,
          remarks: remarks,
          solverId: superAdminId,
          solvedAt: new Date(),
        },
      });

      //try to send notification
      try {
        const data = {
          adminId: getIssue?.adminId,
          title: `"${getIssue?.issueTitle?.length > 20 ? getIssue?.issueTitle.slice(0, 20) + "..." : getIssue?.issueTitle}" এই ইস্যুটির স্ট্যাটাস আপডেট করা হয়েছে।`,
          body: `${superAdminEmail} ইস্যুটি বাতিল করছেন`,
        };
        //await PushMessagingServices.sendPushMessaginIntoDb(data);
      } catch (error) {
        console.log(error, "error sending notification");
      }
    }
  } else {
    const updateIssue = await prisma.IssueTrack.update({
      where: {
        id: issueId,
      },
      data: {
        remarks: remarks,
        solverId: superAdminId,
      },
    });

    //try to send notification
    try {
      const data = {
        adminId: getIssue?.adminId,
        title: `"${getIssue?.issueTitle?.length > 20 ? getIssue?.issueTitle.slice(0, 20) + "..." : getIssue?.issueTitle}" এই ইস্যুটির স্ট্যাটাস আপডেট করা হয়েছে।`,
        body: `${superAdminEmail} ইস্যুটি সম্পর্কে আরো তথ্য জানতে চাচ্ছেন`,
      };
      //await PushMessagingServices.sendPushMessaginIntoDb(data);
    } catch (error) {
      console.log(error, "error sending notification");
    }
  }

  return true;
};

export const issueTrackService = {
  postNewIssue,
  getAllIssues,
  getIssueStats,
  addNewIssueTag,
  updateIssueTags,
  getIssueTags,
  addNewIssuePriority,
  getIssuePriorities,
  updateIssueContent,
  updateIssuePriority,
  updateIssue,
};
