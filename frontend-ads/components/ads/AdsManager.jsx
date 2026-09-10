"use client";

import React, { useState } from "react";
import { Megaphone, ListChecks, PlusCircle, Radio } from "lucide-react";
import AdsList from "./AdsList";
import AdForm from "./AdForm";
import RunningAds from "./RunningAds";

const TABS = [
  { key: "list", label: "সব বিজ্ঞাপন", icon: ListChecks },
  { key: "create", label: "নতুন বিজ্ঞাপন", icon: PlusCircle },
  { key: "running", label: "এখন কোথায় চলছে", icon: Radio },
];

/**
 * বিজ্ঞাপন ব্যবস্থাপনার পুরো পাতা।
 *
 * `role` তোমার auth স্লাইস/কনটেক্সট থেকে পাস করো — "superAdmin" হলে
 * গ্লোবাল বিজ্ঞাপনের অপশন খোলে, নাহলে শুধু নিজের কোর্সে টার্গেট করা যায়।
 */
export default function AdsManager({ role = "admin" }) {
  const [tab, setTab] = useState("list");
  const [editing, setEditing] = useState(null);

  const isSuperAdmin = role === "superAdmin";

  const startEdit = (ad) => {
    setEditing(ad);
    setTab("create");
  };

  const finishEdit = () => {
    setEditing(null);
    setTab("list");
  };

  return (
    <div className="min-h-screen w-full space-y-4 rounded-2xl bg-white p-2 shadow-lg md:p-4 dark:bg-gray-900">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-xl font-bold md:text-3xl">
          <Megaphone className="h-6 w-6 text-blue-600 md:h-7 md:w-7" />
          বিজ্ঞাপন ব্যবস্থাপনা
        </h1>
        <p className="mt-1 text-xs text-muted-foreground md:text-sm">
          কোর্স, সাবজেক্ট, চ্যাপ্টার, ক্লাস, সাইকেল, লাইভ ক্লাস বা নির্দিষ্ট
          স্টুডেন্ট — যেকোনো জায়গায় বিজ্ঞাপন চালাও
        </p>
      </header>

      {/* ট্যাব — মোবাইলে স্ক্রলযোগ্য */}
      <nav
        className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1 md:mx-0 md:px-0"
        role="tablist"
        aria-label="বিজ্ঞাপনের ভাগ"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              if (key !== "create") setEditing(null);
            }}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors md:text-sm ${
              tab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {key === "create" && editing ? "বিজ্ঞাপন এডিট" : label}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {tab === "list" && <AdsList onEdit={startEdit} />}

        {tab === "create" && (
          <div className="mx-auto max-w-3xl">
            {editing && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
                <span>
                  এডিট করছো: <strong>{editing.title}</strong>
                </span>
                <button
                  type="button"
                  onClick={finishEdit}
                  className="cursor-pointer text-xs underline opacity-70 hover:opacity-100"
                >
                  বাতিল করে নতুন বানাও
                </button>
              </div>
            )}

            <AdForm
              key={editing?.id || "new"}
              ad={editing}
              isSuperAdmin={isSuperAdmin}
              onDone={finishEdit}
            />
          </div>
        )}

        {tab === "running" && <RunningAds />}
      </div>
    </div>
  );
}
