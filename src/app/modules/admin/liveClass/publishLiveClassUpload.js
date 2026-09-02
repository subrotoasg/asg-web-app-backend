import { prisma } from "../../../../../constants/index.js";
import AppErrors from "../../../../errors/AppErrors.js";
import {
  findCourseByClassContent,
  findCycleByLiveClass,
  logCycleLookUpTable,
  logLookUpTable,
} from "../../../middleware/handleCourseAuth.js";
import { invalidateLiveClassCache } from "../liveClassV3Api/liveClass.cache.js";

export async function publishRecordedLiveClass({
  liveClassData,
  bunnyVideoId,
  bunnyLibraryId,
}) {
  const classNumber = liveClassData?.vimeo;
  const teacherThumbnail = liveClassData?.thumbnail;
  const totalCount = Math.floor(Math.random() * 10) + 1;
  let existingContent = null;

  if (liveClassData?.courseSubjectChapterId) {
    existingContent = await prisma.classContent.findFirst({
      where: {
        videoId: liveClassData.videoId,
      },
    });
  } else if (liveClassData?.cycleSubjectChapterId) {
    existingContent = await prisma.cycleContent.findFirst({
      where: {
        videoId: liveClassData.videoId,
      },
    });
  }

  if (existingContent) {
    await prisma.liveClass.update({
      where: {
        id: liveClassData.id,
      },
      data: {
        status: "recorded",

        libraryId: bunnyLibraryId,
        vimeo: "",
      },
    });

    await invalidateLiveClassCache(liveClassData.id);

    return existingContent;
  }

  const commonData = {
    adminId: liveClassData?.adminId,

    classTitle:
      liveClassData?.title ||
      `Class from ${liveClassData?.startTime.toDateString()}`,

    classNo: classNumber || `${totalCount + 1}`,

    hostingType: "bunny",

    libraryId: bunnyLibraryId,

    videoUrl: bunnyVideoId,

    description: liveClassData?.description,

    instructor: liveClassData?.instructor,

    thumbneil: teacherThumbnail ?? liveClassData?.thumbnailPath,

    lectureSheet: liveClassData?.lectureSheet,

    practiceSheet: liveClassData?.practiceSheet,

    solutionSheet: liveClassData?.solutionSheet,

    markedBook: liveClassData?.markedBook,

    videoId: liveClassData?.videoId,
  };

  const result = await prisma.$transaction(async (tx) => {
    let content;

    if (liveClassData.courseSubjectChapterId) {
      content = await tx.classContent.create({
        data: {
          ...commonData,

          courseSubjectChapterId: liveClassData.courseSubjectChapterId,
        },
      });
    } else if (liveClassData.cycleSubjectChapterId) {
      content = await tx.cycleContent.create({
        data: {
          ...commonData,

          cycleSubjectChapterId: liveClassData.cycleSubjectChapterId,
        },
      });
    } else {
      throw new AppErrors(400, "Live class has no course or cycle chapter");
    }

    const updatedLiveClass = await tx.liveClass.update({
      where: {
        id: liveClassData.id,
      },

      data: {
        status: "recorded",
        libraryId: bunnyLibraryId,
        vimeo: "",
      },
    });

    return {
      content,

      updatedLiveClass,
    };
  });

  await invalidateLiveClassCache(liveClassData.id);

  if (liveClassData?.cycleSubjectChapterId) {
    const cycle = await findCycleByLiveClass(liveClassData.id);

    await logCycleLookUpTable(result.content.id, cycle?.id);

    await logLookUpTable(result.content.id, cycle?.course?.id);
  } else {
    const course = await findCourseByClassContent(result.content.id, prisma);

    await logLookUpTable(result.content.id, course?.id);
  }

  return {
    ...result.content,
    ...result.updatedLiveClass,
  };
}
