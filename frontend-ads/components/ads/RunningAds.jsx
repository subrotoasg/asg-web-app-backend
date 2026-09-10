"use client";

import React, { useMemo, useState } from "react";
import { Radio, ShieldCheck, UserCog, RefreshCw } from "lucide-react";
import Dropdown from "@/components/form/Dropdown";
import { FormProvider, useForm } from "react-hook-form";
import Loading from "@/components/utilities/Loading";
import { useGetRunningAdsQuery } from "@/redux/services/adsApi";
import { useGetAllCourseQuery } from "@/redux/services/courseApi";

const SCOPE_BN = {
  GLOBAL: "সব জায়গায়",
  COURSE: "কোর্স ভিত্তিক",
  COURSE_SUBJECT: "সাবজেক্ট ভিত্তিক",
  COURSE_SUBJECT_CHAPTER: "চ্যাপ্টার ভিত্তিক",
  CLASS_CONTENT: "নির্দিষ্ট ক্লাস",
  CYCLE: "সাইকেল ভিত্তিক",
  CYCLE_SUBJECT: "সাইকেল সাবজেক্ট",
  CYCLE_SUBJECT_CHAPTER: "সাইকেল চ্যাপ্টার",
  CYCLE_CONTENT: "সাইকেল ক্লাস",
  LIVE_CLASS: "লাইভ ক্লাস",
  STUDENT: "নির্দিষ্ট স্টুডেন্ট",
  STUDENT_COURSE: "স্টুডেন্ট + কোর্স",
};

const PLACEMENT_BN = {
  PRE_ROLL: "শুরুতে",
  MID_ROLL: "মাঝে",
  POST_ROLL: "শেষে",
  OVERLAY: "ওভারলে",
};

/** এই মুহূর্তে কোন বিজ্ঞাপন কোথায় চলছে — স্কোপ ধরে গোছানো */
export default function RunningAds() {
  const [courseId, setCourseId] = useState("");
  const methods = useForm({ defaultValues: { courseFilter: "" } });

  const { data: courseData } = useGetAllCourseQuery({ limit: 1000 });

  const courseOptions = useMemo(() => {
    const rows = courseData?.data?.data || [];
    return [
      { label: "সব কোর্স", value: "" },
      ...rows.map((c) => ({
        label: c.productFullName || c.productName || "নামহীন কোর্স",
        value: c.id,
      })),
    ];
  }, [courseData]);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetRunningAdsQuery(courseId ? { courseId } : {});

  const grouped = data?.data?.grouped || {};
  const totalLive = data?.data?.totalLive ?? 0;

  const orderedScopes = useMemo(
    () =>
      Object.keys(SCOPE_BN).filter(
        (scope) => (grouped[scope] || []).length > 0,
      ),
    [grouped],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="font-medium text-red-600 dark:text-red-300">
          তালিকা আনা যায়নি
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {error?.data?.message || "ইন্টারনেট কানেকশন চেক করো"}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          আবার চেষ্টা করো
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <p className="text-sm font-medium md:text-base">
            এই মুহূর্তে <strong>{totalLive}</strong> টি বিজ্ঞাপন চলছে
          </p>
        </div>

        <div className="flex w-full items-end gap-2 md:w-80">
          <div className="flex-1">
            <FormProvider {...methods}>
              <Dropdown
                label="কোর্স ধরে দেখো"
                name="courseFilter"
                options={courseOptions}
                placeholder="সব কোর্স"
                value={courseId}
                onChange={(v) => setCourseId(v || "")}
              />
            </FormProvider>
          </div>
          <button
            type="button"
            onClick={refetch}
            aria-label="তালিকা রিফ্রেশ করো"
            className="mb-1 cursor-pointer rounded-lg border border-gray-200 p-2.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {!orderedScopes.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <Radio className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 font-medium">এখন কোথাও কোনো বিজ্ঞাপন চলছে না</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {courseId
              ? "এই কোর্সে কোনো চালু বিজ্ঞাপন নেই"
              : "কোনো বিজ্ঞাপন চালু করা নেই, বা সবগুলোর সময় শেষ"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedScopes.map((scope) => (
            <section
              key={scope}
              className="rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <h3 className="text-sm font-semibold">{SCOPE_BN[scope]}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                  {grouped[scope].length}
                </span>
              </header>

              {/* মোবাইলে কার্ড, বড় স্ক্রিনে টেবিল */}
              <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                {grouped[scope].map((row, i) => (
                  <div key={`${row.adId}-${i}`} className="space-y-1 p-3">
                    <p className="text-sm font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      কোথায়: {row.target.label}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                        {PLACEMENT_BN[row.placement]}
                        {row.placement === "MID_ROLL" ? ` · ${row.atSec}s` : ""}
                      </span>
                      <span className="opacity-70">
                        অগ্রাধিকার {row.priority}
                      </span>
                      <Creator actor={row.createdBy} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-muted-foreground dark:bg-gray-800/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">বিজ্ঞাপন</th>
                      <th className="px-3 py-2 font-medium">কোথায় চলছে</th>
                      <th className="px-3 py-2 font-medium">প্লেসমেন্ট</th>
                      <th className="px-3 py-2 font-medium">অগ্রাধিকার</th>
                      <th className="px-3 py-2 font-medium">কে বানিয়েছে</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {grouped[scope].map((row, i) => (
                      <tr
                        key={`${row.adId}-${i}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="max-w-xs truncate px-3 py-2 font-medium">
                          {row.title}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                          {row.target.label}
                        </td>
                        <td className="px-3 py-2">
                          {PLACEMENT_BN[row.placement]}
                          {row.placement === "MID_ROLL"
                            ? ` · ${row.atSec}s`
                            : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {row.priority}
                        </td>
                        <td className="px-3 py-2">
                          <Creator actor={row.createdBy} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Creator({ actor }) {
  if (!actor) {
    return <span className="text-xs text-muted-foreground">অজানা</span>;
  }

  const isSuper = actor.role === "superAdmin";

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {isSuper ? (
        <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
      ) : (
        <UserCog className="h-3.5 w-3.5 text-blue-500" />
      )}
      <span className="max-w-[9rem] truncate">{actor.name}</span>
      <span className="opacity-60">{isSuper ? "(সুপার)" : "(অ্যাডমিন)"}</span>
    </span>
  );
}
