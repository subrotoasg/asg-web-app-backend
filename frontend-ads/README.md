# বিজ্ঞাপন (Ads) — ফ্রন্টএন্ড ফাইল

এই ফোল্ডারের ফাইলগুলো **ব্যাকএন্ড রিপোতে রাখা হয়েছে শুধু ডেলিভারির জন্য**।
তোমার Next.js অ্যাপে নিচের জায়গাগুলোতে কপি করো:

| এখানকার ফাইল | তোমার অ্যাপে যেখানে যাবে |
|---|---|
| `redux/services/adsApi.js` | `redux/services/adsApi.js` |
| `components/ads/*.jsx` | `components/ads/` |
| `hooks/useAdBreaks.js` | `hooks/useAdBreaks.js` |

## ১. আগে `tagTypes` এ ADS যোগ করো

```js
// redux/tagTypes.js
export const tagTypesValue = {
  // …বাকিগুলো
  ADS: "ads",
};

export const tagTypesList = [
  // …বাকিগুলো
  tagTypesValue.ADS,
];
```

`baseApi`-র `tagTypes` অ্যারেতে `ADS` না থাকলে ইনভ্যালিডেশন **চুপচাপ**
কাজ করবে না — তালিকা রিফ্রেশ হবে না, কোনো এররও দেখাবে না।

## ২. অ্যাডমিন পাতা

```jsx
// app/(dashboard)/ads/page.jsx
"use client";
import AdsManager from "@/components/ads/AdsManager";
import { useSelector } from "react-redux";

export default function AdsPage() {
  const role = useSelector((s) => s.auth?.user?.role); // তোমার auth স্লাইস অনুযায়ী
  return <AdsManager role={role} />;
}
```

`role === "superAdmin"` হলে গ্লোবাল বিজ্ঞাপনের অপশন খোলে।
অ্যাডমিন হলে শুধু নিজের কোর্সে টার্গেট করা যায় — এটা ব্যাকএন্ডেও
আলাদা করে চেক হয়, তাই ফ্রন্টএন্ডে লুকানো থাকলেও কেউ বাইপাস করতে পারবে না।

তিনটা ট্যাব:

1. **সব বিজ্ঞাপন** — লিস্ট, স্ট্যাটাস ফিল্টার, সার্চ, এক ক্লিকে চালু/বন্ধ,
   এডিট, ডিলিট। প্রতিটা কার্ডে দেখা যায় কোথায় চলছে, কতবার দেখা হয়েছে,
   আর **কে বানিয়েছে** (সুপার অ্যাডমিন না অ্যাডমিন, নামসহ)।
2. **নতুন বিজ্ঞাপন** — ক্রিয়েটিভ + টার্গেট + শিডিউল।
3. **এখন কোথায় চলছে** — স্কোপ ধরে গোছানো লাইভ তালিকা, কোর্স ফিল্টার সহ।

## ৩. প্লেয়ারে বিজ্ঞাপন চালু করা

```jsx
"use client";
import { useRef } from "react";
import useAdBreaks from "@/hooks/useAdBreaks";
import AdPlayerOverlay from "@/components/ads/AdPlayerOverlay";

export default function ClassPlayer({ classContentId, videoUrl }) {
  const videoRef = useRef(null);

  const { currentAd, endAd, clickAd } = useAdBreaks({
    contextScope: "CLASS_CONTENT",   // বা CYCLE_CONTENT / LIVE_CLASS
    contextId: classContentId,
    videoRef,
  });

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} src={videoUrl} controls className="h-full w-full" />
      <AdPlayerOverlay ad={currentAd} onEnd={endAd} onClick={clickAd} />
    </div>
  );
}
```

হুকটা নিজেই সামলায়:

- **pre-roll** — ভিডিও প্রথমবার প্লে হওয়ার সাথে সাথে
- **mid-roll** — `timeupdate` ধরে, `at` সেকেন্ড পার হলেই
- **post-roll** — ভিডিও শেষ হলে
- বিজ্ঞাপন শেষে **ঠিক যেখানে থেমেছিল সেখান থেকেই** আবার চালু
- `IMPRESSION` / `COMPLETE` / `SKIP` / `CLICK` — সব নিজে থেকেই ট্র্যাক হয়

**ফেল করলে কী হয়:** সার্ভ কল ফেল করলে, ক্রিয়েটিভ লোড না হলে, বা
ট্র্যাকিং কল ফেল করলে — ভিডিও নিজের মতো চলতে থাকে। বিজ্ঞাপনের কারণে
ক্লাস আটকে যাওয়ার কোনো পথ রাখা হয়নি।

## ৪. যেসব কম্পোনেন্ট আগে থেকেই লাগবে

এই ফাইলগুলো তোমার অ্যাপের বিদ্যমান কম্পোনেন্ট ব্যবহার করে —
নতুন করে কিছু বানাতে হবে না:

- `@/components/form/InputField`
- `@/components/form/Dropdown`
- `@/components/form/MultiSelect`
- `@/components/ui/button`
- `@/components/utilities/Loading`
- `sonner` (toast), `sweetalert2` (Swal), `lucide-react` (আইকন)

আর এই RTK Query হুকগুলো (তোমার কোডে আগে থেকেই আছে):

- `useGetAllCourseQuery`
- `useGetAllCourseCycleBasedOnCourseIdQuery`
- `useGetCourseSubjectByCourseIdQuery`
- `useGetCourseChaptersByCourseSubjectIdQuery`
- `useGetClassContentsBySubjectChapterIdQuery`

## ৫. রেসপন্সিভ

- ট্যাব মোবাইলে পাশে স্ক্রল করে
- লিস্ট ১ → ২ → ৩ কলামে ভাঙে
- "কোথায় চলছে" মোবাইলে কার্ড, ডেস্কটপে টেবিল
- ফর্মের সব গ্রিড মোবাইলে এক কলাম
- সব বাটনে `cursor-pointer`, আইকন-বাটনে `aria-label`
