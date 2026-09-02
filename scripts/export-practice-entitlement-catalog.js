import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output="),
);
if (!outputArgument) {
  throw new Error(
    "Missing --output. Example: npm run export:practice-entitlement-catalog -- --output=/tmp/webapp-practice-catalog.json",
  );
}

const outputPath = path.resolve(outputArgument.slice("--output=".length));
const prisma = new PrismaClient({ log: ["error"] });

const subjectSelect = {
  id: true,
  title: true,
};

const chapterSelect = {
  id: true,
  title: true,
  chapter: {
    select: {
      id: true,
      chapterName: true,
      chapterNo: true,
    },
  },
};

const toSubject = (offeringSubject, chaptersKey) => ({
  offeringSubjectId: offeringSubject.id,
  webSubjectId: offeringSubject.subject.id,
  canonicalTitle: offeringSubject.subject.title,
  aliases: [...new Set([offeringSubject.title].filter(Boolean))],
  chapters: offeringSubject[chaptersKey].map((offeringChapter) => ({
    offeringChapterId: offeringChapter.id,
    webChapterId: offeringChapter.chapter.id,
    canonicalTitle: offeringChapter.chapter.chapterName,
    chapterNo: offeringChapter.chapter.chapterNo,
    aliases: [...new Set([offeringChapter.title].filter(Boolean))],
  })),
});

async function exportCatalog() {
  const [courses, cycles] = await Promise.all([
    prisma.course.findMany({
      where: {
        isDeleted: false,
        markAsArchieve: false,
      },
      orderBy: [{ productName: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        productId: true,
        affiliateProductIds: true,
        title: true,
        productName: true,
        productFullName: true,
        ProductImage: true,
        Permalink: true,
        currency_amount: true,
        isCourseFree: true,
        courseSubject: {
          where: {
            isDeleted: false,
            subject: { isDeleted: false },
          },
          orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            subject: { select: subjectSelect },
            courseSubjectChapter: {
              where: {
                isDeleted: false,
                chapter: { isDeleted: false },
              },
              orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
              select: chapterSelect,
            },
          },
        },
      },
    }),
    prisma.cycle.findMany({
      where: {
        isDeleted: false,
        markAsArchieve: false,
      },
      orderBy: [{ title: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        courseId: true,
        productId: true,
        affiliateProductIds: true,
        title: true,
        cycleFullName: true,
        cycleImage: true,
        Permalink: true,
        currency_amount: true,
        isCycleFree: true,
        cycleSubject: {
          where: {
            isDeleted: false,
            subject: { isDeleted: false },
          },
          orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            subject: { select: subjectSelect },
            cycleSubjectChapter: {
              where: {
                isDeleted: false,
                chapter: { isDeleted: false },
              },
              orderBy: [{ serial: "asc" }, { createdAt: "asc" }],
              select: chapterSelect,
            },
          },
        },
      },
    }),
  ]);

  const offerings = [
    ...courses.map((course) => ({
      kind: "COURSE",
      offeringId: course.id,
      parentCourseId: null,
      productId: course.productId,
      affiliateProductIds: course.affiliateProductIds,
      title: course.productFullName || course.productName || course.title,
      image: course.ProductImage,
      permalink: course.Permalink,
      price: course.currency_amount,
      isFree: Boolean(course.isCourseFree),
      subjects: course.courseSubject.map((subject) =>
        toSubject(subject, "courseSubjectChapter"),
      ),
    })),
    ...cycles.map((cycle) => ({
      kind: "CYCLE",
      offeringId: cycle.id,
      parentCourseId: cycle.courseId,
      productId: cycle.productId,
      affiliateProductIds: cycle.affiliateProductIds,
      title: cycle.cycleFullName || cycle.title,
      image: cycle.cycleImage,
      permalink: cycle.Permalink,
      price: cycle.currency_amount,
      isFree: Boolean(cycle.isCycleFree),
      subjects: cycle.cycleSubject.map((subject) =>
        toSubject(subject, "cycleSubjectChapter"),
      ),
    })),
  ];

  const subjectIds = new Set();
  const chapterPairs = new Set();
  for (const offering of offerings) {
    for (const subject of offering.subjects) {
      subjectIds.add(subject.webSubjectId);
      for (const chapter of subject.chapters) {
        chapterPairs.add(`${subject.webSubjectId}:${chapter.webChapterId}`);
      }
    }
  }

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "asg-web-app-backend",
    containsStudentData: false,
    summary: {
      courses: courses.length,
      cycles: cycles.length,
      offerings: offerings.length,
      canonicalSubjects: subjectIds.size,
      canonicalSubjectChapterPairs: chapterPairs.size,
    },
    offerings,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(`Practice entitlement catalog written to ${outputPath}`);
}

exportCatalog()
  .catch((error) => {
    console.error("Practice entitlement catalog export failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
