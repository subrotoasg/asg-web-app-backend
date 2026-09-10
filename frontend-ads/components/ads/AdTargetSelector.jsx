"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import Dropdown from "@/components/form/Dropdown";
import MultiSelect from "@/components/form/MultiSelect";
import { Button } from "@/components/ui/button";
import { Layers, Trash2, Globe2 } from "lucide-react";

import { useGetAllCourseQuery } from "@/redux/services/courseApi";
import { useGetAllCourseCycleBasedOnCourseIdQuery } from "@/redux/services/cycleApi";
import { useGetCourseSubjectByCourseIdQuery } from "@/redux/services/subjectApi";
import { useGetCourseChaptersByCourseSubjectIdQuery } from "@/redux/services/chapterApi";
import { useGetClassContentsBySubjectChapterIdQuery } from "@/redux/services/classContentApi";

const EMPTY = [];

/** ফাঁকা/লোডিং অবস্থাতেও Dropdown যেন কখনো undefined না পায় */
const toOptions = (rows, labelFn, { loading, error, empty }) => {
  if (loading) return [{ label: "লোড হচ্ছে…", value: "" }];
  if (error) return [{ label: "আনতে সমস্যা হয়েছে", value: "" }];
  if (!rows?.length) return [{ label: empty, value: "" }];
  return rows.map((r) => ({ label: labelFn(r), value: r.id }));
};

const SCOPE_LABEL = {
  COURSE: "কোর্স",
  COURSE_SUBJECT: "সাবজেক্ট",
  COURSE_SUBJECT_CHAPTER: "চ্যাপ্টার",
  CLASS_CONTENT: "ক্লাস",
  CYCLE: "সাইকেল",
  CYCLE_SUBJECT: "সাইকেল সাবজেক্ট",
  CYCLE_SUBJECT_CHAPTER: "সাইকেল চ্যাপ্টার",
  CYCLE_CONTENT: "সাইকেল ক্লাস",
  LIVE_CLASS: "লাইভ ক্লাস",
  STUDENT: "স্টুডেন্ট",
};

/**
 * টার্গেট সিলেক্টর।
 *
 * ফর্মে `targets` নামের একটা অবজেক্ট বসায়, ঠিক যেই শেপে ব্যাকএন্ডের
 * zod স্কিমা চায়:
 *   { global, courseIds[], courseSubjectIds[], …, exclude: { … } }
 *
 * কোর্স → সাবজেক্ট → চ্যাপ্টার → ক্লাস — ধাপে ধাপে নামা যায়, আর প্রতিটা
 * ধাপেই একসাথে অনেকগুলো সিলেক্ট করা যায়।
 */
export default function AdTargetSelector({ isSuperAdmin = false }) {
  const { setValue, control } = useFormContext();

  const targets = useWatch({ control, name: "targets" }) || {};

  const [courseId, setCourseId] = useState("");
  const [courseSubjectId, setCourseSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const patch = useCallback(
    (key, value) => {
      setValue(
        "targets",
        { ...(targets || {}), [key]: value },
        { shouldDirty: true, shouldValidate: true },
      );
    },
    [setValue, targets],
  );

  /* ---------- কোর্স ---------- */
  const {
    data: courseData,
    isFetching: coursesLoading,
    isError: coursesError,
  } = useGetAllCourseQuery({ limit: 1000 });

  const allCourses = useMemo(
    () => courseData?.data?.data || EMPTY,
    [courseData],
  );

  const courseOptions = useMemo(
    () =>
      toOptions(
        allCourses,
        (c) =>
          `${c.productFullName || c.productName || "নামহীন কোর্স"}${
            c.markAsArchieve ? " [আর্কাইভড]" : ""
          }`,
        {
          loading: coursesLoading,
          error: coursesError,
          empty: "কোনো কোর্স নেই",
        },
      ),
    [allCourses, coursesLoading, coursesError],
  );

  const drillCourse = useMemo(
    () => allCourses.find((c) => c.id === courseId) || null,
    [allCourses, courseId],
  );

  /* ---------- সাবজেক্ট (ড্রিল করা কোর্সের) ---------- */
  const {
    data: subjectData,
    isFetching: subjectsLoading,
    isError: subjectsError,
  } = useGetCourseSubjectByCourseIdQuery(
    { courseId, limit: 500 },
    { skip: !courseId },
  );

  const subjects = useMemo(
    () => subjectData?.data?.data || subjectData?.data || EMPTY,
    [subjectData],
  );

  /* ---------- চ্যাপ্টার ---------- */
  const {
    data: chapterData,
    isFetching: chaptersLoading,
    isError: chaptersError,
  } = useGetCourseChaptersByCourseSubjectIdQuery(
    { courseSubjectId, limit: 500 },
    { skip: !courseSubjectId },
  );

  const chapters = useMemo(
    () => chapterData?.data?.data || chapterData?.data || EMPTY,
    [chapterData],
  );

  /* ---------- ক্লাস ---------- */
  const {
    data: classData,
    isFetching: classesLoading,
    isError: classesError,
  } = useGetClassContentsBySubjectChapterIdQuery(
    { subjectChapterId: chapterId, limit: 500 },
    { skip: !chapterId },
  );

  const classes = useMemo(
    () => classData?.data?.data || classData?.data || EMPTY,
    [classData],
  );

  /* ---------- সাইকেল ---------- */
  const {
    data: cycleData,
    isFetching: cyclesLoading,
    isError: cyclesError,
  } = useGetAllCourseCycleBasedOnCourseIdQuery(
    { courseId, limit: 200 },
    { skip: !courseId || !drillCourse?.cycleAvailable },
  );

  const cycles = useMemo(() => cycleData?.data || EMPTY, [cycleData]);

  /* কোর্স বদলালে নিচের ধাপগুলো রিসেট — নাহলে আগের সাবজেক্টের
     চ্যাপ্টার স্ক্রিনে থেকে যেত */
  useEffect(() => {
    setCourseSubjectId("");
    setChapterId("");
  }, [courseId]);

  useEffect(() => {
    setChapterId("");
  }, [courseSubjectId]);

  const selectedCount =
    (targets.global ? 1 : 0) +
    (targets.courseIds?.length || 0) +
    (targets.courseSubjectIds?.length || 0) +
    (targets.courseSubjectChapterIds?.length || 0) +
    (targets.classContentIds?.length || 0) +
    (targets.cycleIds?.length || 0) +
    (targets.cycleSubjectIds?.length || 0) +
    (targets.cycleSubjectChapterIds?.length || 0) +
    (targets.cycleContentIds?.length || 0) +
    (targets.liveClassIds?.length || 0) +
    (targets.studentIds?.length || 0);

  const chips = useMemo(() => {
    const out = [];
    const push = (key, scope, rows) =>
      (targets[key] || []).forEach((id) => {
        const row = rows.find((r) => r.id === id);
        out.push({
          key,
          id,
          scope,
          label:
            row?.productFullName ||
            row?.productName ||
            row?.title ||
            row?.classTitle ||
            id.slice(0, 8),
        });
      });

    push("courseIds", "COURSE", allCourses);
    push("courseSubjectIds", "COURSE_SUBJECT", subjects);
    push("courseSubjectChapterIds", "COURSE_SUBJECT_CHAPTER", chapters);
    push("classContentIds", "CLASS_CONTENT", classes);
    push("cycleIds", "CYCLE", cycles);
    return out;
  }, [targets, allCourses, subjects, chapters, classes, cycles]);

  const removeChip = (chip) =>
    patch(
      chip.key,
      (targets[chip.key] || []).filter((id) => id !== chip.id),
    );

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-3 md:p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold md:text-base">
            বিজ্ঞাপন কোথায় দেখাবে
          </h3>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            selectedCount
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {selectedCount ? `${selectedCount} টি টার্গেট` : "কোনো টার্গেট নেই"}
        </span>
      </div>

      {/* গ্লোবাল — শুধু সুপার অ্যাডমিন */}
      {isSuperAdmin && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-blue-600"
            checked={Boolean(targets.global)}
            onChange={(e) => patch("global", e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Globe2 className="h-3.5 w-3.5" /> সব জায়গায় (গ্লোবাল)
            </span>
            <span className="text-xs text-muted-foreground">
              সব কোর্স, সব ক্লাসে চলবে। নিচে আলাদা করে কিছু বাদ দিতে পারো।
            </span>
          </span>
        </label>
      )}

      {/* ধাপ ১ — কোর্স */}
      <MultiSelect
        label="কোর্স (পুরো কোর্সে চলবে)"
        name="targets.courseIds"
        options={courseOptions.filter((o) => o.value !== "")}
        placeholder="এক বা একাধিক কোর্স বাছো"
        value={targets.courseIds || EMPTY}
        onChange={(v) => patch("courseIds", v || [])}
      />

      {/* ধাপ ২ — নিচে নামা */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
        <p className="mb-2 text-xs text-muted-foreground">
          আরও নির্দিষ্ট করতে চাইলে — একটা কোর্স বেছে নিচে নামো। নির্দিষ্ট
          টার্গেট সবসময় কম নির্দিষ্টটাকে হারায়।
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Dropdown
            label="কোন কোর্সের ভেতরে?"
            name="__drillCourse"
            options={courseOptions}
            placeholder="কোর্স বাছো"
            value={courseId}
            onChange={(v) => setCourseId(v || "")}
          />

          {courseId && (
            <Dropdown
              label="কোন সাবজেক্টে?"
              name="__drillSubject"
              options={toOptions(subjects, (s) => s.title || "নামহীন সাবজেক্ট", {
                loading: subjectsLoading,
                error: subjectsError,
                empty: "এই কোর্সে সাবজেক্ট নেই",
              })}
              placeholder="সাবজেক্ট বাছো"
              value={courseSubjectId}
              onChange={(v) => setCourseSubjectId(v || "")}
            />
          )}
        </div>

        {courseId && (
          <div className="mt-3 space-y-3">
            <MultiSelect
              label="সাবজেক্ট (পুরো সাবজেক্টে চলবে)"
              name="targets.courseSubjectIds"
              options={toOptions(
                subjects,
                (s) => s.title || "নামহীন সাবজেক্ট",
                {
                  loading: subjectsLoading,
                  error: subjectsError,
                  empty: "এই কোর্সে সাবজেক্ট নেই",
                },
              ).filter((o) => o.value !== "")}
              placeholder="এক বা একাধিক সাবজেক্ট"
              value={targets.courseSubjectIds || EMPTY}
              onChange={(v) => patch("courseSubjectIds", v || [])}
            />

            {courseSubjectId && (
              <MultiSelect
                label="চ্যাপ্টার"
                name="targets.courseSubjectChapterIds"
                options={toOptions(
                  chapters,
                  (c) => c.title || c.chapter?.chapterName || "নামহীন চ্যাপ্টার",
                  {
                    loading: chaptersLoading,
                    error: chaptersError,
                    empty: "এই সাবজেক্টে চ্যাপ্টার নেই",
                  },
                ).filter((o) => o.value !== "")}
                placeholder="এক বা একাধিক চ্যাপ্টার"
                value={targets.courseSubjectChapterIds || EMPTY}
                onChange={(v) => patch("courseSubjectChapterIds", v || [])}
              />
            )}

            {courseSubjectId && (
              <Dropdown
                label="কোন চ্যাপ্টারের ক্লাস দেখবে?"
                name="__drillChapter"
                options={toOptions(
                  chapters,
                  (c) => c.title || c.chapter?.chapterName || "নামহীন চ্যাপ্টার",
                  {
                    loading: chaptersLoading,
                    error: chaptersError,
                    empty: "চ্যাপ্টার নেই",
                  },
                )}
                placeholder="চ্যাপ্টার বাছো"
                value={chapterId}
                onChange={(v) => setChapterId(v || "")}
              />
            )}

            {chapterId && (
              <MultiSelect
                label="ক্লাস (একদম নির্দিষ্ট)"
                name="targets.classContentIds"
                options={toOptions(
                  classes,
                  (c) =>
                    `${c.classNo ? `${c.classNo}. ` : ""}${
                      c.classTitle || "নামহীন ক্লাস"
                    }`,
                  {
                    loading: classesLoading,
                    error: classesError,
                    empty: "এই চ্যাপ্টারে ক্লাস নেই",
                  },
                ).filter((o) => o.value !== "")}
                placeholder="এক বা একাধিক ক্লাস"
                value={targets.classContentIds || EMPTY}
                onChange={(v) => patch("classContentIds", v || [])}
              />
            )}

            {drillCourse?.cycleAvailable && (
              <MultiSelect
                label="সাইকেল"
                name="targets.cycleIds"
                options={toOptions(cycles, (c) => c.title || "নামহীন সাইকেল", {
                  loading: cyclesLoading,
                  error: cyclesError,
                  empty: "এই কোর্সে সাইকেল নেই",
                }).filter((o) => o.value !== "")}
                placeholder="এক বা একাধিক সাইকেল"
                value={targets.cycleIds || EMPTY}
                onChange={(v) => patch("cycleIds", v || [])}
              />
            )}
          </div>
        )}
      </div>

      {/* বাদ দেওয়ার তালিকা */}
      {(targets.courseIds?.length || targets.global) && (
        <MultiSelect
          label="এগুলো বাদ (পুরো কোর্স চলবে, কিন্তু এই চ্যাপ্টারগুলো ছাড়া)"
          name="targets.exclude.courseSubjectChapterIds"
          options={toOptions(
            chapters,
            (c) => c.title || c.chapter?.chapterName || "নামহীন চ্যাপ্টার",
            { loading: chaptersLoading, error: chaptersError, empty: "উপরে একটা সাবজেক্ট বাছো" },
          ).filter((o) => o.value !== "")}
          placeholder="বাদ দিতে চাইলে বাছো"
          value={targets.exclude?.courseSubjectChapterIds || EMPTY}
          onChange={(v) =>
            patch("exclude", {
              ...(targets.exclude || {}),
              courseSubjectChapterIds: v || [],
            })
          }
        />
      )}

      {/* যা যা বাছা হয়েছে */}
      {(chips.length > 0 || targets.global) && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-200 pt-3 dark:border-gray-700">
          {targets.global && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Globe2 className="h-3 w-3" /> সব জায়গায়
              <button
                type="button"
                onClick={() => patch("global", false)}
                className="ml-0.5 cursor-pointer opacity-60 hover:opacity-100"
                aria-label="গ্লোবাল টার্গেট সরাও"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          )}

          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.id}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700"
            >
              <span className="opacity-60">{SCOPE_LABEL[chip.scope]}:</span>
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                className="ml-0.5 cursor-pointer opacity-60 hover:opacity-100"
                aria-label={`${chip.label} সরাও`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {selectedCount === 0 && (
        <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
          অন্তত একটা টার্গেট বাছতে হবে — নাহলে বিজ্ঞাপনটা কোথাও দেখাবে না।
        </p>
      )}
    </div>
  );
}
