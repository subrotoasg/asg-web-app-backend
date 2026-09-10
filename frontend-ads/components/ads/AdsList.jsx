"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  Play,
  Pause,
  Pencil,
  Trash2,
  Globe2,
  Search,
  ShieldCheck,
  UserCog,
  Eye,
  MousePointerClick,
  SkipForward,
} from "lucide-react";
import Loading from "@/components/utilities/Loading";
import {
  useGetAllAdsQuery,
  useUpdateAdStatusMutation,
  useDeleteAdMutation,
} from "@/redux/services/adsApi";

const STATUS_STYLE = {
  ACTIVE:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PAUSED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  SCHEDULED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ARCHIVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_BN = {
  ACTIVE: "চলছে",
  PAUSED: "বন্ধ",
  DRAFT: "ড্রাফট",
  SCHEDULED: "শিডিউলড",
  ARCHIVED: "আর্কাইভড",
};

const PLACEMENT_BN = {
  PRE_ROLL: "শুরুতে",
  MID_ROLL: "মাঝে",
  POST_ROLL: "শেষে",
  OVERLAY: "ওভারলে",
};

const SCOPE_BN = {
  GLOBAL: "সব জায়গায়",
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
  STUDENT_COURSE: "স্টুডেন্ট+কোর্স",
};

const TABS = [
  { key: "ALL", label: "সব" },
  { key: "ACTIVE", label: "চলছে" },
  { key: "PAUSED", label: "বন্ধ" },
  { key: "DRAFT", label: "ড্রাফট" },
];

function useDebounced(value, delay = 500) {
  const [v, setV] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdsList({ onEdit }) {
  const [statusTab, setStatusTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search, 500);

  const queryParams = useMemo(
    () => ({
      page,
      limit: 12,
      sortBy: "createdAt",
      sortOrder: "desc",
      ...(statusTab !== "ALL" ? { status: statusTab } : {}),
      ...(debouncedSearch ? { searchTerm: debouncedSearch } : {}),
    }),
    [page, statusTab, debouncedSearch],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAllAdsQuery(queryParams);

  const [updateStatus, { isLoading: isToggling }] = useUpdateAdStatusMutation();
  const [deleteAd, { isLoading: isDeleting }] = useDeleteAdMutation();

  const ads = data?.data || [];
  const meta = data?.meta || {};

  const toggle = async (ad) => {
    const next = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await updateStatus({ id: ad.id, status: next }).unwrap();
      toast.success(next === "ACTIVE" ? "চালু হলো" : "বন্ধ হলো");
    } catch (e) {
      toast.error(e?.data?.message || "অবস্থা বদলানো যায়নি");
    }
  };

  const remove = async (ad) => {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "মুছে ফেলবে?",
      text: `"${ad.title}" আর কোথাও দেখাবে না।`,
      showCancelButton: true,
      confirmButtonText: "হ্যাঁ, মুছে দাও",
      cancelButtonText: "থাক",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed.isConfirmed) return;

    try {
      await deleteAd(ad.id).unwrap();
      toast.success("মুছে ফেলা হয়েছে");
    } catch (e) {
      toast.error(e?.data?.message || "মোছা যায়নি");
    }
  };

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
          বিজ্ঞাপন আনা যায়নি
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
      {/* ফিল্টার */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const count =
              tab.key === "ALL"
                ? Object.values(meta.statusCounts || {}).reduce(
                    (a, b) => a + b,
                    0,
                  )
                : meta.statusCounts?.[tab.key] ?? 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                  statusTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {tab.label}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="নাম দিয়ে খোঁজো"
            aria-label="বিজ্ঞাপন খোঁজো"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      </div>

      {isFetching && (
        <div className="h-0.5 w-full overflow-hidden rounded bg-blue-100">
          <div className="h-full w-1/3 animate-pulse bg-blue-600" />
        </div>
      )}

      {!ads.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="font-medium">এখানে কোনো বিজ্ঞাপন নেই</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {debouncedSearch
              ? "খোঁজার শব্দটা বদলে দেখো"
              : "উপরের “নতুন বিজ্ঞাপন” ট্যাব থেকে একটা বানাও"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((ad) => (
            <article
              key={ad.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold md:text-base">
                    {ad.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {PLACEMENT_BN[ad.placement]}
                    {ad.placement === "MID_ROLL" ? ` · ${ad.atSec}s` : ""} ·{" "}
                    {ad.durationSec}s
                    {ad.skipAfterSec != null
                      ? ` · ${ad.skipAfterSec}s পর স্কিপ`
                      : " · স্কিপ নেই"}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLE[ad.status] || STATUS_STYLE.DRAFT
                  }`}
                >
                  {ad.isLive ? "🔴 " : ""}
                  {STATUS_BN[ad.status] || ad.status}
                </span>
              </div>

              {/* কোথায় চলছে */}
              <div className="flex flex-wrap gap-1">
                {ad.targetSummary?.isGlobal && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Globe2 className="h-3 w-3" /> সব জায়গায়
                  </span>
                )}
                {ad.targetSummary?.preview?.map((t) => (
                  <span
                    key={t.id}
                    className="max-w-[10rem] truncate rounded bg-gray-100 px-1.5 py-0.5 text-[11px] dark:bg-gray-700"
                    title={`${SCOPE_BN[t.scope] || t.scope}: ${t.label}`}
                  >
                    <span className="opacity-60">{SCOPE_BN[t.scope]}:</span>{" "}
                    {t.label}
                  </span>
                ))}
                {ad.targetSummary?.includeCount >
                  (ad.targetSummary?.preview?.length || 0) && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] dark:bg-gray-700">
                    +
                    {ad.targetSummary.includeCount -
                      ad.targetSummary.preview.length}{" "}
                    আরও
                  </span>
                )}
                {ad.targetSummary?.excludeCount > 0 && (
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    {ad.targetSummary.excludeCount} টি বাদ
                  </span>
                )}
              </div>

              {/* পরিসংখ্যান */}
              <div className="grid grid-cols-3 gap-1 border-y border-gray-100 py-2 text-center dark:border-gray-800">
                <Stat icon={Eye} value={ad.impressionCount} label="দেখেছে" />
                <Stat
                  icon={MousePointerClick}
                  value={ad.clickCount}
                  label="ক্লিক"
                />
                <Stat icon={SkipForward} value={ad.skipCount} label="স্কিপ" />
              </div>

              {/* কে বানিয়েছে */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {ad.createdBy?.role === "superAdmin" ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                ) : (
                  <UserCog className="h-3.5 w-3.5 text-blue-500" />
                )}
                <span className="truncate">
                  {ad.createdBy?.name || "অজানা"}
                  {ad.createdBy?.role === "superAdmin"
                    ? " (সুপার অ্যাডমিন)"
                    : " (অ্যাডমিন)"}
                </span>
              </div>

              <div className="mt-auto flex gap-1.5">
                <button
                  type="button"
                  onClick={() => toggle(ad)}
                  disabled={isToggling}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    ad.status === "ACTIVE"
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                  }`}
                >
                  {ad.status === "ACTIVE" ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> বন্ধ
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> চালু
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onEdit?.(ad)}
                  className="flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <Pencil className="h-3.5 w-3.5" /> এডিট
                </button>

                <button
                  type="button"
                  onClick={() => remove(ad)}
                  disabled={isDeleting}
                  aria-label={`${ad.title} মুছে ফেলো`}
                  className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
          >
            আগের
          </button>
          <span className="text-sm text-muted-foreground">
            {meta.currentPage} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
          >
            পরের
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-sm font-semibold">
        <Icon className="h-3.5 w-3.5 opacity-50" />
        {Number(value || 0).toLocaleString("bn-BD")}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
