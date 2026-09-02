import { PrismaClient } from "@prisma/client";

const softDeleteModels = [
  "admin",
  "subject",
  "chapter",
  "course",
  "courseAdmin",
  "courseSubject",
  "courseSubjectChapter",
  "classContent",
  "cycle",
  "cycleSubject",
  "cycleSubjectChapter",
  "cycleContent",
  "featured",
  "noticeORroutine",
];

const prismaBase = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "info" },
    { emit: "stdout", level: "warn" },
  ],
});

// Add event listeners to the base client
prismaBase.$on("query", (e) => {
  if (e.duration > 800) {
    console.log(`⏱ Slow Query (${e.duration}ms): ${e.query}`);
  }
});

export const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          args.where = { ...args.where, isDeleted: false };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          args.where = { ...args.where, isDeleted: false };
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        if (softDeleteModels.includes(model)) {
          args.where = { ...args.where, isDeleted: false };
        }
        return query(args);
      },
    },
  },
});
