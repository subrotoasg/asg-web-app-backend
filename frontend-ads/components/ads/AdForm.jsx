"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import InputField from "@/components/form/InputField";
import Dropdown from "@/components/form/Dropdown";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Send, Loader2 } from "lucide-react";
import AdTargetSelector from "./AdTargetSelector";
import {
  useCreateAdMutation,
  useUpdateAdMutation,
} from "@/redux/services/adsApi";

const PLACEMENTS = [
  { label: "ভিডিওর শুরুতে (Pre-roll)", value: "PRE_ROLL" },
  { label: "ভিডিওর মাঝে (Mid-roll)", value: "MID_ROLL" },
  { label: "ভিডিওর শেষে (Post-roll)", value: "POST_ROLL" },
  { label: "ভিডিওর উপরে ওভারলে", value: "OVERLAY" },
];

const CREATIVE_TYPES = [
  { label: "ভিডিও", value: "VIDEO" },
  { label: "ছবি", value: "IMAGE" },
];

const STATUSES = [
  { label: "ড্রাফট (কোথাও চলবে না)", value: "DRAFT" },
  { label: "চালু", value: "ACTIVE" },
  { label: "সাময়িক বন্ধ", value: "PAUSED" },
];

const emptyDefaults = {
  title: "",
  description: "",
  creativeType: "VIDEO",
  src: "",
  thumbnail: "",
  durationSec: 15,
  skipAfterSec: 5,
  clickUrl: "",
  cta: "",
  placement: "PRE_ROLL",
  atSec: 0,
  status: "DRAFT",
  startAt: "",
  endAt: "",
  priority: 0,
  maxImpressionsPerUser: "",
  minGapSeconds: "",
  targets: {},
};

/** ডাটাবেজের ad → ফর্মের ডিফল্ট */
const toFormValues = (ad) => {
  if (!ad) return emptyDefaults;

  const t = { exclude: {} };
  const push = (key, id) => {
    t[key] = t[key] || [];
    if (id) t[key].push(id);
  };

  for (const target of ad.targets || []) {
    const bucket = target.mode === "EXCLUDE" ? t.exclude : t;
    const put = (key, id) => {
      if (!id) return;
      bucket[key] = bucket[key] || [];
      bucket[key].push(id);
    };

    switch (target.scope) {
      case "GLOBAL":
        if (target.mode === "INCLUDE") t.global = true;
        break;
      case "COURSE":
        put("courseIds", target.courseId);
        break;
      case "COURSE_SUBJECT":
        put("courseSubjectIds", target.courseSubjectId);
        break;
      case "COURSE_SUBJECT_CHAPTER":
        put("courseSubjectChapterIds", target.courseSubjectChapterId);
        break;
      case "CLASS_CONTENT":
        put("classContentIds", target.classContentId);
        break;
      case "CYCLE":
        put("cycleIds", target.cycleId);
        break;
      case "CYCLE_SUBJECT":
        put("cycleSubjectIds", target.cycleSubjectId);
        break;
      case "CYCLE_SUBJECT_CHAPTER":
        put("cycleSubjectChapterIds", target.cycleSubjectChapterId);
        break;
      case "CYCLE_CONTENT":
        put("cycleContentIds", target.cycleContentId);
        break;
      case "LIVE_CLASS":
        put("liveClassIds", target.liveClassId);
        break;
      case "STUDENT":
        put("studentIds", target.studentId);
        break;
      case "STUDENT_COURSE":
        t.studentCourses = t.studentCourses || [];
        t.studentCourses.push({
          studentId: target.studentId,
          courseId: target.courseId,
        });
        break;
      default:
        break;
    }
  }

  const forInput = (d) => (d ? new Date(d).toISOString().slice(0, 16) : "");

  return {
    ...emptyDefaults,
    ...ad,
    description: ad.description ?? "",
    thumbnail: ad.thumbnail ?? "",
    clickUrl: ad.clickUrl ?? "",
    cta: ad.cta ?? "",
    skipAfterSec: ad.skipAfterSec ?? "",
    maxImpressionsPerUser: ad.maxImpressionsPerUser ?? "",
    minGapSeconds: ad.minGapSeconds ?? "",
    startAt: forInput(ad.startAt),
    endAt: forInput(ad.endAt),
    targets: t,
  };
};

/** ফর্ম → API পেলোড। খালি স্ট্রিং পাঠালে zod ফেল করত, তাই বাদ দেওয়া হয়। */
const toPayload = (values) => {
  const out = { targets: values.targets || {} };

  const copyIfSet = (key, transform = (v) => v) => {
    const v = values[key];
    if (v === "" || v === null || v === undefined) return;
    out[key] = transform(v);
  };

  copyIfSet("title", (v) => String(v).trim());
  copyIfSet("description", (v) => String(v).trim());
  copyIfSet("creativeType");
  copyIfSet("src", (v) => String(v).trim());
  copyIfSet("thumbnail", (v) => String(v).trim());
  copyIfSet("durationSec", Number);
  copyIfSet("skipAfterSec", Number);
  copyIfSet("clickUrl", (v) => String(v).trim());
  copyIfSet("cta", (v) => String(v).trim());
  copyIfSet("placement");
  copyIfSet("atSec", Number);
  copyIfSet("status");
  copyIfSet("priority", Number);
  copyIfSet("maxImpressionsPerUser", Number);
  copyIfSet("minGapSeconds", Number);
  copyIfSet("startAt", (v) => new Date(v).toISOString());
  copyIfSet("endAt", (v) => new Date(v).toISOString());

  return out;
};

export default function AdForm({ ad = null, isSuperAdmin = false, onDone }) {
  const isEdit = Boolean(ad?.id);

  const methods = useForm({ defaultValues: toFormValues(ad) });
  const {
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(toFormValues(ad));
  }, [ad, reset]);

  const placement = useWatch({ control, name: "placement" });
  const creativeType = useWatch({ control, name: "creativeType" });
  const cta = useWatch({ control, name: "cta" });

  const [createAd, { isLoading: isCreating }] = useCreateAdMutation();
  const [updateAd, { isLoading: isUpdating }] = useUpdateAdMutation();

  const busy = isCreating || isUpdating || isSubmitting;

  const onSubmit = async (values) => {
    const payload = toPayload(values);

    try {
      const res = isEdit
        ? await updateAd({ id: ad.id, formData: payload }).unwrap()
        : await createAd(payload).unwrap();

      if (!res?.success) {
        toast.error(res?.message || "সেভ করা যায়নি।");
        return;
      }

      await Swal.fire({
        icon: "success",
        title: isEdit ? "বিজ্ঞাপন আপডেট হয়েছে" : "বিজ্ঞাপন তৈরি হয়েছে",
        timer: 1400,
        showConfirmButton: false,
      });

      if (!isEdit) reset(emptyDefaults);
      onDone?.(res?.data);
    } catch (error) {
      /* zod-এর প্রতিটা ফিল্ড এরর আলাদা করে দেখানো, যাতে কোথায় ভুল
         হয়েছে সেটা বোঝা যায় */
      const issues = error?.data?.errorDetails?.issues || error?.data?.issues;

      if (Array.isArray(issues) && issues.length) {
        issues.slice(0, 4).forEach((issue) =>
          toast.error(
            `${(issue.path || []).filter((p) => p !== "body").join(".") || "ফর্ম"}: ${issue.message}`,
          ),
        );
        return;
      }

      toast.error(
        error?.data?.message || "সেভ করা যায়নি। ইন্টারনেট চেক করো।",
      );
    }
  };

  const previewSrc = useWatch({ control, name: "src" });

  const preview = useMemo(() => {
    if (!previewSrc) return null;
    if (creativeType === "IMAGE") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt="বিজ্ঞাপনের প্রিভিউ"
          className="max-h-40 w-auto rounded-lg object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }
    return (
      <video
        src={previewSrc}
        controls
        muted
        playsInline
        preload="metadata"
        className="max-h-40 w-full rounded-lg bg-black"
      />
    );
  }, [previewSrc, creativeType]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            label="বিজ্ঞাপনের নাম"
            name="title"
            placeholder="যেমন — HSC ব্যাচ ভর্তি চলছে"
            rules={{
              required: "নাম দিতেই হবে",
              minLength: { value: 2, message: "নামটা আরেকটু বড় হোক" },
            }}
          />
          <Dropdown
            label="ধরন"
            name="creativeType"
            options={CREATIVE_TYPES}
            placeholder="ভিডিও নাকি ছবি"
          />
        </div>

        <InputField
          label="ক্রিয়েটিভ URL"
          name="src"
          placeholder="https://…/ad.mp4"
          rules={{
            required: "ক্রিয়েটিভের লিংক দিতেই হবে",
            pattern: {
              value: /^https?:\/\/.+/i,
              message: "পুরো URL দাও (https:// দিয়ে শুরু)",
            },
          }}
        />

        {preview && (
          <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
            <p className="mb-1 text-xs text-muted-foreground">প্রিভিউ</p>
            {preview}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Dropdown
            label="কোথায় দেখাবে"
            name="placement"
            options={PLACEMENTS}
            placeholder="Pre / Mid / Post"
          />
          <InputField
            label="দৈর্ঘ্য (সেকেন্ড)"
            name="durationSec"
            type="number"
            rules={{
              required: "দৈর্ঘ্য দিতেই হবে",
              min: { value: 1, message: "কমপক্ষে ১ সেকেন্ড" },
              max: { value: 600, message: "সর্বোচ্চ ৬০০ সেকেন্ড" },
            }}
          />
          <InputField
            label="কত সেকেন্ড পর স্কিপ"
            name="skipAfterSec"
            type="number"
            placeholder="খালি রাখলে স্কিপ করা যাবে না"
          />
        </div>

        {placement === "MID_ROLL" && (
          <InputField
            label="ভিডিওর কত সেকেন্ডে ঢুকবে"
            name="atSec"
            type="number"
            placeholder="যেমন — 120"
            rules={{
              required: "Mid-roll হলে সময় দিতেই হবে",
              min: { value: 1, message: "০-এর বেশি হতে হবে" },
            }}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            label="ক্লিক করলে কোথায় যাবে"
            name="clickUrl"
            placeholder="https://asgshop.com.bd/hsc"
            rules={
              cta
                ? { required: "CTA দিলে লিংকও দিতে হবে" }
                : undefined
            }
          />
          <InputField
            label="বাটনের লেখা (CTA)"
            name="cta"
            placeholder="কোর্সটি দেখো"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField label="শুরু" name="startAt" type="datetime-local" />
          <InputField label="শেষ" name="endAt" type="datetime-local" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InputField
            label="অগ্রাধিকার (বেশি = আগে)"
            name="priority"
            type="number"
          />
          <InputField
            label="একজন সর্বোচ্চ কতবার দেখবে"
            name="maxImpressionsPerUser"
            type="number"
            placeholder="খালি = সীমা নেই"
          />
          <InputField
            label="দুইবারের মাঝে বিরতি (সেকেন্ড)"
            name="minGapSeconds"
            type="number"
            placeholder="খালি = বিরতি নেই"
          />
        </div>

        <AdTargetSelector isSuperAdmin={isSuperAdmin} />

        <Dropdown
          label="অবস্থা"
          name="status"
          options={STATUSES}
          placeholder="ড্রাফট রেখে পরে চালু করতে পারো"
        />

        <Button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:text-base dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {busy
            ? "সেভ হচ্ছে…"
            : isEdit
              ? "আপডেট করো"
              : "বিজ্ঞাপন তৈরি করো"}
        </Button>
      </form>
    </FormProvider>
  );
}
