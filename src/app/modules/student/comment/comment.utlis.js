import { prisma } from "../../../../../constants/index.js";
import {
  getCourseOrCycleDomainUrl,
  getCourseOrCycleId,
} from "../../admin/liveClass/liveClass.utlis.js";

import { v4 as uuidv4 } from "uuid";
import { Enums } from "../../../constant/enums.js";
import { bumpNotificationUserVersion } from "../firebase/messaging/pushMessaging/pushMessaging.cache.js";

//get content to information
export const getContentIdToCourseId = async (contentId) => {
  let contentInfo;
  if (contentId?.classContentId) {
    const result = await prisma.classContent.findFirst({
      where: {
        id: contentId?.classContentId,
      },
      select: {
        id: true,
        classTitle: true,
        classNo: true,
        thumbneil: true,
        courseSubjectChapter: {
          select: {
            chapter: {
              select: {
                id: true,
                chapterName: true,
              },
            },
            courseSubject: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                course: {
                  select: {
                    id: true,
                    courseId: true,
                    productName: true,
                    productFullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    contentInfo = {
      course: {
        id: result?.courseSubjectChapter?.courseSubject?.course?.id,
        name: result?.courseSubjectChapter?.courseSubject?.course
          ?.productFullName,
      },
      courseSubject: {
        id: result?.courseSubjectChapter?.courseSubject?.id,
        name: result?.courseSubjectChapter?.courseSubject?.title,
      },
      chapter: {
        id: result?.courseSubjectChapter?.chapter?.id,
        name: result?.courseSubjectChapter?.chapter?.chapterName,
      },
      content: {
        id: result?.id,
        classTitle: result?.classTitle,
        classNo: result?.classNo,
        thumbneil: result?.thumbneil,
      },
    };
  } else if (contentId?.cycleContentId) {
    const result = await prisma.cycleContent.findFirst({
      where: {
        id: contentId?.cycleContentId,
      },
      select: {
        id: true,
        classTitle: true,
        classNo: true,
        thumbneil: true,
        cycleSubjectChapter: {
          select: {
            chapter: {
              select: {
                id: true,
                chapterName: true,
              },
            },
            cycleSubject: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                cycle: {
                  select: {
                    id: true,
                    title: true,
                    course: {
                      select: {
                        id: true,
                        productName: true,
                        productFullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    contentInfo = {
      course: {
        id: result?.cycleSubjectChapter?.cycleSubject?.cycle?.course?.id,
        name: result?.cycleSubjectChapter?.cycleSubject?.cycle?.course
          ?.productFullName,
      },
      cycle: {
        id: result?.cycleSubjectChapter?.cycleSubject?.cycle?.id,
        name: result?.cycleSubjectChapter?.cycleSubject?.cycle?.title,
      },

      cycleSubject: {
        id: result?.cycleSubjectChapter?.cycleSubject?.id,
        name: result?.cycleSubjectChapter?.cycleSubject?.title,
      },

      chapter: {
        id: result?.cycleSubjectChapter?.chapter?.id,
        name: result?.cycleSubjectChapter?.chapter?.chapterName,
      },

      content: {
        id: result?.id,
        classTitle: result?.classTitle,
        classNo: result?.classNo,
        thumbneil: result?.thumbneil,
      },
    };
  }

  return contentInfo;
};

//domain separation
export const getCurrentDomain = async (courseOrCycleInfo) => {
  if (courseOrCycleInfo?.cycleSubject?.id) {
    return {
      url: "https://academic.aparsclassroom.com",
      isCycle: true,
    };
  }

  // Check admission or frb
  if (courseOrCycleInfo?.courseSubject?.id) {
    const courseId = courseOrCycleInfo?.course?.id;

    //reterive course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        Category: true,
        productName: true,
        cycleAvailable: true,
      },
    });

    if (!course) return null;

    // Admission
    if (
      course.Category?.includes("Admission") &&
      !course.Category?.includes("Academic")
    ) {
      return { url: "https://admission.aparsclassroom.com", isCycle: false };
    } else {
      return { url: "https://frb.aparsclassroom.com", isCycle: false };
    }
  }
};

export const replayCommandSentToNotification = async (replayData = {}) => {
  const contentId = {
    ...(replayData?.classContentId && {
      classContentId: replayData?.classContentId,
    }),
    ...(replayData?.cycleContentId && {
      cycleContentId: replayData?.cycleContentId,
    }),
  };
  //getting course subject chapter id
  const courseId = await getContentIdToCourseId(contentId);

  //parent commant info
  const commentParent = await prisma.classComment.findUnique({
    where: {
      id: replayData.parentId,
    },
    select: {
      id: true,
      comment: true,
      createdAt: true,

      student: {
        select: {
          id: true,
          name: true,
          profilePhoto: true,
        },
      },

      admin: {
        select: {
          id: true,
          name: true,
          photo: true,
        },
      },

      replies: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  //domain Url
  const domainUrl = await getCurrentDomain(courseId);
  let deepLink;
  if (!domainUrl?.isCycle)
    deepLink = `${domainUrl?.url}/course/${courseId?.course?.id}/subject/${courseId.cycleSubject?.id}/classes/${courseId.chapter?.id}/content/${courseId?.content?.id}?title=${courseId?.content?.classTitle}&commentId=${commentParent?.id}`;
  else if (domainUrl?.isCycle) {
    deepLink = `${domainUrl?.url}/course/${courseId?.course?.id}/subject/${courseId.cycleSubject?.id}/chapter/${courseId.chapter?.id}/content/${courseId?.content?.id}?title=${courseId?.content?.classTitle}&commentId=${commentParent?.id}`;
  } else {
    deepLink = `https://aparsclassroom.com`;
  }
  //student or Admin Info

  //design for notification log payload
  const userType = replayData?.studentId
    ? "student"
    : replayData?.adminId
      ? "admin"
      : "superAdmin";
  //student or Admin
  let title;
  let replayerName;
  let senderStudentId;
  if (replayData?.studentId) {
    const studnetInfo = await prisma.student.findUnique({
      where: {
        id: replayData?.studentId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    replayerName = `${studnetInfo?.name} (শিক্ষার্থী):`;
    senderStudentId = studnetInfo?.id;
    title = `তোমার কমেন্টের উত্তর এসেছে`;
  } else if (replayData?.adminId) {
    const adminInfo = await prisma.admin.findUnique({
      where: {
        id: replayData?.adminId,
      },
      select: {
        id: true,
        name: true,
      },
    });
    const anotherRole = adminInfo?.anotherRole;
    replayerName =
      anotherRole === "teacher"
        ? `শিক্ষক ${adminInfo?.name}:`
        : `প্রতিনিধি ${adminInfo?.name}:`;

    title =
      anotherRole === "teacher"
        ? `তোমার শিক্ষক ${adminInfo?.name} কমেন্টের উত্তর দিয়েছেন`
        : anotherRole === "co-teacher"
          ? `শিক্ষক প্রতিনিধি ${adminInfo?.name} কমেন্টের উত্তর দিয়েছেন`
          : anotherRole === "cx"
            ? `প্রতিনিধি ${adminInfo?.name} কমেন্টের উত্তর দিয়েছেন`
            : `আমাদের প্রতিনিধি ${adminInfo?.name} কমেন্টের উত্তর দিয়েছেন`;
  } else {
    title = `তোমার কমেন্টের উত্তর এসেছে`;
  }
  if (replayData?.adminId && commentParent?.student?.id) {
  }
  if (!replayData?.adminId && !commentParent?.student?.id) {
    return true;
  }
  const data = {
    uniqueId: uuidv4(),
    type: "Comment Replay",
    senderType: userType,
    senderAdminId: replayData?.adminId,
    senderStudentId: senderStudentId,
    receiverSingleStudentId: commentParent?.student?.id,
    title: title,
    body: `${replayerName} '${replayData?.comment}'`,
    deepLink: deepLink,
    image: "" || courseId?.content?.thumbneil,
  };

  await prisma.notificationLog.create({
    data,
  });
  await bumpNotificationUserVersion(
    Enums.roles.STUDENT,
    commentParent.student.id,
  );
  return true;
};
