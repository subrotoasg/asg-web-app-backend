import { prisma } from "../../../constants/index.js";

export const findCourseByAnyHierarchyId = async (id, prisma) => {
  const liveClassResult = await prisma.liveClass.findFirst({
    //authorization also for liv class
    where: { id },
    select: {
      courseSubjectChapter: {
        select: {
          courseSubject: {
            select: {
              courseId: true,
              course: {
                select: {
                  id: true,
                  productName: true,
                  markAsArchieve: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (liveClassResult?.courseSubjectChapter?.courseSubject?.course) {
    return liveClassResult.courseSubjectChapter.courseSubject.course;
  }

  const classContentResult = await prisma.classContent.findFirst({
    where: { id },
    select: {
      courseSubjectChapter: {
        select: {
          courseSubject: {
            select: {
              courseId: true,
              course: {
                select: {
                  id: true,
                  productName: true,
                  markAsArchieve: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (classContentResult?.courseSubjectChapter?.courseSubject?.course) {
    return classContentResult.courseSubjectChapter.courseSubject.course;
  }

  const courseSubjectChapterResult =
    await prisma.courseSubjectChapter.findFirst({
      where: { id },
      select: {
        courseSubject: {
          select: {
            courseId: true,
            course: {
              select: {
                id: true,
                productName: true,
                markAsArchieve: true,
              },
            },
          },
        },
      },
    });

  if (courseSubjectChapterResult?.courseSubject?.course) {
    return courseSubjectChapterResult.courseSubject.course;
  }

  const combinedResult = await prisma.$transaction([
    prisma.courseSubject.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    }),
    prisma.cycleContent.findFirst({
      where: { id },
      select: {
        cycleSubjectChapter: {
          select: {
            cycleSubject: {
              select: {
                cycle: {
                  select: {
                    courseId: true,
                    course: {
                      select: {
                        id: true,
                        productName: true,
                        markAsArchieve: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.cycleSubjectChapter.findFirst({
      where: { id },
      select: {
        cycleSubject: {
          select: {
            cycle: {
              select: {
                courseId: true,
                course: {
                  select: { id: true, productName: true, markAsArchieve: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.cycleSubject.findFirst({
      where: { id },
      select: {
        cycle: {
          select: {
            courseId: true,
            course: {
              select: { id: true, productName: true, markAsArchieve: true },
            },
          },
        },
      },
    }),
    prisma.cycle.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    }),
    // Query 3c: featured, noticeORroutine
    prisma.featured.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    }),
    prisma.noticeORroutine.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    }),

    prisma.course.findUnique({
      where: { id },
      select: { id: true, productName: true, markAsArchieve: true },
    }),
  ]);

  const [
    courseSubjectResult,
    cycleContentResult,
    cycleSubjectChapterResult,
    cycleSubjectResult,
    cycleResult,
    featuredResult,
    noticeORroutineResult,
    directCourseResult,
  ] = combinedResult;

  if (courseSubjectResult?.course) {
    return courseSubjectResult.course;
  }

  if (cycleContentResult?.cycleSubjectChapter?.cycleSubject?.cycle?.course) {
    return cycleContentResult.cycleSubjectChapter.cycleSubject.cycle.course;
  }

  if (cycleSubjectChapterResult?.cycleSubject?.cycle?.course) {
    return cycleSubjectChapterResult.cycleSubject.cycle.course;
  }

  if (cycleSubjectResult?.cycle?.course) {
    return cycleSubjectResult.cycle.course;
  }

  if (cycleResult?.course) {
    return cycleResult.course;
  }

  if (featuredResult?.course) {
    return featuredResult.course;
  }

  if (noticeORroutineResult?.course) {
    return noticeORroutineResult.course;
  }

  if (directCourseResult) {
    return directCourseResult;
  }

  return null;
};

export const findCourseByCourse = async (id, tx = prisma) => {
  try {
    const course = await tx.course.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        productName: true,
        markAsArchieve: true,
      },
    });
    return course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCourseSubject = async (id, tx = prisma) => {
  try {
    const course = await tx.courseSubject.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    });
    return course?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCourseSubjectChapter = async (id, tx = prisma) => {
  try {
    const course = await tx.courseSubjectChapter.findFirst({
      where: { id },
      select: {
        courseSubject: {
          select: {
            courseId: true,
            course: {
              select: {
                id: true,
                productName: true,
                markAsArchieve: true,
              },
            },
          },
        },
      },
    });
    return course?.courseSubject?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByClassContent = async (id, tx = prisma) => {
  try {
    const course = await tx.classContent.findFirst({
      where: { id },
      select: {
        courseSubjectChapter: {
          select: {
            courseSubject: {
              select: {
                courseId: true,
                course: {
                  select: {
                    id: true,
                    productName: true,
                    markAsArchieve: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return course?.courseSubjectChapter?.courseSubject?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByLiveClass = async (id, tx = prisma) => {
  try {
    const course = await tx.liveClass.findFirst({
      where: { id },
      select: {
        courseSubjectChapter: {
          select: {
            courseSubject: {
              select: {
                courseId: true,
                course: {
                  select: {
                    id: true,
                    productName: true,
                    markAsArchieve: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return course?.courseSubjectChapter?.courseSubject?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCycle = async (id, tx = prisma) => {
  try {
    const course = await tx.cycle.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    });
    return course?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCycleSubject = async (id, tx = prisma) => {
  try {
    const course = await tx.cycleSubject.findFirst({
      where: { id },
      select: {
        cycle: {
          select: {
            courseId: true,
            course: {
              select: { id: true, productName: true, markAsArchieve: true },
            },
          },
        },
      },
    });
    return course?.cycle?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCycleSubjectChapter = async (id, tx = prisma) => {
  try {
    const course = await tx.cycleSubjectChapter.findFirst({
      where: { id },
      select: {
        cycleSubject: {
          select: {
            cycle: {
              select: {
                courseId: true,
                course: {
                  select: { id: true, productName: true, markAsArchieve: true },
                },
              },
            },
          },
        },
      },
    });
    return course?.cycleSubject?.cycle?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByCycleContent = async (id, tx = prisma) => {
  try {
    const course = await tx.cycleContent.findFirst({
      where: { id },
      select: {
        cycleSubjectChapter: {
          select: {
            cycleSubject: {
              select: {
                cycle: {
                  select: {
                    courseId: true,
                    course: {
                      select: {
                        id: true,
                        productName: true,
                        markAsArchieve: true,
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
    return course?.cycleSubjectChapter?.cycleSubject?.cycle?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByFeatured = async (id, tx = prisma) => {
  try {
    const course = await tx.featured.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    });
    return course?.course;
  } catch (error) {
    return null;
  }
};

export const findCourseByNoticeOrRoutine = async (id, tx = prisma) => {
  try {
    const course = await tx.noticeORroutine.findFirst({
      where: { id },
      select: {
        courseId: true,
        course: {
          select: { id: true, productName: true, markAsArchieve: true },
        },
      },
    });
    return course?.course;
  } catch (error) {
    return null;
  }
};

export const findCycleByCycle = async (id, tx = prisma) => {
  try {
    const cycle = await tx.cycle.findFirst({
      where: { id },
      select: {
        id: true,
        title: true,
        markAsArchieve: true,
        course: {
          select: {
            productName,
          },
        },
      },
    });
    return cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByCycleSubject = async (id, tx = prisma) => {
  try {
    const cycle = await tx.cycleSubject.findFirst({
      where: {
        id,
      },
      select: {
        cycleId: true,
        cycle: {
          select: {
            id: true,
            title: true,
            markAsArchieve: true,
            course: {
              select: {
                productName: true,
              },
            },
          },
        },
      },
    });
    return cycle?.cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByCycleSubjectChapter = async (id, tx = prisma) => {
  try {
    const cycle = await tx.cycleSubjectChapter.findFirst({
      where: {
        id,
      },
      select: {
        cycleSubject: {
          select: {
            cycle: {
              select: {
                id: true,
                title: true,
                markAsArchieve: true,
                course: {
                  select: {
                    productName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return cycle?.cycleSubject?.cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByCycleContent = async (id, tx = prisma) => {
  try {
    const cycle = await tx.cycleContent.findFirst({
      where: {
        id,
      },
      select: {
        cycleSubjectChapter: {
          select: {
            cycleSubject: {
              select: {
                cycle: {
                  select: {
                    id: true,
                    title: true,
                    markAsArchieve: true,
                    course: {
                      select: {
                        productName: true,
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
    return cycle?.cycleSubjectChapter?.cycleSubject?.cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByLiveClass = async (id, tx = prisma) => {
  try {
    const cycle = await tx.liveClass.findFirst({
      where: { id },
      select: {
        cycleSubjectChapter: {
          select: {
            cycleSubject: {
              select: {
                cycleId: true,
                cycle: {
                  select: {
                    id: true,
                    title: true,
                    markAsArchieve: true,
                    course: {
                      select: {
                        id: true,
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
    return cycle?.cycleSubjectChapter?.cycleSubject?.cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByNoticeOrRoutine = async (id, tx = prisma) => {
  try {
    const cycle = await tx.noticeORroutine.findFirst({
      where: { id },
      select: {
        cycleId: true,
        cycle: {
          select: { id: true, title: true, markAsArchieve: true },
        },
      },
    });
    return cycle?.cycle;
  } catch (error) {
    return null;
  }
};

export const findCycleByFeatured = async (id, tx = prisma) => {
  try {
    const cycle = await tx.featured.findFirst({
      where: { id },
      select: {
        cycleId: true,
        cycle: {
          select: { id: true, title: true, markAsArchieve: true },
        },
      },
    });
    return cycle?.cycle;
  } catch (error) {
    return null;
  }
};

export const logLookUpTable = async (id, courseId, tx = prisma) => {
  try {
    await tx.courseLookup.upsert({
      where: { entityId: id },
      create: { entityId: id, courseId },
      update: { courseId },
    });
  } catch (error) {
    console.log(error);
  }
};

export const logCycleLookUpTable = async (id, cycleId, tx = prisma) => {
  try {
    await tx.cycleLookup.upsert({
      where: { entityId: id },
      create: { entityId: id, cycleId },
      update: { cycleId },
    });
  } catch (error) {
    console.log(error);
  }
};

export const newfindCourseByAnyHierarchyId = async (id, prisma) => {
  try {
    const lookup = await prisma.courseLookup.findUnique({
      where: { entityId: id },
      select: {
        course: {
          select: {
            id: true,
            productName: true,
            markAsArchieve: true,
            isCourseFree: true,
          },
        },
      },
    });

    return lookup?.course ?? null;
  } catch (error) {
    console.error("Error in findCourseByAnyHierarchyId:", error);
    return null;
  }
};

export const newfindCycleByAnyHierarchyId = async (id, prisma) => {
  try {
    const lookup = await prisma.cycleLookup.findUnique({
      where: { entityId: id },
      select: {
        cycle: {
          select: {
            id: true,
            title: true,
            markAsArchieve: true,
            isCycleFree: true,
            course: {
              select: {
                id: true,
                productName: true,
              },
            },
          },
        },
      },
    });

    return lookup?.cycle ?? null;
  } catch (error) {
    console.error("Error in findCycleByAnyHierarchyId:", error);
    return null;
  }
};
